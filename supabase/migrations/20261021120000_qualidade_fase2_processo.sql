-- ============================================================================
-- Qualidade, fase 2: controles do processo.
--
--   · Forno (FOR PQSA 8): cabeçalho por lote + leituras (temp. saída PCC,
--     temp. entrada, Hz da dosadeira, umidade final PCC, nº embalagem).
--     Os limites vêm de qualidade.pontos_controle (CCP-01 / CCP-02), então a
--     Qualidade ajusta o limite sem mexer no sistema.
--   · Detector de metais (FOR PQSA 11 1.2): NHP, observação, verso de
--     correção e O.S. aberta pela falha.
--   · Ímãs (FOR PQSA 09 1.3): área e ordem dos pontos, NHP, "material no ímã".
--   · Validação da Qualidade nos três: só o perfil qualidade valida, e o banco
--     carimba quem e quando.
-- ============================================================================

-- ── Validação da Qualidade (genérica) ───────────────────────────────────────
create or replace function qualidade.guarda_validacao()
returns trigger language plpgsql security definer set search_path = qualidade, core, public as $$
begin
  if auth.uid() is null then return NEW; end if;
  if NEW.validado_em is distinct from OLD.validado_em then
    if not ('qualidade' = any(core.meus_perfis())) then
      raise exception 'Só a Qualidade pode validar este registro.' using errcode = '42501';
    end if;
    if NEW.validado_em is not null then
      NEW.validado_em  := now();
      NEW.validado_por := (select u.id from core.usuarios u where u.auth_user_id = auth.uid());
    else
      NEW.validado_por := null;
    end if;
  end if;
  return NEW;
end $$;

-- ── Forno ───────────────────────────────────────────────────────────────────
create table if not exists qualidade.forno_registros (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  lote_id       uuid references producao.lotes(id),
  forno         text,
  produto       text,
  peneira       text,
  cliente       text,
  embalagem     text,
  data          date not null default current_date,
  observacao    text,
  validado_em   timestamptz,
  validado_por  uuid references core.usuarios(id),
  created_at    timestamptz not null default now(),
  created_by    uuid default auth.uid()
);
alter table qualidade.forno_registros enable row level security;
drop policy if exists tenant_isolation on qualidade.forno_registros;
create policy tenant_isolation on qualidade.forno_registros
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create trigger trg_set_org_id before insert on qualidade.forno_registros
  for each row execute function core.set_org_id();
create trigger trg_guarda_validacao before update on qualidade.forno_registros
  for each row execute function qualidade.guarda_validacao();
grant select, insert, update, delete on qualidade.forno_registros to authenticated;

create table if not exists qualidade.forno_leituras (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references core.organizacoes(id),
  registro_id     uuid not null references qualidade.forno_registros(id) on delete cascade,
  registrado_em   timestamptz not null default now(),
  temp_saida      numeric,
  temp_entrada    numeric,
  hz_dosadeira    numeric,
  umidade         numeric,
  n_embalagem     text,
  conforme        boolean not null default true,
  acao_corretiva  text,
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid()
);
create index if not exists forno_leituras_registro on qualidade.forno_leituras (registro_id, registrado_em);
alter table qualidade.forno_leituras enable row level security;
drop policy if exists tenant_isolation on qualidade.forno_leituras;
create policy tenant_isolation on qualidade.forno_leituras
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create trigger trg_set_org_id before insert on qualidade.forno_leituras
  for each row execute function core.set_org_id();
grant select, insert, update, delete on qualidade.forno_leituras to authenticated;

-- ── Detector de metais ──────────────────────────────────────────────────────
alter table qualidade.verificacoes_dm
  add column if not exists nhp                   boolean not null default false,
  add column if not exists observacao            text,
  add column if not exists lider_informado       text,
  add column if not exists linha_parada          boolean,
  add column if not exists manutencao_informada  boolean,
  add column if not exists producao_retida       boolean,
  add column if not exists validacao_equipamento boolean,
  add column if not exists responsavel_retencao  text,
  add column if not exists os_id                 uuid references manutencao.ordens(id),
  add column if not exists validado_em           timestamptz,
  add column if not exists validado_por          uuid references core.usuarios(id);
create trigger trg_guarda_validacao before update on qualidade.verificacoes_dm
  for each row execute function qualidade.guarda_validacao();
grant update on qualidade.verificacoes_dm to authenticated;

-- ── Ímãs ────────────────────────────────────────────────────────────────────
alter table qualidade.imas
  add column if not exists area  text,
  add column if not exists ordem int not null default 0;
alter table qualidade.verificacoes_ima
  add column if not exists nhp           boolean not null default false,
  add column if not exists tem_material  boolean,
  add column if not exists validado_em   timestamptz,
  add column if not exists validado_por  uuid references core.usuarios(id);
create trigger trg_guarda_validacao before update on qualidade.verificacoes_ima
  for each row execute function qualidade.guarda_validacao();
grant update on qualidade.verificacoes_ima to authenticated;

-- Pontos do formulário. Os 3 genéricos antigos saem da lista (o histórico
-- continua apontando para eles).
update qualidade.imas set ativo = false where area is null;
insert into qualidade.imas (org_id, area, local, ordem)
select o.id, p.area, p.local, p.ordem
  from core.organizacoes o
  cross join (values
    ('Extração',   'PPRO 1 — Saída do lavador · rosca 1', 1),
    ('Extração',   'PPRO 1 — Saída do lavador · rosca 2', 2),
    ('Extração',   'PPRO 2 — Entrada da cevadeira', 3),
    ('Secagem',    'Forno 1 (PPRO 3.1)', 1),
    ('Secagem',    'Resfriador 1 (PPRO 4.1)', 2),
    ('Secagem',    'Forno 2 (PPRO 3.2)', 3),
    ('Secagem',    'Resfriador 2 (PPRO 4.2)', 4),
    ('Ensaque 01', 'Saída da caixa do padronizador', 1),
    ('Ensaque 01', 'Saída do padronizador', 2),
    ('Ensaque 01', 'Moinho', 3),
    ('Ensaque 01', 'Bocal de saída do bag', 4),
    ('Ensaque 02', 'Peneira 1', 1),
    ('Ensaque 02', 'Peneira 2', 2),
    ('Ensaque 02', 'Peneira 3', 3),
    ('Ensaque 02', 'Bocal de saída do bag', 4),
    ('Ensaque 02', 'Rosca do moinho', 5),
    ('Ensaque 02', 'Rosca da saída das peneiras', 6)
  ) as p(area, local, ordem)
 where not exists (select 1 from qualidade.imas i where i.org_id = o.id and i.area = p.area and i.local = p.local);

-- Tempo real para as tabelas novas.
do $p$ declare t record; begin
  for t in select schemaname, tablename from pg_tables
    where schemaname in ('core','producao','qualidade','manutencao')
      and not exists (select 1 from pg_publication_tables pt where pt.pubname = 'supabase_realtime'
                        and pt.schemaname = pg_tables.schemaname and pt.tablename = pg_tables.tablename)
  loop execute format('alter publication supabase_realtime add table %I.%I', t.schemaname, t.tablename); end loop;
end $p$;
