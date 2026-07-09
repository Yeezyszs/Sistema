-- ============================================================================
-- 0029 — ERP/Qualidade: Reprocesso (fluxo próprio com destino).
--   Registra lote/qtd que vai para reprocesso, motivo, origem e destino
--   (producao/descarte). Status pendente → resolvido. Liga opcionalmente na NC.
-- ============================================================================
create table producao.reprocessos (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  numero        integer,
  lote_id       uuid references producao.lotes(id) on delete set null,
  produto_id    uuid references core.produtos(id),
  qtd_bags      numeric,
  quantidade_kg numeric,
  motivo        text not null,
  origem        text,                     -- de onde veio (linha, estoque, cliente)
  nc_id         uuid references qualidade.nao_conformidades(id) on delete set null,
  status        text not null default 'pendente' check (status in ('pendente','resolvido')),
  destino       text check (destino in ('producao','descarte')),
  data          date not null default current_date,
  resolvido_em  date,
  observacao    text,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create index on producao.reprocessos (org_id, data);
create index on producao.reprocessos (lote_id);

create or replace function producao.set_reprocesso_numero()
returns trigger language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from producao.reprocessos where org_id = NEW.org_id;
  end if;
  -- carimba a data de resolução quando muda para resolvido.
  if NEW.status = 'resolvido' and NEW.resolvido_em is null then
    NEW.resolvido_em := current_date;
  end if;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on producao.reprocessos
  for each row execute function core.set_org_id();
create trigger trg_zz_reprocesso_numero before insert or update on producao.reprocessos
  for each row execute function producao.set_reprocesso_numero();

alter table producao.reprocessos enable row level security;
create policy tenant_isolation on producao.reprocessos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on producao.reprocessos to authenticated;
