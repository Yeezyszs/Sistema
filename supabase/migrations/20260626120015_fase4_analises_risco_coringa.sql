-- ============================================================================
-- 0015 — Fase 4: Análise de risco (coringa) — Food Defense / Food Fraud / APPCC
-- ============================================================================
create table qualidade.analises_risco (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references core.organizacoes(id),
  tipo               text not null check (tipo in ('food_defense','food_fraud','appcc')),
  titulo             text not null,
  contexto           text,
  descricao          text,
  eixos              jsonb not null,
  risco              numeric,
  classificacao      text,
  necessita_mitigacao boolean not null default false,
  mitigacao          text,
  avaliado_em        date not null default current_date,
  created_at         timestamptz not null default now(),
  created_by         uuid references core.usuarios(id)
);
create index on qualidade.analises_risco (org_id, tipo);

create trigger trg_set_org_id before insert on qualidade.analises_risco
  for each row execute function core.set_org_id();

alter table qualidade.analises_risco enable row level security;
create policy tenant_isolation on qualidade.analises_risco
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on qualidade.analises_risco to authenticated;
