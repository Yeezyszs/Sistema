-- ============================================================================
-- Validade do documento pode variar por segmento.
--
-- Até aqui, "controla vencimento" era uma marca única do tipo de documento e
-- valia igual para todos os segmentos. Na prática não é assim: a mesma licença
-- é vitalícia para um segmento e tem vencimento para outro. Sem isso a
-- Qualidade era obrigada a escolher um dos dois comportamentos — e o lado
-- errado ou cobra data que não existe, ou deixa de alertar um vencimento real.
--
-- `segmento_documentos.tem_validade` passa a ser a exceção daquele segmento:
--   null  → segue o tipo de documento (o caso comum)
--   true  → aqui controla vencimento, mesmo que o tipo não controle
--   false → aqui é vitalícia, mesmo que o tipo controle
--
-- Quando o fornecedor atua em mais de um segmento e eles discordam, o mais
-- exigente vence: se algum segmento controla vencimento, o documento controla.
-- É a mesma regra que já valia para 'obrigatorio' x 'condicional'.
-- ============================================================================

alter table qualidade.segmento_documentos
  add column if not exists tem_validade boolean;

comment on column qualidade.segmento_documentos.tem_validade is
  'Exceção deste segmento: null segue documentos_exigidos.tem_validade; true controla vencimento; false é vitalícia.';

-- ── checklist de um fornecedor ────────────────────────────────────────────
create or replace function qualidade.checklist_fornecedor(p_fornecedor_id uuid)
returns table (
  documento_exigido_id uuid,
  documento            text,
  tem_validade         boolean,
  permite_multiplos    boolean,
  origem               text,
  exigencia            text,
  estado               text,
  proxima_validade     date,
  arquivos             jsonb
)
language sql
stable
security invoker
set search_path = qualidade, core, public
as $$
  with exigidos as (
    select sd.documento_exigido_id,
           min(case when sd.exigencia = 'obrigatorio' then 0 else 1 end) as prioridade,
           -- Exceção do segmento quando houver; senão, a regra do tipo.
           bool_or(coalesce(sd.tem_validade, de.tem_validade))           as tem_validade
      from qualidade.fornecedor_segmentos fs
      join qualidade.segmento_documentos sd on sd.segmento_id = fs.segmento_id
      join qualidade.documentos_exigidos de on de.id = sd.documento_exigido_id
     where fs.fornecedor_id = p_fornecedor_id
     group by sd.documento_exigido_id
  ),
  vigentes as (
    select d.*
      from qualidade.documentos_fornecedor d
     where d.fornecedor_id = p_fornecedor_id
       and d.is_atual
       and d.excluido_em is null
       and d.resultado <> 'reprovado'
  )
  select
    de.id,
    de.nome,
    e.tem_validade,
    de.permite_multiplos,
    de.origem,
    case when e.prioridade = 0 then 'obrigatorio' else 'condicional' end,
    case
      when count(v.id) = 0 then 'faltando'
      -- sem controle de validade aqui: existir já basta
      when not e.tem_validade then 'ok'
      when count(v.id) filter (where v.validade >= current_date) > 0 then 'ok'
      when count(v.id) filter (where v.validade is not null) = 0 then 'aguardando'
      else 'vencido'
    end,
    max(v.validade) filter (where v.validade >= current_date),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', v.id, 'validade', v.validade, 'emitido_em', v.emitido_em,
          'arquivo_nome', v.arquivo_nome, 'arquivo_path', v.arquivo_path,
          'arquivo_bucket', v.arquivo_bucket, 'resultado', v.resultado,
          'numero_laudo', v.numero_laudo, 'observacao', v.observacao
        ) order by v.validade desc nulls last, v.created_at desc
      ) filter (where v.id is not null),
      '[]'::jsonb
    )
  from exigidos e
  join qualidade.documentos_exigidos de on de.id = e.documento_exigido_id
  left join vigentes v on v.documento_exigido_id = de.id
  where de.ativo
  group by de.id, de.nome, e.tem_validade, de.permite_multiplos, de.origem, e.prioridade
  order by e.prioridade, de.nome;
$$;

-- ── checklist de todos os fornecedores ────────────────────────────────────
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
           min(case when sd.exigencia = 'obrigatorio' then 0 else 1 end) as prioridade,
           bool_or(coalesce(sd.tem_validade, de.tem_validade))           as tem_validade
      from qualidade.fornecedor_segmentos fs
      join qualidade.segmento_documentos sd on sd.segmento_id = fs.segmento_id
      join qualidade.documentos_exigidos de on de.id = sd.documento_exigido_id
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
    e.tem_validade,
    case
      when coalesce(v.qtd, 0) = 0          then 'faltando'
      when not e.tem_validade              then 'ok'
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
    and f.tipo <> 'produtor_rural';
$$;

-- ── documentos vencendo ───────────────────────────────────────────────────
-- O alerta passa a respeitar a exceção: documento vitalício num segmento não
-- gera aviso de vencimento por causa dele.
create or replace function qualidade.documentos_vencendo(p_dias integer default 30)
returns table (
  documento_id  uuid,
  fornecedor_id uuid,
  fornecedor    text,
  documento     text,
  validade      date,
  dias          integer,
  estado        text
)
language sql
stable
security invoker
set search_path = qualidade, core, public
as $$
  with controla as (
    select fs.fornecedor_id,
           sd.documento_exigido_id,
           bool_or(coalesce(sd.tem_validade, de.tem_validade)) as tem_validade
      from qualidade.fornecedor_segmentos fs
      join qualidade.segmento_documentos sd on sd.segmento_id = fs.segmento_id
      join qualidade.documentos_exigidos de on de.id = sd.documento_exigido_id
     group by fs.fornecedor_id, sd.documento_exigido_id
  )
  select
    d.id,
    f.id,
    f.razao_social,
    de.nome,
    d.validade,
    (d.validade - current_date)::int,
    case when d.validade < current_date then 'vencido' else 'proximo_vencimento' end
  from qualidade.documentos_fornecedor d
  join qualidade.documentos_exigidos de on de.id = d.documento_exigido_id
  join core.fornecedores f              on f.id  = d.fornecedor_id
  join controla c                       on c.fornecedor_id = d.fornecedor_id
                                       and c.documento_exigido_id = d.documento_exigido_id
  where d.is_atual
    and d.excluido_em is null
    and d.resultado <> 'reprovado'
    and c.tem_validade
    and de.ativo
    and d.validade is not null
    and d.validade <= current_date + p_dias
    -- Produtor rural fica fora da homologação documental (ver checklist_geral).
    and f.tipo <> 'produtor_rural'
  order by d.validade;
$$;

revoke execute on function qualidade.checklist_fornecedor(uuid) from anon;
revoke execute on function qualidade.checklist_geral() from anon;
revoke execute on function qualidade.documentos_vencendo(integer) from anon;
grant execute on function qualidade.checklist_fornecedor(uuid) to authenticated;
grant execute on function qualidade.checklist_geral() to authenticated;
grant execute on function qualidade.documentos_vencendo(integer) to authenticated;
