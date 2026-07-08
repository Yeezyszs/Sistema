-- ============================================================================
-- 0023 — PCP: Apontamento & Rendimento (núcleo MES)
--   O apontamento é a FONTE ÚNICA do "real". Ao apontar, o sistema:
--   1) vincula automaticamente à programação (mesma data/turno/linha/produto)
--   2) sincroniza producao.programacao.real_kg = soma dos apontamentos
-- ============================================================================
create table producao.apontamentos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  data           date not null,
  turno          text not null check (turno in ('1t','2t')),
  linha_id       uuid references producao.linhas(id),
  produto_id     uuid references core.produtos(id),
  lote_id        uuid references producao.lotes(id),
  programacao_id uuid references producao.programacao(id),
  quantidade_kg  numeric,
  raiz_kg        numeric,
  rendimento     numeric,
  operador_id    uuid references core.funcionarios(id),
  observacao     text,
  apontado_em    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.apontamentos (org_id, data);
create index on producao.apontamentos (programacao_id);
create index on producao.apontamentos (lote_id);

create trigger trg_set_org_id before insert on producao.apontamentos
  for each row execute function core.set_org_id();

create or replace function producao.apontamento_prepara()
returns trigger language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.programacao_id is null and NEW.produto_id is not null then
    select id into NEW.programacao_id from producao.programacao pr
     where pr.org_id = NEW.org_id and pr.data = NEW.data and pr.turno = NEW.turno
       and pr.produto_id = NEW.produto_id
       and (NEW.linha_id is null or pr.linha_id = NEW.linha_id)
     limit 1;
  end if;
  if NEW.rendimento is null and NEW.quantidade_kg is not null and NEW.raiz_kg is not null and NEW.raiz_kg > 0 then
    NEW.rendimento := round(NEW.quantidade_kg / NEW.raiz_kg, 4);
  end if;
  return NEW;
end; $$;
create trigger trg_zz_apont_prepara before insert on producao.apontamentos
  for each row execute function producao.apontamento_prepara();

create or replace function producao.apontamento_sync_real()
returns trigger language plpgsql security definer set search_path = producao, public as $$
declare v_prog uuid;
begin
  v_prog := coalesce(NEW.programacao_id, OLD.programacao_id);
  if v_prog is not null then
    update producao.programacao p
       set real_kg = (select sum(a.quantidade_kg) from producao.apontamentos a where a.programacao_id = v_prog)
     where p.id = v_prog;
  end if;
  return null;
end; $$;
create trigger trg_apont_sync after insert or update or delete on producao.apontamentos
  for each row execute function producao.apontamento_sync_real();

alter table producao.apontamentos enable row level security;
create policy tenant_isolation on producao.apontamentos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on producao.apontamentos to authenticated;
