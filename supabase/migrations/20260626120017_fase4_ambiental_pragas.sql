-- ============================================================================
-- 0017 — Fase 4: Monitoramento ambiental & pragas (pontos + resultados)
-- ============================================================================
create table qualidade.pontos_amostragem (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  patogeno      text,
  area          text not null,
  ponto_numero  text,
  zona          text,
  metodo_limpeza text,
  frequencia    text,
  descricao     text,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create index on qualidade.pontos_amostragem (org_id);

create table qualidade.monitoramento_ambiental (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  ponto_id       uuid not null references qualidade.pontos_amostragem(id),
  matriz         text not null default 'superficie' check (matriz in ('superficie','ar','agua')),
  ensaio         text,
  enviado_em     date not null default current_date,
  proxima_em     date,
  resultado      text,
  limite         text,
  conforme       boolean not null default true,
  responsavel_id uuid references core.funcionarios(id),
  registrado_em  timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on qualidade.monitoramento_ambiental (ponto_id, enviado_em);

create trigger trg_set_org_id before insert on qualidade.pontos_amostragem
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.monitoramento_ambiental
  for each row execute function core.set_org_id();

alter table qualidade.pontos_amostragem        enable row level security;
alter table qualidade.monitoramento_ambiental  enable row level security;

create policy tenant_isolation on qualidade.pontos_amostragem
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy append_select on qualidade.monitoramento_ambiental for select using (org_id = core.current_org());
create policy append_insert on qualidade.monitoramento_ambiental for insert with check (org_id = core.current_org());

grant select, insert, update, delete on qualidade.pontos_amostragem to authenticated;
grant select, insert on qualidade.monitoramento_ambiental to authenticated;
revoke update, delete on qualidade.monitoramento_ambiental from authenticated;
