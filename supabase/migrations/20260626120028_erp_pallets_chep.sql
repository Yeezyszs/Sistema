-- ============================================================================
-- 0028 — ERP: Pallets (CHEP + próprios).
--   Saldo por tipo (chep/pbr/proprio). Movimentos:
--     recebido  (+) entram na fábrica
--     devolvido (+) voltam de terceiros para a fábrica
--     enviado   (-) saem com a carga (ficam em poder de terceiros)
--     ajuste    (±) correção de inventário
--   "Em poder de terceiros" (CHEP) = Σ enviado − Σ devolvido, calculado no app.
-- ============================================================================
create table producao.pallets (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  tipo       text not null check (tipo in ('chep','pbr','proprio')),
  saldo      numeric not null default 0,   -- pallets em casa
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id),
  unique (org_id, tipo)
);

create table producao.movimentos_pallet (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  pallet_id      uuid not null references producao.pallets(id) on delete cascade,
  tipo_mov       text not null check (tipo_mov in ('recebido','devolvido','enviado','ajuste')),
  quantidade     numeric not null,
  parceiro       text,                                 -- cliente/transportadora
  carregamento_id uuid references producao.carregamentos(id) on delete set null,
  data           date not null default current_date,
  observacao     text,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.movimentos_pallet (pallet_id, data);

create or replace function producao.movimento_pallet_aplica()
returns trigger language plpgsql security definer set search_path = producao, public as $$
declare
  delta numeric;
begin
  delta := case NEW.tipo_mov
             when 'recebido'  then NEW.quantidade
             when 'devolvido' then NEW.quantidade
             when 'ajuste'    then NEW.quantidade   -- pode ser negativo
             else -NEW.quantidade                   -- enviado
           end;
  update producao.pallets set saldo = coalesce(saldo,0) + delta where id = NEW.pallet_id;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on producao.pallets
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.movimentos_pallet
  for each row execute function core.set_org_id();
create trigger trg_mov_pallet_aplica after insert on producao.movimentos_pallet
  for each row execute function producao.movimento_pallet_aplica();

alter table producao.pallets           enable row level security;
alter table producao.movimentos_pallet enable row level security;
create policy tenant_isolation on producao.pallets
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on producao.movimentos_pallet
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on producao.pallets           to authenticated;
grant select, insert, update, delete on producao.movimentos_pallet to authenticated;

-- Semeia os três tipos para a org demo.
insert into producao.pallets (org_id, tipo)
select '11111111-1111-1111-1111-111111111111', t
from (values ('chep'),('pbr'),('proprio')) as tt(t)
where not exists (
  select 1 from producao.pallets p
  where p.org_id='11111111-1111-1111-1111-111111111111' and p.tipo=tt.t
);
