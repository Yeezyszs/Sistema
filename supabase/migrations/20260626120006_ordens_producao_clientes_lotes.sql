-- ============================================================================
-- 0006 — Ordens de Produção (planilha DB_OP) + Clientes + Lotes expandido
--         (planilha Controle de Lotes)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- core.clientes — destino das ordens/lotes (first-class nas planilhas)
-- ----------------------------------------------------------------------------
create table core.clientes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  nome        text not null,
  cnpj        text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id),
  unique (org_id, nome)
);
alter table core.clientes enable row level security;
create policy tenant_isolation on core.clientes
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create trigger trg_set_org_id before insert on core.clientes
  for each row execute function core.set_org_id();
grant select, insert, update, delete on core.clientes to authenticated;

-- ----------------------------------------------------------------------------
-- Expandir producao.ordens_producao para refletir a planilha DB_OP
-- ----------------------------------------------------------------------------
alter table producao.ordens_producao
  add column numero        integer,
  add column pedido        text,
  add column cliente_id    uuid references core.clientes(id),
  add column quantidade    numeric,
  add column embalagem     text,
  add column qtd_embalagem numeric,
  add column peso_min      numeric,
  add column peso_max      numeric,
  add column observacao    text,
  add column reprocessar   boolean not null default false;

-- numero sequencial por organização
create or replace function producao.set_op_numero()
returns trigger
language plpgsql
security definer
set search_path = producao, public
as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero), 0) + 1 into NEW.numero
      from producao.ordens_producao
     where org_id = NEW.org_id;
  end if;
  return NEW;
end;
$$;
-- roda depois do set_org_id (ordem alfabética: trg_set_org_id < trg_zz_op_numero)
create trigger trg_zz_op_numero before insert on producao.ordens_producao
  for each row execute function producao.set_op_numero();

create unique index ordens_producao_org_numero_uq on producao.ordens_producao (org_id, numero);

-- ----------------------------------------------------------------------------
-- Expandir producao.lotes para refletir o Controle de Lotes
-- ----------------------------------------------------------------------------
alter table producao.lotes
  add column pedido            text,
  add column cliente_id        uuid references core.clientes(id),
  add column quantidade        numeric,
  add column volume_texto      text,            -- ex.: "16 Bag's"
  add column data_carregamento date,
  add column data_entrega      date;

create index on producao.lotes (cliente_id);
