-- ============================================================================
-- 0011 — Fase 2: PCC Físico (detector de metais, imãs, quebra de vidros)
-- ============================================================================

create table qualidade.detectores_metais (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  equipamento_id uuid references core.equipamentos(id),
  linha         text not null,
  ferroso_mm     numeric not null default 1.2,
  nao_ferroso_mm numeric not null default 1.2,
  inox_mm        numeric not null default 1.5,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);

create table qualidade.imas (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  setor_id   uuid references core.setores(id),
  local      text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id)
);

create table qualidade.verificacoes_dm (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references core.organizacoes(id),
  detector_id         uuid not null references qualidade.detectores_metais(id),
  lote_id             uuid references producao.lotes(id),
  tipo_teste          text not null
                        check (tipo_teste in ('inicio_producao','apos_parada','apos_manutencao',
                                              'troca_produto','durante_producao','final_producao')),
  resultado_ferroso     boolean not null,
  resultado_nao_ferroso boolean not null,
  resultado_inox        boolean not null,
  conforme            boolean not null,
  acao_corretiva      text,
  operador_id         uuid references core.funcionarios(id),
  registrado_em       timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  created_by          uuid references core.usuarios(id)
);
create index on qualidade.verificacoes_dm (detector_id, registrado_em);
create index on qualidade.verificacoes_dm (lote_id);

create table qualidade.verificacoes_ima (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  ima_id         uuid not null references qualidade.imas(id),
  peso_g         numeric,
  material       text,
  acao           text,
  responsavel_id uuid references core.funcionarios(id),
  registrado_em  timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on qualidade.verificacoes_ima (ima_id, registrado_em);

create table qualidade.quebras_vidro (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references core.organizacoes(id),
  local           text not null,
  tipo_vidro      text,
  quantidade      text,
  causa           text,
  acao_imediata   text,
  acao_preventiva text,
  responsavel_id  uuid references core.funcionarios(id),
  registrado_em   timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  created_by      uuid references core.usuarios(id)
);
create index on qualidade.quebras_vidro (registrado_em);

create trigger trg_set_org_id before insert on qualidade.detectores_metais
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.imas
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.verificacoes_dm
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.verificacoes_ima
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.quebras_vidro
  for each row execute function core.set_org_id();

alter table qualidade.detectores_metais enable row level security;
alter table qualidade.imas               enable row level security;
alter table qualidade.verificacoes_dm    enable row level security;
alter table qualidade.verificacoes_ima   enable row level security;
alter table qualidade.quebras_vidro      enable row level security;

create policy tenant_isolation on qualidade.detectores_metais
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.imas
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

create policy append_select on qualidade.verificacoes_dm for select using (org_id = core.current_org());
create policy append_insert on qualidade.verificacoes_dm for insert with check (org_id = core.current_org());
create policy append_select on qualidade.verificacoes_ima for select using (org_id = core.current_org());
create policy append_insert on qualidade.verificacoes_ima for insert with check (org_id = core.current_org());
create policy append_select on qualidade.quebras_vidro for select using (org_id = core.current_org());
create policy append_insert on qualidade.quebras_vidro for insert with check (org_id = core.current_org());

grant select, insert, update, delete on qualidade.detectores_metais to authenticated;
grant select, insert, update, delete on qualidade.imas to authenticated;
grant select, insert on qualidade.verificacoes_dm to authenticated;
grant select, insert on qualidade.verificacoes_ima to authenticated;
grant select, insert on qualidade.quebras_vidro to authenticated;
revoke update, delete on qualidade.verificacoes_dm from authenticated;
revoke update, delete on qualidade.verificacoes_ima from authenticated;
revoke update, delete on qualidade.quebras_vidro from authenticated;
