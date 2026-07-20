-- ============================================================================
-- 0044 — PCM F5: checklist diário de ferramentas.
--   Grade mensal por colaborador: para cada ferramenta (tipo checklist) e dia
--   do mês registra-se um estado (C / NC / F / FE / A).
-- ============================================================================
create table manutencao.checklist_ferramenta_estado (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  colaborador_id uuid not null references manutencao.colaboradores(id) on delete cascade,
  ferramenta_id  uuid not null references manutencao.ferramentas(id) on delete cascade,
  ano            integer not null,
  mes            integer not null check (mes between 1 and 12),
  dia            integer not null check (dia between 1 and 31),
  estado         text not null check (estado in ('C','NC','F','FE','A')),
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id),
  unique (org_id, colaborador_id, ferramenta_id, ano, mes, dia)
);
create index on manutencao.checklist_ferramenta_estado (org_id, colaborador_id, ano, mes);

create trigger trg_set_org_id before insert on manutencao.checklist_ferramenta_estado
  for each row execute function core.set_org_id();
alter table manutencao.checklist_ferramenta_estado enable row level security;
create policy tenant_isolation on manutencao.checklist_ferramenta_estado
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on manutencao.checklist_ferramenta_estado to authenticated;
