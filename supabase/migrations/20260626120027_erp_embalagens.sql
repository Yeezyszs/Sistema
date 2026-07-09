-- ============================================================================
-- 0027 — ERP: Embalagens (estoque + consumo automático).
--   Catálogo de material de embalagem (big bag, sacaria 25kg, bag 24un...) com
--   saldo. Movimentos entrada/saída/consumo/ajuste ajustam o saldo por trigger.
--   Consumo automático: ao alocar bags cheios no estoque (posicoes_estoque com
--   embalagem_id), gera um movimento 'consumo' = qtd de bags.
-- ============================================================================
create table producao.embalagens (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  nome           text not null,
  tipo           text,                       -- ex.: big bag, saco, bag
  capacidade_kg  numeric,                    -- kg por unidade de embalagem
  unidade        text not null default 'un',
  saldo          numeric not null default 0, -- mantido pelos movimentos
  estoque_minimo numeric,                    -- dispara alerta quando saldo < min
  ativo          boolean not null default true,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.embalagens (org_id);

create table producao.movimentos_embalagem (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references core.organizacoes(id),
  embalagem_id uuid not null references producao.embalagens(id) on delete cascade,
  tipo         text not null check (tipo in ('entrada','saida','consumo','ajuste')),
  quantidade   numeric not null,
  origem       text,                         -- nota fiscal, alocação, etc.
  lote_id      uuid references producao.lotes(id) on delete set null,
  data         date not null default current_date,
  observacao   text,
  created_at   timestamptz not null default now(),
  created_by   uuid references core.usuarios(id)
);
create index on producao.movimentos_embalagem (embalagem_id, data);

-- Ajusta o saldo da embalagem conforme o tipo de movimento.
create or replace function producao.movimento_embalagem_aplica()
returns trigger language plpgsql security definer set search_path = producao, public as $$
declare
  delta numeric;
begin
  delta := case NEW.tipo
             when 'entrada' then NEW.quantidade
             when 'ajuste'  then NEW.quantidade   -- pode ser negativo p/ correção
             else -NEW.quantidade                 -- saida, consumo
           end;
  update producao.embalagens set saldo = coalesce(saldo,0) + delta where id = NEW.embalagem_id;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on producao.embalagens
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.movimentos_embalagem
  for each row execute function core.set_org_id();
create trigger trg_mov_embalagem_aplica after insert on producao.movimentos_embalagem
  for each row execute function producao.movimento_embalagem_aplica();

-- Consumo automático: bags cheios alocados no estoque consomem embalagem.
alter table producao.posicoes_estoque
  add column embalagem_id uuid references producao.embalagens(id) on delete set null;

create or replace function producao.posicao_consome_embalagem()
returns trigger language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.embalagem_id is not null and NEW.qtd_bags is not null and NEW.qtd_bags > 0 then
    insert into producao.movimentos_embalagem(org_id, embalagem_id, tipo, quantidade, origem, lote_id)
      values (NEW.org_id, NEW.embalagem_id, 'consumo', NEW.qtd_bags, 'Alocação em estoque', NEW.lote_id);
  end if;
  return NEW;
end; $$;

create trigger trg_posicao_consome_embalagem after insert on producao.posicoes_estoque
  for each row execute function producao.posicao_consome_embalagem();

alter table producao.embalagens           enable row level security;
alter table producao.movimentos_embalagem enable row level security;
create policy tenant_isolation on producao.embalagens
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on producao.movimentos_embalagem
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on producao.embalagens           to authenticated;
grant select, insert, update, delete on producao.movimentos_embalagem to authenticated;
