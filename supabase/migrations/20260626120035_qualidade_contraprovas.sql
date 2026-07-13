-- ============================================================================
-- 0035 — Qualidade: Controle de Contraprovas (FOR-PO06).
--   Caixas de contraprova (amostras de retenção). Política de tempo de retenção
--   por rótulo de cliente/produto; ao vencer o prazo, a caixa fica elegível a
--   descarte. numero_caixa é sequencial por org.
-- ============================================================================

-- Política de retenção (aba "Tempo em Estoque").
create table qualidade.contraprova_retencao (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  rotulo     text not null,      -- ex.: "General Mills - Crua"
  dias       integer not null,   -- tempo de retenção em dias
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id),
  unique (org_id, rotulo)
);

create table qualidade.contraprovas (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  numero_caixa   integer,
  data_lancamento date not null default current_date,
  lotes          text,
  cliente_id     uuid references core.clientes(id),
  retencao_id    uuid references qualidade.contraprova_retencao(id),
  dias_retencao  integer,          -- snapshot do prazo no lançamento
  local_estoque  text not null default 'Laboratório',
  em_estoque     boolean not null default true,
  descartado_em  date,
  observacao     text,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on qualidade.contraprovas (org_id, data_lancamento);

create or replace function qualidade.set_contraprova_numero()
returns trigger language plpgsql security definer set search_path = qualidade, public as $$
begin
  if NEW.numero_caixa is null then
    select coalesce(max(numero_caixa),0)+1 into NEW.numero_caixa from qualidade.contraprovas where org_id = NEW.org_id;
  end if;
  -- ao marcar descarte, carimba a data e tira de estoque.
  if NEW.em_estoque = false and NEW.descartado_em is null then
    NEW.descartado_em := current_date;
  end if;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on qualidade.contraprova_retencao
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.contraprovas
  for each row execute function core.set_org_id();
create trigger trg_zz_contraprova_numero before insert or update on qualidade.contraprovas
  for each row execute function qualidade.set_contraprova_numero();

alter table qualidade.contraprova_retencao enable row level security;
alter table qualidade.contraprovas         enable row level security;
create policy tenant_isolation on qualidade.contraprova_retencao
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.contraprovas
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on qualidade.contraprova_retencao to authenticated;
grant select, insert, update, delete on qualidade.contraprovas         to authenticated;

-- Semeia a tabela de tempo de retenção (aba do FOR-PO06).
insert into qualidade.contraprova_retencao (org_id, rotulo, dias)
select '11111111-1111-1111-1111-111111111111', r.rotulo, r.dias
from (values
  ('General Mills - 5%', 30),
  ('General Mills - Crua', 60),
  ('General Mills - Torrada', 60),
  ('Cassava - Especial', 120),
  ('Cassava - Crua', 60),
  ('Glúten Free', 90),
  ('Agroçales', 60),
  ('Podium', 120),
  ('Pinduca', 90),
  ('Estoque', 60),
  ('Alexandre', 60),
  ('Pirão', 60),
  ('Outros', 60)
) as r(rotulo, dias)
where not exists (
  select 1 from qualidade.contraprova_retencao x
  where x.org_id='11111111-1111-1111-1111-111111111111' and x.rotulo=r.rotulo
);
