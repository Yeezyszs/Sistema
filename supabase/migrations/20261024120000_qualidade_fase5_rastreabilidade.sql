-- ============================================================================
-- Qualidade, fase 5: rastreabilidade (FOR POP 08 1.6).
--
--   producao.lote_bags — cada bag que saiu do ensaque: nº, horário de saída,
--     peso, lacre. É o horário que liga o bag à carga de mandioca: a carga
--     alimenta o ensaque a partir de "início da descarga + atraso" até a
--     próxima carga assumir.
--   qualidade.testes_rastreabilidade — o teste periódico: horários do
--     rastreio interno e do recolhimento com o cliente, kg e eficácia.
-- ============================================================================
create table if not exists producao.lote_bags (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  lote_id    uuid not null references producao.lotes(id) on delete cascade,
  numero     int not null,
  saiu_em    timestamptz not null,
  peso_kg    numeric,
  lacre      text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (lote_id, numero)
);
create index if not exists lote_bags_lote on producao.lote_bags (lote_id, saiu_em);
alter table producao.lote_bags enable row level security;
create policy tenant_isolation on producao.lote_bags
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create trigger trg_set_org_id before insert on producao.lote_bags
  for each row execute function core.set_org_id();
grant select, insert, update, delete on producao.lote_bags to authenticated;
alter publication supabase_realtime add table producao.lote_bags;

create table if not exists qualidade.testes_rastreabilidade (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references core.organizacoes(id),
  lote_id             uuid not null references producao.lotes(id),
  data                date not null default current_date,
  inicio_rastreio     time,
  fim_rastreio        time,
  cliente             text,
  contato_em          time,
  resposta_em         time,
  kg_vendido          numeric,
  kg_no_cliente       numeric,
  kg_recuperavel      numeric,
  conclusao           text,
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid()
);
alter table qualidade.testes_rastreabilidade enable row level security;
create policy tenant_isolation on qualidade.testes_rastreabilidade
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create trigger trg_set_org_id before insert on qualidade.testes_rastreabilidade
  for each row execute function core.set_org_id();
grant select, insert, update, delete on qualidade.testes_rastreabilidade to authenticated;
alter publication supabase_realtime add table qualidade.testes_rastreabilidade;
