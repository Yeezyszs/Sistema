-- ============================================================================
-- 0005 — Fase 2: trigger org_id automático + schema qualidade + gate liberar_lote
-- ============================================================================

-- Trigger para auto-preencher org_id nas tabelas tenant quando não fornecido
create or replace function core.set_org_id()
returns trigger
language plpgsql
security definer
set search_path = core, public
as $$
begin
  if NEW.org_id is null then
    NEW.org_id := core.current_org();
  end if;
  return NEW;
end;
$$;

create trigger trg_set_org_id before insert on producao.ordens_producao
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.lotes
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.recebimentos
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.consumo_materia_prima
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.etapas_lote
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.movimentos_estoque
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.registros_etapa
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on producao.expedicoes
  for each row execute function core.set_org_id();

alter table producao.etapas_lote
  add constraint etapas_lote_lote_etapa_unique unique (lote_id, etapa_codigo);

-- ----------------------------------------------------------------------------
-- qualidade.pontos_controle — catálogo global (FSSC 22000)
-- ----------------------------------------------------------------------------
create table qualidade.pontos_controle (
  codigo          text primary key,
  nome            text not null,
  tipo            text not null check (tipo in ('ccp', 'prp', 'prpo')),
  etapa_codigo    text references producao.etapas(codigo),
  parametro       text,
  limite_min      numeric,
  limite_max      numeric,
  unidade         text,
  acao_corretiva  text,
  ativo           boolean not null default true,
  ordem           integer not null default 0
);

insert into qualidade.pontos_controle
  (codigo, nome, tipo, etapa_codigo, parametro, limite_min, limite_max, unidade, acao_corretiva, ordem)
values
  ('CCP-01', 'Temperatura de secagem',          'ccp',  'secagem',     'temperatura', 60,   80,   '°C',  'Ajustar temperatura e segregar lote para análise laboratorial.', 1),
  ('CCP-02', 'Umidade do produto ensacado',     'ccp',  'ensaque',     'umidade',     null, 14,   '%',   'Retornar ao secador. Registrar desvio e informar Qualidade.',     2),
  ('PRP-01', 'pH da água de processo',          'prp',  'extracao',    'ph',          6.5,  7.5,  'pH',  'Tratar água e reamostrar antes de reiniciar processo.',          3),
  ('PRP-02', 'Temperatura de armazenagem',      'prp',  null,          'temperatura', null, 25,   '°C',  'Acionar manutenção. Monitorar e segregar se necessário.',        4),
  ('PRPO-01','Controle de pragas (verificação)','prpo', null,           null,          null, null,  null, 'Acionar empresa de controle. Isolar área afetada.',              5);

-- ----------------------------------------------------------------------------
-- qualidade.monitoramentos — registros por lote (append-only, por org)
-- ----------------------------------------------------------------------------
create table qualidade.monitoramentos (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null references core.organizacoes(id),
  lote_id                uuid not null references producao.lotes(id),
  ponto_controle_codigo  text not null references qualidade.pontos_controle(codigo),
  valor                  numeric,
  texto                  text,
  conforme               boolean,
  observacao             text,
  operador_id            uuid references core.funcionarios(id),
  registrado_em          timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  created_by             uuid references core.usuarios(id)
);
create index on qualidade.monitoramentos (lote_id);
create index on qualidade.monitoramentos (org_id, lote_id);

create trigger trg_set_org_id before insert on qualidade.monitoramentos
  for each row execute function core.set_org_id();

alter table qualidade.pontos_controle enable row level security;
alter table qualidade.monitoramentos   enable row level security;

create policy "pc_read"  on qualidade.pontos_controle for select using (true);
create policy "mon_read" on qualidade.monitoramentos  for select to authenticated using (org_id = core.current_org());
create policy "mon_ins"  on qualidade.monitoramentos  for insert to authenticated with check (org_id = core.current_org());
revoke update, delete on qualidade.monitoramentos from authenticated;

grant usage on schema qualidade to authenticated;
grant select on qualidade.pontos_controle to authenticated;
grant select, insert on qualidade.monitoramentos to authenticated;

-- ----------------------------------------------------------------------------
-- Gate de liberação — rejeita lote com monitoramentos não conformes
-- ----------------------------------------------------------------------------
create or replace function public.liberar_lote(p_lote_id uuid)
returns void
language plpgsql
security invoker
set search_path = qualidade, producao, core, public
as $$
declare
  v_nao_conformes integer;
begin
  if not exists (
    select 1 from producao.lotes
     where id = p_lote_id
       and org_id = core.current_org()
       and status = 'aguardando_liberacao'
  ) then
    raise exception 'Lote não encontrado, sem permissão ou não está aguardando liberação.';
  end if;

  select count(*) into v_nao_conformes
    from qualidade.monitoramentos
   where lote_id = p_lote_id
     and org_id = core.current_org()
     and conforme = false;

  if v_nao_conformes > 0 then
    raise exception 'Há % monitoramento(s) não conforme(s). Resolva os desvios antes de liberar.', v_nao_conformes;
  end if;

  update producao.lotes
     set status = 'liberado'
   where id = p_lote_id and org_id = core.current_org();
end;
$$;

grant execute on function public.liberar_lote(uuid) to authenticated;
