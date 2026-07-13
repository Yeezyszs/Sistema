-- ============================================================================
-- 0030 — Qualidade: Acompanhamento de Processo (análise por bag).
--   Núcleo do laboratório: cada análise é de um bag de um lote, avaliada contra
--   a especificação vigente do cliente/produto. Os valores por ensaio ficam em
--   uma tabela filha (flexível: cada cliente tem parâmetros diferentes).
--   Substitui as planilhas/pastas separadas por cliente.
-- ============================================================================
create table qualidade.analises_processo (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references core.organizacoes(id),
  numero           integer,
  data             date not null default current_date,
  horario          time,
  turno            text,
  produto_id       uuid references core.produtos(id),
  cliente_id       uuid references core.clientes(id),
  lote_id          uuid references producao.lotes(id) on delete set null,
  especificacao_id uuid references qualidade.especificacoes(id),
  numero_bag       text,
  cor              text,
  odor             text,
  aparencia        text,
  conforme         boolean not null default true,
  motivo           text,
  observacao       text,
  created_at       timestamptz not null default now(),
  created_by       uuid references core.usuarios(id)
);
create index on qualidade.analises_processo (org_id, data);
create index on qualidade.analises_processo (lote_id);
create index on qualidade.analises_processo (cliente_id, produto_id);

create table qualidade.analise_processo_valores (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  analise_id  uuid not null references qualidade.analises_processo(id) on delete cascade,
  ensaio      text not null,
  valor       numeric,
  unidade     text,
  limite_min  numeric,   -- snapshot do limite no momento da análise
  limite_max  numeric,
  conforme    boolean,
  ordem       integer not null default 0
);
create index on qualidade.analise_processo_valores (analise_id);

create or replace function qualidade.set_analise_processo_numero()
returns trigger language plpgsql security definer set search_path = qualidade, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from qualidade.analises_processo where org_id = NEW.org_id;
  end if;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on qualidade.analises_processo
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.analise_processo_valores
  for each row execute function core.set_org_id();
create trigger trg_zz_analise_processo_numero before insert on qualidade.analises_processo
  for each row execute function qualidade.set_analise_processo_numero();

alter table qualidade.analises_processo        enable row level security;
alter table qualidade.analise_processo_valores enable row level security;
create policy tenant_isolation on qualidade.analises_processo
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.analise_processo_valores
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on qualidade.analises_processo        to authenticated;
grant select, insert, update, delete on qualidade.analise_processo_valores to authenticated;
