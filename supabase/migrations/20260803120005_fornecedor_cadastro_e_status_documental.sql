-- ============================================================================
-- Paridade com o sistema de Homologação:
--   · cadastro do fornecedor ganha contato, risco e data de cadastro;
--   · status documental PERSISTIDO em core.fornecedores, recalculado por
--     trigger — é o que permite filtrar e ordenar a lista;
--   · qualidade.checklist_geral(): um item por documento de TODOS os
--     fornecedores, numa consulta (alimenta dashboard e relatórios).
--
-- Atenção: este status é da DOCUMENTAÇÃO. Não tem relação com
-- qualidade.homologacoes (nota 0–100, classe A–D) — são duas homologações
-- diferentes e continuam separadas de propósito.
-- ============================================================================

alter table core.fornecedores
  add column if not exists telefone            text,
  add column if not exists email               text,
  add column if not exists classificacao_risco text
    check (classificacao_risco in ('alto','medio','baixo')),
  add column if not exists data_cadastro       date not null default current_date,
  add column if not exists status_documental   text not null default 'sem_documentos'
    check (status_documental in ('sem_documentos','pendente','ok'));

comment on column core.fornecedores.status_documental is
  'Situação do checklist documental. Recalculado por trigger; não editar à mão.';

-- ── Recálculo ──────────────────────────────────────────────────────────────
-- security definer: escreve na tabela de dados-mestre e lê o checklist
-- inteiro do fornecedor, independentemente de quem disparou.
create or replace function qualidade.recalcular_status_documental(p_fornecedor_id uuid)
returns text
language plpgsql
security definer
set search_path = qualidade, core, public
as $$
declare
  v_status text;
begin
  v_status := qualidade.status_documental_fornecedor(p_fornecedor_id);
  update core.fornecedores
     set status_documental = v_status
   where id = p_fornecedor_id
     and status_documental is distinct from v_status;
  return v_status;
end $$;

-- Documento entrou, saiu ou foi excluído → recalcula aquele fornecedor.
create or replace function qualidade.trg_documento_recalcula_status()
returns trigger
language plpgsql
security definer
set search_path = qualidade, core, public
as $$
begin
  if tg_op = 'DELETE' then
    perform qualidade.recalcular_status_documental(old.fornecedor_id);
    return old;
  end if;
  perform qualidade.recalcular_status_documental(new.fornecedor_id);
  return new;
end $$;

drop trigger if exists trg_docforn_status on qualidade.documentos_fornecedor;
create trigger trg_docforn_status
  after insert or update or delete on qualidade.documentos_fornecedor
  for each row execute function qualidade.trg_documento_recalcula_status();

-- Mudou o segmento do fornecedor → o checklist dele mudou.
create or replace function qualidade.trg_fornecedor_segmento_recalcula()
returns trigger
language plpgsql
security definer
set search_path = qualidade, core, public
as $$
begin
  if tg_op = 'DELETE' then
    perform qualidade.recalcular_status_documental(old.fornecedor_id);
    return old;
  end if;
  perform qualidade.recalcular_status_documental(new.fornecedor_id);
  return new;
end $$;

drop trigger if exists trg_fornseg_status on qualidade.fornecedor_segmentos;
create trigger trg_fornseg_status
  after insert or delete on qualidade.fornecedor_segmentos
  for each row execute function qualidade.trg_fornecedor_segmento_recalcula();

-- Mudou o checklist de um segmento → recalcula todo mundo daquele segmento.
create or replace function qualidade.trg_segmento_documento_recalcula()
returns trigger
language plpgsql
security definer
set search_path = qualidade, core, public
as $$
declare
  v_segmento uuid := coalesce(new.segmento_id, old.segmento_id);
  v_forn     uuid;
begin
  for v_forn in
    select fornecedor_id from qualidade.fornecedor_segmentos where segmento_id = v_segmento
  loop
    perform qualidade.recalcular_status_documental(v_forn);
  end loop;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_segdoc_status on qualidade.segmento_documentos;
create trigger trg_segdoc_status
  after insert or update or delete on qualidade.segmento_documentos
  for each row execute function qualidade.trg_segmento_documento_recalcula();

-- ── Checklist de todos os fornecedores, item a item ────────────────────────
-- Uma consulta alimenta os KPIs, a fila de "precisa de ação" e os relatórios.
create or replace function qualidade.checklist_geral()
returns table (
  fornecedor_id     uuid,
  fornecedor        text,
  status_documental text,
  documento_exigido_id uuid,
  documento         text,
  exigencia         text,
  tem_validade      boolean,
  estado            text,
  proxima_validade  date
)
language sql
stable
security invoker
set search_path = qualidade, core, public
as $$
  with exigidos as (
    select fs.fornecedor_id,
           sd.documento_exigido_id,
           min(case when sd.exigencia = 'obrigatorio' then 0 else 1 end) as prioridade
      from qualidade.fornecedor_segmentos fs
      join qualidade.segmento_documentos sd on sd.segmento_id = fs.segmento_id
     group by fs.fornecedor_id, sd.documento_exigido_id
  ),
  vigentes as (
    select d.fornecedor_id,
           d.documento_exigido_id,
           count(*)                                                        as qtd,
           bool_or(d.validade is not null and d.validade >= current_date)   as tem_valido,
           bool_or(d.validade is null)                                      as tem_sem_data,
           min(d.validade) filter (where d.validade >= current_date)        as prox_valido,
           max(d.validade)                                                  as max_venc
      from qualidade.documentos_fornecedor d
     where d.is_atual
       and d.excluido_em is null
       and d.resultado <> 'reprovado'
     group by d.fornecedor_id, d.documento_exigido_id
  )
  select
    f.id,
    f.razao_social,
    f.status_documental,
    de.id,
    de.nome,
    case when e.prioridade = 0 then 'obrigatorio' else 'condicional' end,
    de.tem_validade,
    case
      when coalesce(v.qtd, 0) = 0          then 'faltando'
      when not de.tem_validade             then 'ok'
      when coalesce(v.tem_valido, false)   then 'ok'
      when coalesce(v.tem_sem_data, false) then 'aguardando'
      else                                      'vencido'
    end,
    coalesce(v.prox_valido, v.max_venc)
  from exigidos e
  join qualidade.documentos_exigidos de on de.id = e.documento_exigido_id and de.ativo
  join core.fornecedores f              on f.id  = e.fornecedor_id
  left join vigentes v
    on v.fornecedor_id = e.fornecedor_id
   and v.documento_exigido_id = e.documento_exigido_id
  where f.org_id = core.current_org()
    -- Produtor rural não entra na homologação documental (ver documentos_vencendo).
    and f.tipo <> 'produtor_rural';
$$;

revoke execute on function qualidade.checklist_geral() from anon;
revoke execute on function qualidade.recalcular_status_documental(uuid) from anon, authenticated, public;
grant execute on function qualidade.checklist_geral() to authenticated;

-- Alinha o que já está no banco.
do $$
declare f uuid;
begin
  for f in select id from core.fornecedores loop
    perform qualidade.recalcular_status_documental(f);
  end loop;
end $$;
