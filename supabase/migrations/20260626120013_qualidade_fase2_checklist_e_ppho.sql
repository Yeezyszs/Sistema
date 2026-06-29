-- ============================================================================
-- 0013 — Motor genérico de checklist (coringa) + Fichas PPHO/Higienização
-- ============================================================================

create table qualidade.checklists (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  contexto   text not null,
  nome       text not null,
  descricao  text,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id)
);
create index on qualidade.checklists (contexto);

create table qualidade.checklist_itens (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references core.organizacoes(id),
  checklist_id uuid not null references qualidade.checklists(id) on delete cascade,
  item         text not null,
  ordem        integer not null default 0
);
create index on qualidade.checklist_itens (checklist_id);

create table qualidade.checklist_execucoes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  checklist_id  uuid not null references qualidade.checklists(id),
  contexto      text not null,
  lote_id       uuid references producao.lotes(id),
  turno         text,
  executor_id   uuid references core.funcionarios(id),
  validado_por  uuid references core.funcionarios(id),
  conforme      boolean not null default true,
  observacao    text,
  registrado_em timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create index on qualidade.checklist_execucoes (checklist_id, registrado_em);
create index on qualidade.checklist_execucoes (lote_id);

create table qualidade.checklist_respostas (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  execucao_id uuid not null references qualidade.checklist_execucoes(id) on delete cascade,
  item        text not null,
  resposta    text not null check (resposta in ('conforme','nao_conforme','na')),
  observacao  text,
  ordem       integer not null default 0
);
create index on qualidade.checklist_respostas (execucao_id);

create table qualidade.pphos (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  checklist_id  uuid not null references qualidade.checklists(id),
  codigo        text not null,
  nome          text not null,
  equipamento_id uuid references core.equipamentos(id),
  setor_id      uuid references core.setores(id),
  frequencia    text,
  quimico       text,
  concentracao  text,
  observacao    text,
  versao        integer not null default 1,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create index on qualidade.pphos (equipamento_id);

create trigger trg_set_org_id before insert on qualidade.checklists
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.checklist_itens
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.checklist_execucoes
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.checklist_respostas
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.pphos
  for each row execute function core.set_org_id();

alter table qualidade.checklists           enable row level security;
alter table qualidade.checklist_itens      enable row level security;
alter table qualidade.checklist_execucoes  enable row level security;
alter table qualidade.checklist_respostas  enable row level security;
alter table qualidade.pphos                enable row level security;

create policy tenant_isolation on qualidade.checklists
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.checklist_itens
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.pphos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

create policy append_select on qualidade.checklist_execucoes for select using (org_id = core.current_org());
create policy append_insert on qualidade.checklist_execucoes for insert with check (org_id = core.current_org());
create policy append_select on qualidade.checklist_respostas for select using (org_id = core.current_org());
create policy append_insert on qualidade.checklist_respostas for insert with check (org_id = core.current_org());

grant select, insert, update, delete on qualidade.checklists to authenticated;
grant select, insert, update, delete on qualidade.checklist_itens to authenticated;
grant select, insert, update, delete on qualidade.pphos to authenticated;
grant select, insert on qualidade.checklist_execucoes to authenticated;
grant select, insert on qualidade.checklist_respostas to authenticated;
revoke update, delete on qualidade.checklist_execucoes from authenticated;
revoke update, delete on qualidade.checklist_respostas from authenticated;
