-- ============================================================================
-- 0031 — Qualidade: Monitoramento do Teor de Cloro Residual e pH (FOR-POP 2).
--   Log diário da água. Limites: cloro 0,2–5,0 ppm e pH 6,0–8,0. A conformidade
--   é calculada por trigger (fora do limite => não conforme). Validação da
--   Qualidade em campo próprio.
-- ============================================================================
create table qualidade.monitoramentos_agua (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  data          date not null default current_date,
  hora          time,
  ponto_coleta  text,
  cloro_ppm     numeric,     -- aceitável 0,2 a 5,0
  ph            numeric,     -- aceitável 6,0 a 8,0
  aspecto       text,        -- Incolor, límpida, etc.
  conforme      boolean not null default true,
  responsavel   text,
  validado_por  text,        -- validação da Qualidade
  observacao    text,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create index on qualidade.monitoramentos_agua (org_id, data);

-- Avalia a conformidade contra os limites fixos do POP.
create or replace function qualidade.monitoramento_agua_avalia()
returns trigger language plpgsql set search_path = qualidade, public as $$
begin
  NEW.conforme :=
    (NEW.cloro_ppm is null or (NEW.cloro_ppm >= 0.2 and NEW.cloro_ppm <= 5.0))
    and (NEW.ph is null or (NEW.ph >= 6.0 and NEW.ph <= 8.0));
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on qualidade.monitoramentos_agua
  for each row execute function core.set_org_id();
create trigger trg_monitoramento_agua_avalia before insert or update on qualidade.monitoramentos_agua
  for each row execute function qualidade.monitoramento_agua_avalia();

alter table qualidade.monitoramentos_agua enable row level security;
create policy tenant_isolation on qualidade.monitoramentos_agua
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on qualidade.monitoramentos_agua to authenticated;
