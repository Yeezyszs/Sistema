-- ============================================================================
-- 0025 — ERP: Pedidos (Clientes). 1 tabela com cliente FK (mata as 42 abas).
--   Dois estados independentes: status (aprovação) e situacao (atendimento).
--   valor_total_rs é coluna gerada = valor_rs * peso_carga_kg.
-- ============================================================================
create table producao.pedidos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  numero         integer,
  cliente_id     uuid references core.clientes(id),
  produto_id     uuid references core.produtos(id),
  lote_id        uuid references producao.lotes(id),
  status         text not null default 'pendente' check (status in ('pendente','aprovado','cancelado')),
  situacao       text not null default 'pendente' check (situacao in ('pendente','parcial','completo','carregado')),
  data           date not null default current_date,
  destino        text,
  observacoes    text,
  valor_rs       numeric,
  peso_carga_kg  numeric,
  valor_total_rs numeric generated always as (valor_rs * peso_carga_kg) stored,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.pedidos (org_id, data);
create index on producao.pedidos (cliente_id);
create index on producao.pedidos (lote_id);

create or replace function producao.set_pedido_numero()
returns trigger language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from producao.pedidos where org_id = NEW.org_id;
  end if;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on producao.pedidos
  for each row execute function core.set_org_id();
create trigger trg_zz_pedido_numero before insert on producao.pedidos
  for each row execute function producao.set_pedido_numero();

alter table producao.pedidos enable row level security;
create policy tenant_isolation on producao.pedidos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on producao.pedidos to authenticated;
