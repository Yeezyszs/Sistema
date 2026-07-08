-- ============================================================================
-- 0024 — ERP: Estoque & Inventário (posição física + saldo por lote)
--   Localização = barração/rua (ex.: "B.1 - R.1"). Uma posição ocupa uma rua
--   com um lote/produto, qtd de bags e cliente reservado.
-- ============================================================================
create table producao.locais_estoque (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  barracao   text not null,
  rua        text not null,
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id),
  unique (org_id, barracao, rua)
);

create table producao.posicoes_estoque (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  local_id    uuid not null references producao.locais_estoque(id),
  lote_id     uuid references producao.lotes(id),
  produto_id  uuid references core.produtos(id),
  cliente_id  uuid references core.clientes(id),
  qtd_bags    numeric,
  status      text not null default 'ocupado' check (status in ('ocupado','reprocesso')),
  alocado_em  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);
create index on producao.posicoes_estoque (local_id);
create index on producao.posicoes_estoque (lote_id);

create trigger trg_set_org_id before insert on producao.locais_estoque
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.posicoes_estoque
  for each row execute function core.set_org_id();

alter table producao.locais_estoque   enable row level security;
alter table producao.posicoes_estoque enable row level security;

create policy tenant_isolation on producao.locais_estoque
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on producao.posicoes_estoque
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

grant select, insert, update, delete on producao.locais_estoque to authenticated;
grant select, insert, update, delete on producao.posicoes_estoque to authenticated;

insert into producao.locais_estoque (org_id, barracao, rua)
select '11111111-1111-1111-1111-111111111111', b, r
from (values ('B.1'),('B.2'),('B.3')) as bb(b),
     (values ('R.1'),('R.2'),('R.3'),('R.4'),('R.5')) as rr(r)
where not exists (
  select 1 from producao.locais_estoque l
  where l.org_id='11111111-1111-1111-1111-111111111111' and l.barracao=bb.b and l.rua=rr.r
);
