-- ============================================================================
-- Qualidade, fase 3: retidos, resíduos e tipo 2 num registro só
-- (FOR-PQSA 08 1.2 Controle de retidos + 1.3 Controle de resíduos).
--
--   destino     — reprocesso | residuo | tipo2 (antes: producao | descarte).
--   produto_texto / lote_codigo — como a planilha anota ("Farinha Crua P.16",
--                 "MK2659"); lote_id continua sendo preenchido quando o lote
--                 existe no sistema.
--   validade    — data + shelf life (anos), calculada se vier vazia.
--   lote_final_id — o lote que recebeu o retido: rastreio de ida e volta.
--   desvios.reprocessa — false bloqueia destino reprocesso (RF-MESCL-003).
-- ============================================================================
alter table producao.reprocessos
  add column if not exists turno               text,
  add column if not exists embalagem           text,
  add column if not exists produto_texto       text,
  add column if not exists lote_codigo         text,
  add column if not exists shelf_life_anos     numeric not null default 1,
  add column if not exists validade            date,
  add column if not exists colaborador_lab     text,
  add column if not exists data_reprocesso     date,
  add column if not exists horario_diluicao    time,
  add column if not exists turno_reprocesso    text,
  add column if not exists colaborador_secagem text,
  add column if not exists lote_final_id       uuid references producao.lotes(id) on delete set null,
  add column if not exists importado           boolean not null default false;

alter table producao.reprocessos drop constraint if exists reprocessos_destino_check;
update producao.reprocessos set destino = 'reprocesso' where destino = 'producao';
update producao.reprocessos set destino = 'residuo'    where destino = 'descarte';
update producao.reprocessos set destino = 'reprocesso' where destino is null;
alter table producao.reprocessos alter column destino set default 'reprocesso';
alter table producao.reprocessos add constraint reprocessos_destino_check
  check (destino in ('reprocesso', 'residuo', 'tipo2'));

create index if not exists reprocessos_lote_final on producao.reprocessos (lote_final_id);

alter table producao.desvios add column if not exists reprocessa boolean not null default true;
update producao.desvios set reprocessa = false where codigo = 'RF-MESCL-003';

create or replace function producao.reprocesso_regras()
returns trigger language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.validade is null and NEW.data is not null then
    NEW.validade := (NEW.data + make_interval(months => round(coalesce(NEW.shelf_life_anos, 1) * 12)::int))::date;
  end if;
  if NEW.destino = 'reprocesso' and NEW.desvio_id is not null
     and exists (select 1 from producao.desvios d where d.id = NEW.desvio_id and not d.reprocessa) then
    raise exception 'Este desvio não pode ser reprocessado — destine a Tipo 2 ou Resíduo.' using errcode = '23514';
  end if;
  return NEW;
end $$;
drop trigger if exists trg_reprocesso_regras on producao.reprocessos;
create trigger trg_reprocesso_regras before insert or update on producao.reprocessos
  for each row execute function producao.reprocesso_regras();
