-- ============================================================================
-- 0040 — PCM F3: execuções de lubrificação (a preventiva já existe da F1).
--   Cada execução referencia o ponto por setor/equip/item (padrão do PCM).
-- ============================================================================
create table manutencao.lu_execucoes (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  setor      text,
  equip      text,
  item       text,
  data       date not null default current_date,
  exec       text,
  obs        text,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id)
);
create index on manutencao.lu_execucoes (org_id, setor, equip, item);
create index on manutencao.lu_execucoes (org_id, data desc);

create trigger trg_set_org_id before insert on manutencao.lu_execucoes
  for each row execute function core.set_org_id();
alter table manutencao.lu_execucoes enable row level security;
create policy tenant_isolation on manutencao.lu_execucoes
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on manutencao.lu_execucoes to authenticated;
