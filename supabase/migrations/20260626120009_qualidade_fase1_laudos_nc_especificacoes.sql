-- ============================================================================
-- 0009 — Qualidade Fase 1: Especificações, Laudos internos, Não Conformidades
--         + gate liberar_lote estendido (laudo reprovado / NC aberta)
-- ============================================================================

-- Especificações por produto × cliente (limites de referência dos ensaios)
create table qualidade.especificacoes (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references core.organizacoes(id),
  produto_id      uuid not null references core.produtos(id),
  cliente_id      uuid references core.clientes(id),
  nome            text,
  shelf_life_dias integer,
  versao          integer not null default 1,
  vigente         boolean not null default true,
  created_at      timestamptz not null default now(),
  created_by      uuid references core.usuarios(id)
);
create index on qualidade.especificacoes (produto_id);
create index on qualidade.especificacoes (cliente_id);

create table qualidade.especificacao_parametros (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references core.organizacoes(id),
  especificacao_id uuid not null references qualidade.especificacoes(id) on delete cascade,
  ensaio           text not null,
  limite_min       numeric,
  limite_max       numeric,
  unidade          text,
  metodologia      text,
  ordem            integer not null default 0
);
create index on qualidade.especificacao_parametros (especificacao_id);

-- Laudos internos físico-químicos por lote (registro append-only)
create table qualidade.laudos_internos (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references core.organizacoes(id),
  numero           integer,
  lote_id          uuid not null references producao.lotes(id),
  produto_id       uuid not null references core.produtos(id),
  especificacao_id uuid references qualidade.especificacoes(id),
  conforme         boolean not null default true,
  data_fabricacao  date,
  data_validade    date,
  shelf_life_dias  integer,
  observacao       text,
  emitido_por      uuid references core.funcionarios(id),
  emitido_em       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  created_by       uuid references core.usuarios(id)
);
create index on qualidade.laudos_internos (lote_id);

create table qualidade.laudo_resultados (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  laudo_id    uuid not null references qualidade.laudos_internos(id) on delete cascade,
  ensaio      text not null,
  resultado   numeric,
  texto       text,
  unidade     text,
  limite_min  numeric,
  limite_max  numeric,
  conforme    boolean not null default true,
  ordem       integer not null default 0
);
create index on qualidade.laudo_resultados (laudo_id);

-- Não Conformidades (RNC / Notificação de Ocorrência) — workflow editável
create table qualidade.nao_conformidades (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references core.organizacoes(id),
  numero              integer,
  tipo                text not null default 'rnc'
                        check (tipo in ('rnc','notificacao_ocorrencia')),
  origem              text not null
                        check (origem in ('ocorrencia_interna','fornecedor','sac','auditoria_interna',
                                          'auditoria_externa','cliente','analise_risco','desvio_pcc','outras')),
  reincidencia_de     integer,
  lote_id             uuid references producao.lotes(id),
  fornecedor_id       uuid references core.fornecedores(id),
  cliente_id          uuid references core.clientes(id),
  ponto_controle_codigo text references qualidade.pontos_controle(codigo),
  descricao           text not null,
  qtd_nao_conforme_kg numeric,
  disposicao          text
                        check (disposicao in ('liberar','retrabalhar','segregar','devolver','descartar')),
  causa_raiz          jsonb,
  status              text not null default 'aberta'
                        check (status in ('aberta','em_andamento','concluida','eficacia_pendente')),
  eficacia            text check (eficacia in ('eficaz','ineficaz','na')),
  emitente_id         uuid references core.funcionarios(id),
  aberta_em           timestamptz not null default now(),
  encerrada_em        timestamptz,
  created_at          timestamptz not null default now(),
  created_by          uuid references core.usuarios(id)
);
create index on qualidade.nao_conformidades (lote_id);
create index on qualidade.nao_conformidades (org_id, status);

create table qualidade.nc_correcoes (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references core.organizacoes(id),
  nc_id              uuid not null references qualidade.nao_conformidades(id) on delete cascade,
  descricao          text not null,
  responsavel_id     uuid references core.funcionarios(id),
  data_implementacao date,
  status             text not null default 'pendente'
                       check (status in ('pendente','em_andamento','concluida')),
  created_at         timestamptz not null default now(),
  created_by         uuid references core.usuarios(id)
);
create index on qualidade.nc_correcoes (nc_id);

