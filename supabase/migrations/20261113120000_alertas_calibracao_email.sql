-- Alerta por e-mail de calibração vencendo (30 dias) ou vencida, no mesmo
-- envio diário dos documentos de fornecedor (Edge Function
-- `alertas-documentos`). Mesma ideia: um aviso por (certificado, tipo) — o
-- "vence em breve" e depois o "venceu" — e só marca depois que o e-mail sai.
-- Olha só o certificado vigente de cada instrumento ativo, como a tela.

create table if not exists qualidade.alertas_calibracao_enviados (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  calibracao_id  uuid not null references qualidade.calibracoes(id) on delete cascade,
  tipo           text not null check (tipo in ('proximo_vencimento','vencido')),
  enviado_em     timestamptz not null default now(),
  unique (calibracao_id, tipo)
);

alter table qualidade.alertas_calibracao_enviados enable row level security;
create policy tenant_isolation on qualidade.alertas_calibracao_enviados
  for all to authenticated
  using (org_id = core.current_org())
  with check (org_id = core.current_org());
grant select on qualidade.alertas_calibracao_enviados to authenticated;

create or replace function qualidade.alertas_calibracao_pendentes(p_dias integer default 30)
returns table (
  calibracao_id uuid,
  codigo        text,
  instrumento   text,
  area          text,
  certificado   text,
  validade      date,
  dias          integer,
  estado        text
)
language sql
stable
security invoker
set search_path = qualidade, core, public
as $$
  with vigente as (
    select distinct on (c.instrumento_id) c.*
      from qualidade.calibracoes c
      join qualidade.instrumentos i on i.id = c.instrumento_id and i.ativo
     order by c.instrumento_id, c.calibrado_em desc, c.created_at desc
  )
  select v.id, i.codigo, i.nome, i.area, v.certificado_numero, v.valido_ate,
         (v.valido_ate - current_date)::int,
         case when v.valido_ate < current_date then 'vencido' else 'proximo_vencimento' end
    from vigente v
    join qualidade.instrumentos i on i.id = v.instrumento_id
   where v.valido_ate is not null
     and v.valido_ate <= current_date + p_dias
     and not exists (
       select 1 from qualidade.alertas_calibracao_enviados a
        where a.calibracao_id = v.id
          and a.tipo = case when v.valido_ate < current_date then 'vencido' else 'proximo_vencimento' end
     )
   order by v.valido_ate;
$$;

-- A função roda com a service role (sem usuário logado), então o org_id vem
-- do próprio registro, não de core.current_org().
create or replace function qualidade.registrar_alerta_calibracao(p_calibracao_id uuid, p_tipo text)
returns void
language plpgsql
security invoker
set search_path = qualidade, core, public
as $$
begin
  if p_tipo not in ('proximo_vencimento','vencido') then
    raise exception 'Tipo de alerta inválido: %', p_tipo;
  end if;
  insert into qualidade.alertas_calibracao_enviados (org_id, calibracao_id, tipo)
  select c.org_id, c.id, p_tipo from qualidade.calibracoes c where c.id = p_calibracao_id
  on conflict (calibracao_id, tipo) do nothing;
end $$;

-- Mesmo ajuste no registro dos documentos: o trigger de org_id depende de
-- usuário logado, e o envio automático não tem um.
create or replace function qualidade.registrar_alerta_documento(p_documento_id uuid, p_tipo text)
returns void
language plpgsql
security invoker
set search_path = qualidade, core, public
as $$
begin
  if p_tipo not in ('proximo_vencimento','vencido') then
    raise exception 'Tipo de alerta inválido: %', p_tipo;
  end if;
  insert into qualidade.alertas_documento_enviados (org_id, documento_id, tipo)
  select d.org_id, d.id, p_tipo from qualidade.documentos_fornecedor d where d.id = p_documento_id
  on conflict (documento_id, tipo) do nothing;
end $$;

revoke execute on function qualidade.alertas_calibracao_pendentes(integer) from public, anon, authenticated;
revoke execute on function qualidade.registrar_alerta_calibracao(uuid, text) from public, anon, authenticated;
grant execute on function qualidade.alertas_calibracao_pendentes(integer) to service_role;
grant execute on function qualidade.registrar_alerta_calibracao(uuid, text) to service_role;
grant select, insert on qualidade.alertas_calibracao_enviados to service_role;

-- O envio automático roda como service_role: precisa ler e marcar os dois.
grant usage on schema qualidade to service_role;
grant select, insert on qualidade.alertas_documento_enviados to service_role;
grant execute on function qualidade.alertas_documento_pendentes(integer) to service_role;
grant execute on function qualidade.registrar_alerta_documento(uuid, text) to service_role;
grant execute on function qualidade.documentos_vencendo(integer) to service_role;
grant select on all tables in schema qualidade to service_role;
-- documentos_vencendo junta core.fornecedores.
grant usage on schema core to service_role;
grant select on all tables in schema core to service_role;
