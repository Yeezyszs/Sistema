-- ============================================================================
-- 0039 — PCM F2: Ordens de Serviço completas (estrutura atual do PCM).
--   tipo: Corretiva/Corretiva Programada/Preventiva/Inspeção de Rota/melhoria
--   natureza ("Demanda"): Predial/Elétrica/Mecânica
--   prioridade: Baixa/Normal/Urgente/Emergente · status: Em Aberto/Concluído
--   Paradas de equipamento e de produção em colunas próprias.
--   os_execucoes: checklist de execução (1 linha por mantenedor).
-- ============================================================================
create table manutencao.ordens (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  numero      integer,
  data        date not null default current_date,
  hora        text,
  req         text,           -- requisitante
  setor       text,
  tipo        text check (tipo in ('Corretiva','Corretiva Programada','Preventiva','Inspeção de Rota','melhoria')),
  natureza    text check (natureza in ('Predial','Elétrica','Mecânica')),
  descricao   text,
  prioridade  text check (prioridade in ('Baixa','Normal','Urgente','Emergente')),
  data_prog   date,
  data_concl  date,
  realizado   text,           -- o que foi feito
  exec        text,           -- lista de mantenedores (retrocompat)
  status      text not null default 'Em Aberto' check (status in ('Em Aberto','Concluído')),
  -- Parada de equipamento
  parada_equip       boolean not null default false,
  parada_equip_ini   date,
  parada_equip_ini_h text,
  parada_equip_ret   date,
  parada_equip_ret_h text,
  -- Parada de produção
  parada_prod        boolean not null default false,
  parada_prod_ini    date,
  parada_prod_ini_h  text,
  parada_prod_ret    date,
  parada_prod_ret_h  text,
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);
create index on manutencao.ordens (org_id, status);
create index on manutencao.ordens (org_id, data desc);

create table manutencao.os_execucoes (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  os_id      uuid not null references manutencao.ordens(id) on delete cascade,
  mantenedor text,
  data_exec  date,
  hora_ini   text,
  data_fim   date,
  hora_fim   text,
  data_fech  date,
  assinatura text,
  created_at timestamptz not null default now()
);
create index on manutencao.os_execucoes (os_id);

create or replace function manutencao.set_ordem_pcm_numero()
returns trigger language plpgsql security definer set search_path = manutencao, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from manutencao.ordens where org_id = NEW.org_id;
  end if;
  -- carimba a conclusão quando o status muda para Concluído.
  if NEW.status = 'Concluído' and NEW.data_concl is null then
    NEW.data_concl := current_date;
  end if;
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on manutencao.ordens
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on manutencao.os_execucoes
  for each row execute function core.set_org_id();
create trigger trg_zz_ordem_pcm_numero before insert or update on manutencao.ordens
  for each row execute function manutencao.set_ordem_pcm_numero();

alter table manutencao.ordens       enable row level security;
alter table manutencao.os_execucoes enable row level security;
create policy tenant_isolation on manutencao.ordens
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on manutencao.os_execucoes
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on manutencao.ordens       to authenticated;
grant select, insert, update, delete on manutencao.os_execucoes to authenticated;
