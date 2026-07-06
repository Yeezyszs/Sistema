-- ============================================================================
-- 0019 — Recebimentos alinhados ao "CONTROLE DE CARGAS" da descarga
--   renda: passa a ser numérico (rendimento) · rosca → cancha (local descarga)
--   + turno, ticket e numero sequencial por org (nº da carga)
-- ============================================================================
alter table producao.recebimentos rename column rosca to cancha;

alter table producao.recebimentos
  alter column renda type numeric using (nullif(renda::text, '')::numeric);

alter table producao.recebimentos
  add column turno  text check (turno in ('diurno','noturno')),
  add column ticket text,
  add column numero integer;

create or replace function producao.set_recebimento_numero()
returns trigger language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from producao.recebimentos where org_id = NEW.org_id;
  end if;
  return NEW;
end; $$;
create trigger trg_zz_receb_numero before insert on producao.recebimentos
  for each row execute function producao.set_recebimento_numero();

with ordenados as (
  select id, row_number() over (partition by org_id order by recebido_em, created_at) as rn
  from producao.recebimentos where numero is null
)
update producao.recebimentos r set numero = o.rn from ordenados o where r.id = o.id;
