-- ============================================================================
-- Homologação — regras do checklist documental (moram no Postgres; o front
-- consome e não recalcula).
--   · checklist_fornecedor()        — estado de cada item exigido
--   · status_documental_fornecedor()— ok | pendente | sem_documentos
--   · status_documental_geral()     — todos os fornecedores numa consulta
--   · excluir_documento_fornecedor()— soft delete com motivo obrigatório
--
-- Documento satisfaz um item quando: vigente (is_atual), não excluído,
-- resultado <> 'reprovado' e — se o tipo controla validade — dentro do prazo.
-- ============================================================================

-- ── 6.2 — estado de cada item do checklist ─────────────────────────────────
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
    -- União dos segmentos do fornecedor; 'obrigatorio' prevalece quando o
    -- mesmo tipo aparece em mais de um segmento.
    select sd.documento_exigido_id,
           min(case when sd.exigencia = 'obrigatorio' then 0 else 1 end) as prioridade
      from qualidade.fornecedor_segmentos fs
      join qualidade.segmento_documentos sd on sd.segmento_id = fs.segmento_id
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
    de.tem_validade,
    de.permite_multiplos,
    de.origem,
    case when e.prioridade = 0 then 'obrigatorio' else 'condicional' end,
    case
      when count(v.id) = 0 then 'faltando'
      -- tipo sem controle de validade: existir já basta
      when not de.tem_validade then 'ok'
      -- basta um arquivo dentro do prazo
      when count(v.id) filter (where v.validade >= current_date) > 0 then 'ok'
      -- há arquivo, o tipo tem validade e nenhuma data foi informada
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
  group by de.id, de.nome, de.tem_validade, de.permite_multiplos, de.origem, e.prioridade
  order by e.prioridade, de.nome;
$$;

-- ── 6.3 — status documental do fornecedor ──────────────────────────────────
-- Só os OBRIGATÓRIOS entram no cálculo; condicionais não impedem 'ok'.
create or replace function qualidade.status_documental_fornecedor(p_fornecedor_id uuid)
returns text
language sql
stable
security invoker
set search_path = qualidade, core, public
as $$
  with docs as (
    -- o fornecedor chegou a entregar alguma coisa?
    select 1 from qualidade.documentos_fornecedor
     where fornecedor_id = p_fornecedor_id
       and is_atual and excluido_em is null
     limit 1
  ),
  itens as (
    select * from qualidade.checklist_fornecedor(p_fornecedor_id)
     where exigencia = 'obrigatorio'
  )
  select case
    when not exists (select 1 from docs) then 'sem_documentos'
    when (select count(*) from itens where estado <> 'ok') = 0 then 'ok'
    else 'pendente'
  end;
$$;

-- Versão de conjunto: alimenta listagem e painel com UMA consulta.
create or replace function qualidade.status_documental_geral()
returns table (
  fornecedor_id      uuid,
  status_documental  text,
  itens_pendentes    integer,
  proximo_vencimento date
)
language sql
stable
security invoker
set search_path = qualidade, core, public
as $$
  select
    f.id,
    qualidade.status_documental_fornecedor(f.id),
    (select count(*)::int from qualidade.checklist_fornecedor(f.id)
      where exigencia = 'obrigatorio' and estado <> 'ok'),
    (select min(proxima_validade) from qualidade.checklist_fornecedor(f.id)
      where proxima_validade is not null)
  from core.fornecedores f
  where f.org_id = core.current_org();
$$;

-- ── 6.4 — exclusão de documento lançado errado (soft delete) ───────────────
-- O registro permanece no banco: rastreabilidade é requisito FSSC 22000.
create or replace function qualidade.excluir_documento_fornecedor(
  p_documento_id uuid,
  p_motivo       text
)
returns void
language plpgsql
security invoker
set search_path = qualidade, core, public
as $$
declare
  v_doc       qualidade.documentos_fornecedor;
  v_multiplos boolean;
  v_usuario   uuid;
begin
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'O motivo da exclusão é obrigatório.';
  end if;

  select * into v_doc from qualidade.documentos_fornecedor where id = p_documento_id;
  if not found then
    raise exception 'Documento não encontrado.';
  end if;
  if v_doc.excluido_em is not null then
    raise exception 'Documento já excluído.';
  end if;

  select id into v_usuario from core.usuarios where auth_user_id = auth.uid();

  update qualidade.documentos_fornecedor
     set excluido_em     = now(),
         excluido_por    = v_usuario,
         motivo_exclusao = btrim(p_motivo),
         is_atual        = false
   where id = p_documento_id;

  -- Se era o vigente de um tipo single, promove a versão anterior não excluída.
  if v_doc.documento_exigido_id is not null and v_doc.is_atual then
    select permite_multiplos into v_multiplos
      from qualidade.documentos_exigidos where id = v_doc.documento_exigido_id;

    if not coalesce(v_multiplos, false) then
      update qualidade.documentos_fornecedor
         set is_atual = true
       where id = (
         select id from qualidade.documentos_fornecedor
          where fornecedor_id = v_doc.fornecedor_id
            and documento_exigido_id = v_doc.documento_exigido_id
            and excluido_em is null
            and id <> p_documento_id
          order by created_at desc
          limit 1
       );
    end if;
  end if;
end $$;

-- Grants: as funções são security invoker (a RLS de cada tabela continua
-- valendo). Ainda assim, nada é executável por anon.
revoke execute on function qualidade.checklist_fornecedor(uuid) from anon;
revoke execute on function qualidade.status_documental_fornecedor(uuid) from anon;
revoke execute on function qualidade.status_documental_geral() from anon;
revoke execute on function qualidade.excluir_documento_fornecedor(uuid, text) from anon;

grant execute on function qualidade.checklist_fornecedor(uuid) to authenticated;
grant execute on function qualidade.status_documental_fornecedor(uuid) to authenticated;
grant execute on function qualidade.status_documental_geral() to authenticated;
grant execute on function qualidade.excluir_documento_fornecedor(uuid, text) to authenticated;
