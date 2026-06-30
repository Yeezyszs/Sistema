-- ============================================================================
-- 0018 — Fase 3: Inspeção de recebimento (MP/pallets/embalagem) + Homologação
--         de fornecedores. Reusa o motor de checklist (Fase 2) e core.fornecedores.
-- ============================================================================
create table qualidade.inspecoes_recebimento (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  tipo           text not null default 'mp' check (tipo in ('mp','pallets','embalagem')),
  recebimento_id uuid references producao.recebimentos(id),
  fornecedor_id  uuid references core.fornecedores(id),
  execucao_id    uuid references qualidade.checklist_execucoes(id),
  placa          text,
  ticket         text,
  variedade      text,
  conforme       boolean not null default true,
  observacao     text,
  inspecionado_em timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on qualidade.inspecoes_recebimento (recebimento_id);
create index on qualidade.inspecoes_recebimento (org_id, tipo);

create table qualidade.homologacoes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  fornecedor_id uuid not null references core.fornecedores(id),
  status        text not null default 'em_analise'
                  check (status in ('em_analise','qualificado','desqualificado')),
  pontuacao     numeric,
  classificacao text,
  validade      date,
  observacao    text,
  avaliado_em   date not null default current_date,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create index on qualidade.homologacoes (fornecedor_id);

create table qualidade.avaliacoes_fornecedor (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  fornecedor_id uuid not null references core.fornecedores(id),
  periodo       text,
  criterios     jsonb,
  pontuacao     numeric,
  classificacao text,
  avaliador_id  uuid references core.funcionarios(id),
  avaliado_em   date not null default current_date,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create index on qualidade.avaliacoes_fornecedor (fornecedor_id);

create trigger trg_set_org_id before insert on qualidade.inspecoes_recebimento
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.homologacoes
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.avaliacoes_fornecedor
  for each row execute function core.set_org_id();

create or replace function qualidade.homologacao_atualiza_fornecedor()
returns trigger language plpgsql security invoker set search_path = qualidade, core, public as $$
begin
  update core.fornecedores
     set homologado = (NEW.status = 'qualificado')
   where id = NEW.fornecedor_id and org_id = NEW.org_id;
  return NEW;
end; $$;
create trigger trg_homolog_fornecedor after insert on qualidade.homologacoes
  for each row execute function qualidade.homologacao_atualiza_fornecedor();

alter table qualidade.inspecoes_recebimento enable row level security;
alter table qualidade.homologacoes          enable row level security;
alter table qualidade.avaliacoes_fornecedor enable row level security;

create policy append_select on qualidade.inspecoes_recebimento for select using (org_id = core.current_org());
create policy append_insert on qualidade.inspecoes_recebimento for insert with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.homologacoes
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.avaliacoes_fornecedor
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

grant select, insert on qualidade.inspecoes_recebimento to authenticated;
revoke update, delete on qualidade.inspecoes_recebimento from authenticated;
grant select, insert, update, delete on qualidade.homologacoes to authenticated;
grant select, insert, update, delete on qualidade.avaliacoes_fornecedor to authenticated;
