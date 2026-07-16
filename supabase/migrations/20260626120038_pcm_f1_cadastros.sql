-- ============================================================================
-- 0038 — PCM F1: cadastros (portados do app PCM standalone).
--   Estrutura fiel ao PCM (github.com/Yeezyszs/PCM) com org_id + RLS:
--   colaboradores, equipamentos (por setor) + componentes, planos LU/PRM/IRM,
--   pontos de lubrificação, ferramentas (checklist/caixas) e preventiva.
--   O.S. completa, paradas, custos e indicadores vêm nas fases seguintes.
-- ============================================================================
create table manutencao.colaboradores (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  nome       text not null,
  funcao     text,
  setor      text,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id)
);

create table manutencao.equipamentos (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  setor      text not null,
  nome       text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id)
);
create index on manutencao.equipamentos (org_id, setor);

create table manutencao.equipamento_componentes (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  equipamento_id uuid not null references manutencao.equipamentos(id) on delete cascade,
  qty            text,
  nome           text not null,
  created_at     timestamptz not null default now()
);
create index on manutencao.equipamento_componentes (equipamento_id);

create table manutencao.planos (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  setor      text,
  equip      text,
  plano      text check (plano in ('LU','PRM','IRM')),
  item       text,
  period     text,
  qty        integer,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id)
);
create index on manutencao.planos (org_id, setor);

create table manutencao.lubrificacao (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references core.organizacoes(id),
  setor        text,
  equip        text,
  item         text,
  lubrificante text,
  bombadas     text,
  frequencia   text,
  created_at   timestamptz not null default now(),
  created_by   uuid references core.usuarios(id)
);
create index on manutencao.lubrificacao (org_id, setor);

create table manutencao.ferramentas (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  tipo       text check (tipo in ('eletrica','mecanica')),
  caixa      text, -- null = item do checklist | 'VERDE'/'VERMELHA' = inventário
  nome       text not null,
  qty        integer default 1,
  area       text,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id)
);
create index on manutencao.ferramentas (org_id, tipo, caixa);

create table manutencao.preventiva (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  equip      text not null,
  comp       text not null,
  trimestre  text check (trimestre in ('1º','2º','3º','4º')),
  planejada  date,
  realizada  date,
  exec       text,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id)
);
create index on manutencao.preventiva (org_id, trimestre);

-- Triggers de org + RLS por tenant em todas.
do $$
declare t text;
begin
  foreach t in array array['colaboradores','equipamentos','equipamento_componentes','planos','lubrificacao','ferramentas','preventiva'] loop
    execute format('create trigger trg_set_org_id before insert on manutencao.%I for each row execute function core.set_org_id()', t);
    execute format('alter table manutencao.%I enable row level security', t);
    execute format('create policy tenant_isolation on manutencao.%I for all using (org_id = core.current_org()) with check (org_id = core.current_org())', t);
    execute format('grant select, insert, update, delete on manutencao.%I to authenticated', t);
  end loop;
end $$;
