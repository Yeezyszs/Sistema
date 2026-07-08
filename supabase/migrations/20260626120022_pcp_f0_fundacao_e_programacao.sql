-- ============================================================================
-- 0022 — PCP F0 (fundação) + Programação de Produção (núcleo MES)
-- ============================================================================
alter table core.produtos
  add column if not exists variacao_acabamento text,
  add column if not exists kg_por_lote         numeric,
  add column if not exists tempo_por_lote_min  numeric,
  add column if not exists rendimento          numeric,
  add column if not exists peso_unitario        numeric;

create table producao.linhas (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references core.organizacoes(id),
  codigo             text not null,
  nome               text,
  horas_disponiveis  numeric not null default 8,
  ativo              boolean not null default true,
  created_at         timestamptz not null default now(),
  created_by         uuid references core.usuarios(id),
  unique (org_id, codigo)
);

create table producao.programacao (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  data        date not null,
  turno       text not null check (turno in ('1t','2t')),
  linha_id    uuid references producao.linhas(id),
  produto_id  uuid references core.produtos(id),
  atividade   text,
  meta_kg     numeric,
  real_kg     numeric,
  observacao  text,
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);
create index on producao.programacao (org_id, data);
create index on producao.programacao (linha_id);

create trigger trg_set_org_id before insert on producao.linhas
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.programacao
  for each row execute function core.set_org_id();

alter table producao.linhas       enable row level security;
alter table producao.programacao  enable row level security;

create policy tenant_isolation on producao.linhas
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on producao.programacao
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

grant select, insert, update, delete on producao.linhas to authenticated;
grant select, insert, update, delete on producao.programacao to authenticated;

insert into producao.linhas (org_id, codigo, nome, horas_disponiveis)
select '11111111-1111-1111-1111-111111111111', v.codigo, v.nome, 8
from (values ('L1','Linha 1'),('L2','Linha 2'),('L3','Linha 3')) as v(codigo,nome)
where not exists (
  select 1 from producao.linhas l
  where l.org_id='11111111-1111-1111-1111-111111111111' and l.codigo=v.codigo
);
