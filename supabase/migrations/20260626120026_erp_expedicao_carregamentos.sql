-- ============================================================================
-- 0026 — ERP: Expedição & Carregamentos. Fecha o ciclo pedido → lote → carga.
--   Ao registrar um carregamento:
--     1) dá BAIXA no estoque (subtrai bags da posição; some quando zera);
--     2) marca o pedido como 'carregado'.
--   Cancelar o carregamento reverte as duas coisas.
-- ============================================================================
create table producao.carregamentos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  numero         integer,
  pedido_id      uuid references producao.pedidos(id),
  lote_id        uuid references producao.lotes(id),
  -- on delete set null: ao dar baixa a posição some, mas a carga mantém histórico.
  posicao_id     uuid references producao.posicoes_estoque(id) on delete set null,
  produto_id     uuid references core.produtos(id),
  cliente_id     uuid references core.clientes(id),
  qtd_bags       numeric,
  peso_kg        numeric,
  placa          text,
  motorista      text,
  transportadora text,
  nota_fiscal    text,
  status         text not null default 'carregado' check (status in ('carregado','cancelado')),
  data           date not null default current_date,
  observacoes    text,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.carregamentos (org_id, data);
create index on producao.carregamentos (pedido_id);
create index on producao.carregamentos (lote_id);

create or replace function producao.set_carregamento_numero()
returns trigger language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from producao.carregamentos where org_id = NEW.org_id;
  end if;
  return NEW;
end; $$;

-- Baixa no estoque + marca pedido carregado (AFTER INSERT de um carregamento ativo).
create or replace function producao.carregamento_efetiva()
returns trigger language plpgsql security definer set search_path = producao, public as $$
declare
  saldo numeric;
begin
  if NEW.status <> 'carregado' then
    return NEW;
  end if;

  -- 1) baixa no estoque: subtrai bags da posição; some quando zera/negativa.
  if NEW.posicao_id is not null then
    select qtd_bags into saldo from producao.posicoes_estoque where id = NEW.posicao_id;
    if saldo is not null and NEW.qtd_bags is not null and (saldo - NEW.qtd_bags) > 0 then
      update producao.posicoes_estoque
         set qtd_bags = qtd_bags - NEW.qtd_bags
       where id = NEW.posicao_id;
    else
      delete from producao.posicoes_estoque where id = NEW.posicao_id;
    end if;
  end if;

  -- 2) marca o pedido como carregado.
  if NEW.pedido_id is not null then
    update producao.pedidos set situacao = 'carregado' where id = NEW.pedido_id;
  end if;

  return NEW;
end; $$;

-- Reverte quando o carregamento é cancelado (status vira 'cancelado').
create or replace function producao.carregamento_cancela()
returns trigger language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.status = 'cancelado' and OLD.status = 'carregado' then
    if NEW.pedido_id is not null then
      update producao.pedidos set situacao = 'completo' where id = NEW.pedido_id and situacao = 'carregado';
    end if;
  end if;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on producao.carregamentos
  for each row execute function core.set_org_id();
create trigger trg_zz_carregamento_numero before insert on producao.carregamentos
  for each row execute function producao.set_carregamento_numero();
create trigger trg_carregamento_efetiva after insert on producao.carregamentos
  for each row execute function producao.carregamento_efetiva();
create trigger trg_carregamento_cancela after update on producao.carregamentos
  for each row execute function producao.carregamento_cancela();

alter table producao.carregamentos enable row level security;
create policy tenant_isolation on producao.carregamentos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on producao.carregamentos to authenticated;
