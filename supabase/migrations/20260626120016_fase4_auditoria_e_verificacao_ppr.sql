-- ============================================================================
-- 0016 — Fase 4: Auditoria interna + itens + Verificação de PPR
--         Itens NC ao concluir a auditoria → geram NC (origem auditoria_interna)
-- ============================================================================
create table qualidade.auditorias (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references core.organizacoes(id),
  numero       integer,
  norma        text,
  escopo       text,
  unidade      text,
  data         date not null default current_date,
  auditor_id   uuid references core.funcionarios(id),
  status       text not null default 'planejada'
                 check (status in ('planejada','em_andamento','concluida')),
  resultado    text,
  observacao   text,
  created_at   timestamptz not null default now(),
  created_by   uuid references core.usuarios(id)
);
create index on qualidade.auditorias (org_id, status);

create table qualidade.auditoria_itens (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  auditoria_id  uuid not null references qualidade.auditorias(id) on delete cascade,
  clausula      text,
  requisito     text not null,
  classificacao text not null default 'conforme'
                  check (classificacao in ('conforme','nc_critica','nc_maior','nc_menor','na')),
  evidencia     text,
  nc_gerada     boolean not null default false,
  ordem         integer not null default 0
);
create index on qualidade.auditoria_itens (auditoria_id);

create table qualidade.verificacoes_ppr (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references core.organizacoes(id),
  programa        text not null,
  registro_codigo text,
  frequencia      text,
  conforme        boolean not null,
  acao            text,
  responsavel_id  uuid references core.funcionarios(id),
  verificado_em   timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  created_by      uuid references core.usuarios(id)
);
create index on qualidade.verificacoes_ppr (org_id, verificado_em);

create or replace function qualidade.set_auditoria_numero()
returns trigger language plpgsql security definer set search_path = qualidade, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from qualidade.auditorias where org_id = NEW.org_id;
  end if;
  return NEW;
end; $$;

create or replace function qualidade.auditoria_gera_ncs()
returns trigger language plpgsql security invoker set search_path = qualidade, producao, core, public as $$
declare it record;
begin
  if NEW.status = 'concluida' and OLD.status is distinct from 'concluida' then
    for it in
      select * from qualidade.auditoria_itens
       where auditoria_id = NEW.id and classificacao in ('nc_critica','nc_maior','nc_menor') and nc_gerada = false
    loop
      insert into qualidade.nao_conformidades (org_id, tipo, origem, descricao, status)
      values (NEW.org_id, 'rnc', 'auditoria_interna',
        'Auditoria #' || NEW.numero || ' — ' || coalesce(it.clausula || ': ', '') || it.requisito
          || coalesce(' | Evidência: ' || it.evidencia, ''),
        'aberta');
      update qualidade.auditoria_itens set nc_gerada = true where id = it.id;
    end loop;
  end if;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on qualidade.auditorias
  for each row execute function core.set_org_id();
create trigger trg_zz_auditoria_numero before insert on qualidade.auditorias
  for each row execute function qualidade.set_auditoria_numero();
create trigger trg_auditoria_ncs after update on qualidade.auditorias
  for each row execute function qualidade.auditoria_gera_ncs();
create trigger trg_set_org_id before insert on qualidade.auditoria_itens
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.verificacoes_ppr
  for each row execute function core.set_org_id();

alter table qualidade.auditorias        enable row level security;
alter table qualidade.auditoria_itens   enable row level security;
alter table qualidade.verificacoes_ppr  enable row level security;

create policy tenant_isolation on qualidade.auditorias
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.auditoria_itens
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy append_select on qualidade.verificacoes_ppr for select using (org_id = core.current_org());
create policy append_insert on qualidade.verificacoes_ppr for insert with check (org_id = core.current_org());

grant select, insert, update, delete on qualidade.auditorias to authenticated;
grant select, insert, update, delete on qualidade.auditoria_itens to authenticated;
grant select, insert on qualidade.verificacoes_ppr to authenticated;
revoke update, delete on qualidade.verificacoes_ppr from authenticated;
