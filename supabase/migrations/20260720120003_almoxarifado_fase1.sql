-- ============================================================================
-- Almoxarifado (Fase 1) — estoque de consumíveis (peças, limpeza, EPI).
--   almox_itens: cadastro + saldo e custo médio (mantidos por gatilho).
--   almox_movimentos: entrada / saída (requisição) / ajuste — append-only.
-- ============================================================================
create table producao.almox_itens (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  codigo         text,
  nome           text not null,
  categoria      text not null check (categoria in ('pecas_manutencao','limpeza_higiene','epi')),
  unidade        text not null default 'un',
  estoque_minimo numeric not null default 0,
  localizacao    text,
  saldo          numeric not null default 0,     -- mantido por gatilho
  custo_medio    numeric not null default 0,     -- mantido por gatilho (média ponderada)
  ativo          boolean not null default true,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.almox_itens (org_id, categoria);

create table producao.almox_movimentos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  item_id        uuid not null references producao.almox_itens(id) on delete cascade,
  tipo           text not null check (tipo in ('entrada','saida','ajuste')),
  quantidade     numeric not null,               -- ajuste: valor com sinal (+/-)
  valor_unitario numeric,                         -- entrada: custo de compra
  setor          text,                            -- saída: setor requisitante
  solicitante    text,                            -- saída: quem retirou
  fornecedor     text,                            -- entrada
  nota_fiscal    text,                            -- entrada
  observacao     text,
  data           date not null default current_date,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.almox_movimentos (org_id, item_id, data);

-- Gatilho: aplica o movimento ao saldo e ao custo médio do item.
create or replace function producao.almox_aplicar_movimento() returns trigger
language plpgsql security definer set search_path = producao, core as $$
declare v_saldo numeric; v_custo numeric; v_novo numeric;
begin
  select saldo, custo_medio into v_saldo, v_custo from producao.almox_itens where id = new.item_id for update;
  if new.tipo = 'entrada' then
    v_novo := v_saldo + new.quantidade;
    if new.valor_unitario is not null and v_novo > 0 then
      v_custo := (v_saldo * v_custo + new.quantidade * new.valor_unitario) / v_novo;
    end if;
    update producao.almox_itens set saldo = v_novo, custo_medio = v_custo where id = new.item_id;
  elsif new.tipo = 'saida' then
    update producao.almox_itens set saldo = v_saldo - new.quantidade where id = new.item_id;
  else -- ajuste: quantidade com sinal
    update producao.almox_itens set saldo = v_saldo + new.quantidade where id = new.item_id;
  end if;
  return new;
end $$;

create trigger trg_almox_movimento after insert on producao.almox_movimentos
  for each row execute function producao.almox_aplicar_movimento();

do $$
declare t text;
begin
  foreach t in array array['almox_itens','almox_movimentos'] loop
    execute format('create trigger trg_set_org_id before insert on producao.%I for each row execute function core.set_org_id()', t);
    execute format('alter table producao.%I enable row level security', t);
    execute format('create policy tenant_isolation on producao.%I for all using (org_id = core.current_org()) with check (org_id = core.current_org())', t);
    execute format('grant select, insert, update, delete on producao.%I to authenticated', t);
  end loop;
end $$;
