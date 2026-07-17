-- ============================================================================
-- 0042 — PCM F4: base dos indicadores (MTTR/MTBF/Disponibilidade).
--   paradas: paradas de fábrica (tipo/setor/turno/motivo/horas).
--   producao_horas: horas planejadas por mês/ano (denominador da disponib.).
--   custos: lançamentos de custos operacionais (gráfico de custos).
-- ============================================================================
create table manutencao.paradas (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  data        date not null default current_date,
  tipo        text not null check (tipo in ('Manutenção / Quebra','Queda de Energia','Falta de Matéria Prima','Outro')),
  setor       text,
  turno       text,   -- 1º / 2º / Revezamento
  hora_inicio text,
  hora_fim    text,
  horas       numeric not null default 0,
  motivo      text,
  os_id       uuid references manutencao.ordens(id) on delete set null,
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);
create index on manutencao.paradas (org_id, data);

create table manutencao.producao_horas (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  mes         integer not null check (mes between 1 and 12),
  ano         integer not null,
  horas       numeric not null default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id),
  unique (org_id, mes, ano)
);

create table manutencao.custos (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  data        date not null default current_date,
  categoria   text,
  descricao   text,
  valor       numeric not null default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);
create index on manutencao.custos (org_id, data);

do $$
declare t text;
begin
  foreach t in array array['paradas','producao_horas','custos'] loop
    execute format('create trigger trg_set_org_id before insert on manutencao.%I for each row execute function core.set_org_id()', t);
    execute format('alter table manutencao.%I enable row level security', t);
    execute format('create policy tenant_isolation on manutencao.%I for all using (org_id = core.current_org()) with check (org_id = core.current_org())', t);
    execute format('grant select, insert, update, delete on manutencao.%I to authenticated', t);
  end loop;
end $$;
