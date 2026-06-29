-- ============================================================================
-- 0014 — Fase 4: Manutenção (OS + preventiva) + Calibração de instrumentos
-- ============================================================================
create schema if not exists manutencao;
grant usage on schema manutencao to anon, authenticated;

create table manutencao.ordens_servico (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references core.organizacoes(id),
  numero              integer,
  equipamento_id      uuid references core.equipamentos(id),
  setor_id            uuid references core.setores(id),
  solicitante_id      uuid references core.funcionarios(id),
  executor_id         uuid references core.funcionarios(id),
  tipo                text not null default 'corretiva'
                        check (tipo in ('corretiva','preventiva','solicitacao')),
  prioridade          text not null default 'media' check (prioridade in ('baixa','media','alta')),
  descricao_solicitada text not null,
  descricao_realizada  text,
  status              text not null default 'aberta'
                        check (status in ('aberta','em_execucao','concluida')),
  aberta_em           timestamptz not null default now(),
  concluida_em        timestamptz,
  created_at          timestamptz not null default now(),
  created_by          uuid references core.usuarios(id)
);
create index on manutencao.ordens_servico (org_id, status);

create table manutencao.plano_preventivo (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  equipamento_id uuid references core.equipamentos(id),
  componente    text not null,
  periodicidade text,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create index on manutencao.plano_preventivo (equipamento_id);

create table manutencao.execucoes_preventiva (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  plano_item_id uuid not null references manutencao.plano_preventivo(id),
  realizada_em  date not null default current_date,
  executor_id   uuid references core.funcionarios(id),
  observacao    text,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create index on manutencao.execucoes_preventiva (plano_item_id, realizada_em);

create table qualidade.instrumentos (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references core.organizacoes(id),
  codigo             text not null,
  nome               text not null,
  equipamento_id     uuid references core.equipamentos(id),
  faixa              text,
  criterio_aceitacao text,
  ativo              boolean not null default true,
  created_at         timestamptz not null default now(),
  created_by         uuid references core.usuarios(id)
);

create table qualidade.calibracoes (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references core.organizacoes(id),
  instrumento_id     uuid not null references qualidade.instrumentos(id),
  tipo               text not null default 'calibracao'
                       check (tipo in ('calibracao','verificacao','phmetro')),
  calibrado_em       date not null,
  valido_ate         date,
  empresa            text,
  certificado_numero text,
  incerteza          text,
  conforme           boolean not null default true,
  observacao         text,
  anexo_url          text,
  registrado_em      timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  created_by         uuid references core.usuarios(id)
);
create index on qualidade.calibracoes (instrumento_id, calibrado_em);

create or replace function manutencao.set_os_numero()
returns trigger language plpgsql security definer set search_path = manutencao, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from manutencao.ordens_servico where org_id = NEW.org_id;
  end if;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on manutencao.ordens_servico
  for each row execute function core.set_org_id();
create trigger trg_zz_os_numero before insert on manutencao.ordens_servico
  for each row execute function manutencao.set_os_numero();
create trigger trg_set_org_id before insert on manutencao.plano_preventivo
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on manutencao.execucoes_preventiva
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.instrumentos
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.calibracoes
  for each row execute function core.set_org_id();

alter table manutencao.ordens_servico      enable row level security;
alter table manutencao.plano_preventivo    enable row level security;
alter table manutencao.execucoes_preventiva enable row level security;
alter table qualidade.instrumentos          enable row level security;
alter table qualidade.calibracoes           enable row level security;

create policy tenant_isolation on manutencao.ordens_servico
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on manutencao.plano_preventivo
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.instrumentos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

create policy append_select on manutencao.execucoes_preventiva for select using (org_id = core.current_org());
create policy append_insert on manutencao.execucoes_preventiva for insert with check (org_id = core.current_org());
create policy append_select on qualidade.calibracoes for select using (org_id = core.current_org());
create policy append_insert on qualidade.calibracoes for insert with check (org_id = core.current_org());

grant select, insert, update, delete on manutencao.ordens_servico to authenticated;
grant select, insert, update, delete on manutencao.plano_preventivo to authenticated;
grant select, insert, update, delete on qualidade.instrumentos to authenticated;
grant select, insert on manutencao.execucoes_preventiva to authenticated;
grant select, insert on qualidade.calibracoes to authenticated;
revoke update, delete on manutencao.execucoes_preventiva from authenticated;
revoke update, delete on qualidade.calibracoes from authenticated;

alter role authenticator set pgrst.db_schemas = 'public, graphql_public, core, producao, qualidade, manutencao';
notify pgrst, 'reload config';
