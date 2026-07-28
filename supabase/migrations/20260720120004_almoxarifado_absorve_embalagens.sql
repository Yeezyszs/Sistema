-- ============================================================================
-- Almoxarifado (Fase 2) — absorve as embalagens.
--   Move producao.embalagens/movimentos_embalagem para almox_itens/almox_movimentos
--   (preservando os IDs), religa o consumo automático de bags e remove as
--   tabelas antigas. A baixa automática na produção é preservada.
-- ============================================================================

-- 1. Estende o almoxarifado para acomodar embalagens.
alter table producao.almox_itens drop constraint almox_itens_categoria_check;
alter table producao.almox_itens add constraint almox_itens_categoria_check
  check (categoria in ('pecas_manutencao','limpeza_higiene','epi','embalagem'));
alter table producao.almox_itens add column if not exists capacidade_kg numeric;

alter table producao.almox_movimentos drop constraint almox_movimentos_tipo_check;
alter table producao.almox_movimentos add constraint almox_movimentos_tipo_check
  check (tipo in ('entrada','saida','ajuste','consumo'));
alter table producao.almox_movimentos add column if not exists lote_id uuid references producao.lotes(id) on delete set null;
alter table producao.almox_movimentos add column if not exists origem text;

-- 2. Gatilho de saldo passa a tratar 'consumo' como baixa.
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
  elsif new.tipo in ('saida','consumo') then
    update producao.almox_itens set saldo = v_saldo - new.quantidade where id = new.item_id;
  else -- ajuste: quantidade com sinal
    update producao.almox_itens set saldo = v_saldo + new.quantidade where id = new.item_id;
  end if;
  return new;
end $$;

-- 3. Migra o catálogo de embalagens (mesmos IDs; saldo copiado direto).
insert into producao.almox_itens
  (id, org_id, codigo, nome, categoria, unidade, estoque_minimo, localizacao, saldo, custo_medio, capacidade_kg, ativo, created_at, created_by)
select id, org_id, null, nome, 'embalagem', unidade, coalesce(estoque_minimo, 0), null,
       coalesce(saldo, 0), 0, capacidade_kg, ativo, created_at, created_by
from producao.embalagens;

-- 4. Migra o histórico de movimentos (gatilho de saldo desligado — saldo já veio pronto).
alter table producao.almox_movimentos disable trigger trg_almox_movimento;
insert into producao.almox_movimentos
  (id, org_id, item_id, tipo, quantidade, valor_unitario, setor, solicitante, fornecedor, nota_fiscal, observacao, lote_id, origem, data, created_at, created_by)
select id, org_id, embalagem_id, tipo, quantidade, null, null, null, null, null, observacao, lote_id, origem, data, created_at, created_by
from producao.movimentos_embalagem;
alter table producao.almox_movimentos enable trigger trg_almox_movimento;

-- 5. Religa o consumo automático de bags para o almoxarifado.
create or replace function producao.posicao_consome_embalagem() returns trigger
language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.embalagem_id is not null and NEW.qtd_bags is not null and NEW.qtd_bags > 0 then
    insert into producao.almox_movimentos(org_id, item_id, tipo, quantidade, origem, lote_id)
      values (NEW.org_id, NEW.embalagem_id, 'consumo', NEW.qtd_bags, 'Alocação em estoque', NEW.lote_id);
  end if;
  return NEW;
end $$;

-- 6. Aponta a FK de posicoes_estoque para o almoxarifado (IDs preservados).
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'producao.posicoes_estoque'::regclass
     and confrelid = 'producao.embalagens'::regclass;
  if c is not null then execute format('alter table producao.posicoes_estoque drop constraint %I', c); end if;
end $$;
alter table producao.posicoes_estoque
  add constraint posicoes_estoque_embalagem_id_fkey
  foreign key (embalagem_id) references producao.almox_itens(id) on delete set null;

-- 7. Remove as tabelas e a função antigas.
drop table producao.movimentos_embalagem;
drop table producao.embalagens;
drop function if exists producao.movimento_embalagem_aplica();