-- Triggers: org_id + numero sequencial por org
create trigger trg_set_org_id before insert on qualidade.especificacoes
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.especificacao_parametros
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.laudos_internos
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.laudo_resultados
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.nao_conformidades
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on qualidade.nc_correcoes
  for each row execute function core.set_org_id();

create or replace function qualidade.set_laudo_numero()
returns trigger language plpgsql security definer set search_path = qualidade, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from qualidade.laudos_internos where org_id = NEW.org_id;
  end if;
  return NEW;
end; $$;
create trigger trg_zz_laudo_numero before insert on qualidade.laudos_internos
  for each row execute function qualidade.set_laudo_numero();

create or replace function qualidade.set_nc_numero()
returns trigger language plpgsql security definer set search_path = qualidade, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from qualidade.nao_conformidades where org_id = NEW.org_id;
  end if;
  return NEW;
end; $$;
create trigger trg_zz_nc_numero before insert on qualidade.nao_conformidades
  for each row execute function qualidade.set_nc_numero();

-- RLS + grants
alter table qualidade.especificacoes          enable row level security;
alter table qualidade.especificacao_parametros enable row level security;
alter table qualidade.laudos_internos          enable row level security;
alter table qualidade.laudo_resultados         enable row level security;
alter table qualidade.nao_conformidades        enable row level security;
alter table qualidade.nc_correcoes             enable row level security;

create policy tenant_isolation on qualidade.especificacoes
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.especificacao_parametros
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.nao_conformidades
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on qualidade.nc_correcoes
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

create policy append_select on qualidade.laudos_internos for select using (org_id = core.current_org());
create policy append_insert on qualidade.laudos_internos for insert with check (org_id = core.current_org());
create policy append_select on qualidade.laudo_resultados for select using (org_id = core.current_org());
create policy append_insert on qualidade.laudo_resultados for insert with check (org_id = core.current_org());

grant select, insert, update, delete on qualidade.especificacoes to authenticated;
grant select, insert, update, delete on qualidade.especificacao_parametros to authenticated;
grant select, insert, update, delete on qualidade.nao_conformidades to authenticated;
grant select, insert, update, delete on qualidade.nc_correcoes to authenticated;
grant select, insert on qualidade.laudos_internos to authenticated;
grant select, insert on qualidade.laudo_resultados to authenticated;
revoke update, delete on qualidade.laudos_internos from authenticated;
revoke update, delete on qualidade.laudo_resultados from authenticated;

-- Gate estendido: barra liberação com laudo reprovado OU NC aberta no lote
create or replace function public.liberar_lote(p_lote_id uuid)
returns void
language plpgsql
security invoker
set search_path = qualidade, producao, core, public
as $$
declare
  v_nao_conformes integer;
  v_laudos_reprovados integer;
  v_nc_abertas integer;
begin
  if not exists (
    select 1 from producao.lotes
     where id = p_lote_id and org_id = core.current_org() and status = 'aguardando_liberacao'
  ) then
    raise exception 'Lote não encontrado, sem permissão ou não está aguardando liberação.';
  end if;

  select count(*) into v_nao_conformes
    from qualidade.monitoramentos
   where lote_id = p_lote_id and org_id = core.current_org() and conforme = false;
  if v_nao_conformes > 0 then
    raise exception 'Há % monitoramento(s) não conforme(s). Resolva os desvios antes de liberar.', v_nao_conformes;
  end if;

  select count(*) into v_laudos_reprovados
    from qualidade.laudos_internos
   where lote_id = p_lote_id and org_id = core.current_org() and conforme = false;
  if v_laudos_reprovados > 0 then
    raise exception 'Há % laudo(s) reprovado(s) para este lote.', v_laudos_reprovados;
  end if;

  select count(*) into v_nc_abertas
    from qualidade.nao_conformidades
   where lote_id = p_lote_id and org_id = core.current_org() and status <> 'concluida';
  if v_nc_abertas > 0 then
    raise exception 'Há % não conformidade(s) em aberto ligada(s) a este lote.', v_nc_abertas;
  end if;

  update producao.lotes set status = 'liberado'
   where id = p_lote_id and org_id = core.current_org();
end;
$$;

grant execute on function public.liberar_lote(uuid) to authenticated;
