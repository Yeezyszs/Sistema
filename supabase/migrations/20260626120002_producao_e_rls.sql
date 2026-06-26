-- ============================================================================
-- 0002 — Schema producao (Fase 1): lotes, etapas, recebimentos, ledger
-- ============================================================================
-- O lote é a espinha da rastreabilidade. Tudo se pendura nele.
-- movimentos_estoque e registros_etapa são APPEND-ONLY (sem update/delete).
-- ordens_producao entra como STUB mínimo — o fluxo do PCP é modelado depois.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Catálogo global das etapas do fluxo (semeado) — codigo é PK, sem org_id
-- ----------------------------------------------------------------------------
create table producao.etapas (
  codigo  text primary key,            -- descarga, extracao, secagem, laboratorio, ensaque, expedicao
  nome    text not null,
  ordem   int  not null
);

-- ----------------------------------------------------------------------------
-- STUB do PCP — id, produto, data, status. Sem planejamento/sequenciamento.
-- ----------------------------------------------------------------------------
create table producao.ordens_producao (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  produto_id  uuid not null references core.produtos(id),
  data        date not null,
  status      text not null default 'aberta'
                check (status in ('aberta','em_processo','concluida')),
  created_at  timestamptz not null default now(),
  created_by  uuid references core.usuarios(id)
);

-- ----------------------------------------------------------------------------
-- Lotes (a espinha)
-- ----------------------------------------------------------------------------
create table producao.lotes (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references core.organizacoes(id),
  codigo             text not null,
  produto_id         uuid not null references core.produtos(id),
  ordem_producao_id  uuid references producao.ordens_producao(id),
  data_producao      date,
  status             text not null default 'em_processo'
                       check (status in ('em_processo','aguardando_liberacao','liberado','bloqueado','expedido')),
  created_at         timestamptz not null default now(),
  created_by         uuid references core.usuarios(id),
  unique (org_id, codigo)
);
create index on producao.lotes (org_id, status);
create index on producao.lotes (produto_id);

-- ----------------------------------------------------------------------------
-- Recebimento de matéria-prima (etapa Descarga)
-- ----------------------------------------------------------------------------
create table producao.recebimentos (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  fornecedor_id  uuid references core.fornecedores(id),
  produto_id     uuid not null references core.produtos(id),
  lote_mp        text,
  variedade      text,
  quantidade     numeric,
  recebido_em    timestamptz not null,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.recebimentos (fornecedor_id);

-- Consumo: liga MP recebida ao lote produzido (rastreabilidade pra trás)
create table producao.consumo_materia_prima (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  lote_id        uuid not null references producao.lotes(id),
  recebimento_id uuid not null references producao.recebimentos(id),
  quantidade     numeric,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.consumo_materia_prima (lote_id);
create index on producao.consumo_materia_prima (recebimento_id);

-- ----------------------------------------------------------------------------
-- Instância de cada etapa para um lote
-- ----------------------------------------------------------------------------
create table producao.etapas_lote (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  lote_id        uuid not null references producao.lotes(id),
  etapa_codigo   text not null references producao.etapas(codigo),
  setor_id       uuid references core.setores(id),
  equipamento_id uuid references core.equipamentos(id),
  operador_id    uuid references core.funcionarios(id),
  iniciado_em    timestamptz,
  finalizado_em  timestamptz,
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.etapas_lote (lote_id);
create index on producao.etapas_lote (equipamento_id);

-- ----------------------------------------------------------------------------
-- LEDGER de estoque (APPEND-ONLY)
-- ----------------------------------------------------------------------------
create table producao.movimentos_estoque (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  produto_id     uuid not null references core.produtos(id),
  lote_id        uuid references producao.lotes(id),
  tipo           text not null check (tipo in ('entrada','consumo','producao','saida','ajuste')),
  quantidade     numeric not null,
  etapa_codigo   text references producao.etapas(codigo),
  funcionario_id uuid references core.funcionarios(id),
  ocorrido_em    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.movimentos_estoque (lote_id);
create index on producao.movimentos_estoque (produto_id);

-- ----------------------------------------------------------------------------
-- Registro genérico tipado (lado flexível do híbrido) — APPEND-ONLY
-- higienização, operadores, fichas, checklists, ficha de descarga, NF...
-- ----------------------------------------------------------------------------
create table producao.registros_etapa (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  lote_id        uuid references producao.lotes(id),
  etapa_codigo   text references producao.etapas(codigo),
  tipo_documento text not null,        -- higienizacao | operadores | ficha_descarga | checklist_expedicao ...
  operador_id    uuid references core.funcionarios(id),
  equipamento_id uuid references core.equipamentos(id),
  dados          jsonb,
  anexo_url      text,
  registrado_em  timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id)
);
create index on producao.registros_etapa (lote_id);
create index on producao.registros_etapa (lote_id, etapa_codigo, tipo_documento);

-- ----------------------------------------------------------------------------
-- Expedição (etapa final + checklist estruturado)
-- ----------------------------------------------------------------------------
create table producao.expedicoes (
  id                          uuid primary key default gen_random_uuid(),
  org_id                      uuid not null references core.organizacoes(id),
  lote_id                     uuid not null references producao.lotes(id),
  cliente                     text,
  transportadora              text,
  motorista                   text,
  placa                       text,
  quantidade                  numeric,
  nota_fiscal                 text,
  ultimo_produto_transportado text,
  liberado_em                 timestamptz,
  liberado_por                uuid references core.funcionarios(id),
  created_at                  timestamptz not null default now(),
  created_by                  uuid references core.usuarios(id)
);
create index on producao.expedicoes (lote_id);

-- ============================================================================
-- RLS
-- ============================================================================
alter table producao.etapas                 enable row level security;
alter table producao.ordens_producao        enable row level security;
alter table producao.lotes                   enable row level security;
alter table producao.recebimentos            enable row level security;
alter table producao.consumo_materia_prima   enable row level security;
alter table producao.etapas_lote             enable row level security;
alter table producao.movimentos_estoque      enable row level security;
alter table producao.registros_etapa         enable row level security;
alter table producao.expedicoes              enable row level security;

-- etapas: catálogo global, leitura para autenticado
create policy ref_read on producao.etapas
  for select using (auth.role() = 'authenticated');

-- tabelas tenant com CRUD normal
create policy tenant_isolation on producao.ordens_producao
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on producao.lotes
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on producao.recebimentos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on producao.consumo_materia_prima
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on producao.etapas_lote
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create policy tenant_isolation on producao.expedicoes
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());

-- APPEND-ONLY: só SELECT + INSERT (sem UPDATE/DELETE) → correção é novo registro
create policy append_select on producao.movimentos_estoque
  for select using (org_id = core.current_org());
create policy append_insert on producao.movimentos_estoque
  for insert with check (org_id = core.current_org());

create policy append_select on producao.registros_etapa
  for select using (org_id = core.current_org());
create policy append_insert on producao.registros_etapa
  for insert with check (org_id = core.current_org());

-- ============================================================================
-- Grants
-- ============================================================================
grant usage on schema producao to anon, authenticated;
grant select on producao.etapas to anon;
grant select, insert, update, delete on all tables in schema producao to authenticated;
-- append-only: revoga update/delete mesmo para authenticated (RLS já bloqueia,
-- isto é defesa em profundidade na camada de privilégios)
revoke update, delete on producao.movimentos_estoque from authenticated;
revoke update, delete on producao.registros_etapa from authenticated;
alter default privileges in schema producao
  grant select, insert, update, delete on tables to authenticated;
