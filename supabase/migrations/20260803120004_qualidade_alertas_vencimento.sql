-- ============================================================================
-- Alertas de vencimento de documento de fornecedor.
--
-- A regra de QUEM está vencendo já mora em qualidade.documentos_vencendo();
-- aqui só se controla o que JÁ FOI AVISADO, para não reenviar o mesmo alerta
-- todo dia. O envio em si é feito pela Edge Function `alertas-documentos`
-- (supabase/functions/), agendada uma vez por dia — ver o README de supabase/.
-- ============================================================================

create table if not exists qualidade.alertas_documento_enviados (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references core.organizacoes(id),
  documento_id uuid not null references qualidade.documentos_fornecedor(id) on delete cascade,
  tipo         text not null check (tipo in ('proximo_vencimento','vencido')),
  enviado_em   timestamptz not null default now(),
  unique (documento_id, tipo)
);

create trigger trg_set_org_id before insert on qualidade.alertas_documento_enviados
  for each row execute function core.set_org_id();

alter table qualidade.alertas_documento_enviados enable row level security;

create policy tenant_isolation on qualidade.alertas_documento_enviados
  for all to authenticated
  using (org_id = core.current_org())
  with check (org_id = core.current_org());

grant select, insert, delete on qualidade.alertas_documento_enviados to authenticated;

-- ── O que ainda precisa ser avisado ────────────────────────────────────────
-- Um alerta por (documento, tipo). Se um documento próximo do vencimento
-- vencer de fato, ele reaparece aqui como 'vencido' — é outra informação.
create or replace function qualidade.alertas_documento_pendentes(p_dias integer default 30)
returns table (
  documento_id  uuid,
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
  select v.documento_id, v.fornecedor, v.documento, v.validade, v.dias, v.estado
    from qualidade.documentos_vencendo(p_dias) v
   where not exists (
     select 1 from qualidade.alertas_documento_enviados a
      where a.documento_id = v.documento_id
        and a.tipo = v.estado
   )
   order by v.validade;
$$;

-- Marca como enviado. Chamada pela Edge Function DEPOIS que o e-mail sai —
-- se o envio falhar, o alerta continua pendente e volta no dia seguinte.
create or replace function qualidade.registrar_alerta_documento(
  p_documento_id uuid,
  p_tipo         text
)
returns void
language plpgsql
security invoker
set search_path = qualidade, core, public
as $$
begin
  if p_tipo not in ('proximo_vencimento','vencido') then
    raise exception 'Tipo de alerta inválido: %', p_tipo;
  end if;

  insert into qualidade.alertas_documento_enviados (documento_id, tipo)
  values (p_documento_id, p_tipo)
  on conflict (documento_id, tipo) do nothing;
end $$;

revoke execute on function qualidade.alertas_documento_pendentes(integer) from anon;
revoke execute on function qualidade.registrar_alerta_documento(uuid, text) from anon;
grant execute on function qualidade.alertas_documento_pendentes(integer) to authenticated;
grant execute on function qualidade.registrar_alerta_documento(uuid, text) to authenticated;
