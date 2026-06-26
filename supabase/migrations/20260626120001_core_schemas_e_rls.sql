-- ============================================================================
-- 0001 — Schemas de domínio + core (tronco / dados-mestre) + RLS multi-tenant
-- ============================================================================
-- Princípios (brief v1):
--   · um único projeto, schemas por domínio; FK cruza schemas.
--   · tenant-aware desde o dia 1: toda tabela de tenant carrega org_id + RLS.
--   · catálogos universais (perfis) são globais (sem org_id), só leitura.
-- ============================================================================

create schema if not exists core;
create schema if not exists producao;
create schema if not exists qualidade;   -- nasce vazio (Fase 2)
create schema if not exists manutencao;  -- nasce vazio (Fase 3)

-- ----------------------------------------------------------------------------
-- Tenants
-- ----------------------------------------------------------------------------
create table core.organizacoes (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  cnpj        text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Identidade (liga ao Supabase Auth)
-- ----------------------------------------------------------------------------
create table core.usuarios (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references core.organizacoes(id),
  auth_user_id uuid unique references auth.users(id),
  nome         text not null,
  email        text not null,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   uuid references core.usuarios(id)
);
create index on core.usuarios (org_id);

-- Resolve o tenant a partir do JWT do usuário logado.
-- SECURITY DEFINER: lê core.usuarios ignorando a RLS, evitando a recursão
-- que ocorreria se a policy de usuarios chamasse uma função sujeita à RLS.
create or replace function core.current_org()
returns uuid
language sql
stable
security definer
set search_path = core, public
as $$
  select org_id from core.usuarios where auth_user_id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- Catálogo global de perfis (universal — sem org_id)
-- ----------------------------------------------------------------------------
create table core.perfis (
  id    uuid primary key default gen_random_uuid(),
  nome  text not null unique          -- operador | qualidade | manutencao | gestao
);

-- ----------------------------------------------------------------------------
-- Demais dados-mestre (tenant-scoped)
-- ----------------------------------------------------------------------------
create table core.usuario_perfis (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  usuario_id  uuid not null references core.usuarios(id),
  perfil_id   uuid not null references core.perfis(id),
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id),
  unique (usuario_id, perfil_id)
);

create table core.setores (             -- descarga, extração, secagem, lab, ensaque, expedição
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  nome        text not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);

create table core.produtos (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  nome        text not null,
  tipo        text not null check (tipo in ('materia_prima','embalagem','insumo','produto_acabado')),
  unidade     text not null,            -- kg, sc, un...
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);

create table core.fornecedores (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  razao_social  text not null,
  cnpj          text,
  tipo          text not null default 'fornecedor'
                  check (tipo in ('fornecedor','produtor_rural','transportadora')),
  homologado    boolean not null default false,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);

create table core.equipamentos (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  nome        text not null,
  tag         text,
  setor_id    uuid references core.setores(id),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);

create table core.funcionarios (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  usuario_id  uuid references core.usuarios(id),     -- opcional
  nome        text not null,
  funcao      text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);

-- ============================================================================
-- RLS
-- ============================================================================
alter table core.organizacoes   enable row level security;
alter table core.usuarios       enable row level security;
alter table core.perfis         enable row level security;
alter table core.usuario_perfis enable row level security;
alter table core.setores        enable row level security;
alter table core.produtos       enable row level security;
alter table core.fornecedores   enable row level security;
alter table core.equipamentos   enable row level security;
alter table core.funcionarios   enable row level security;

-- organizacoes: o tenant enxerga a própria org
create policy tenant_isolation on core.organizacoes
  for all using (id = core.current_org()) with check (id = core.current_org());

-- usuarios: isolado por org (current_org é SECURITY DEFINER, sem recursão)
create policy tenant_isolation on core.usuarios
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

-- perfis: catálogo global, leitura para qualquer autenticado
create policy ref_read on core.perfis
  for select using (auth.role() = 'authenticated');

-- demais tabelas tenant: isolamento padrão
create policy tenant_isolation on core.usuario_perfis
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on core.setores
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on core.produtos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on core.fornecedores
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on core.equipamentos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on core.funcionarios
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

-- ============================================================================
-- Grants (RLS gateia linhas; grants gateiam acesso à tabela/schema)
-- ============================================================================
grant usage on schema core to anon, authenticated;
grant execute on function core.current_org() to anon, authenticated;
grant select, insert, update, delete on all tables in schema core to authenticated;
grant select on core.perfis to anon;
alter default privileges in schema core
  grant select, insert, update, delete on tables to authenticated;
