-- ============================================================================
-- Homologação de fornecedores — catálogo do checklist documental.
--   · segmentos_fornecedor : a atividade que carrega o checklist
--   · documentos_exigidos  : catálogo único de tipos de documento
--   · segmento_documentos  : checklist por segmento (obrigatório/condicional)
--   · fornecedor_segmentos : vínculo N:N fornecedor ↔ segmento
--
-- Não recria nada: core.fornecedores, qualidade.homologacoes e
-- qualidade.documentos_fornecedor já existem e continuam como estão.
-- ============================================================================

-- 5.1 — a atividade que carrega o checklist
create table qualidade.segmentos_fornecedor (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  nome       text not null,
  categoria  text not null check (categoria in ('produto','servico','equipamento','transporte')),
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id),
  unique (org_id, nome)
);

-- 5.2 — catálogo único de tipos de documento
create table qualidade.documentos_exigidos (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references core.organizacoes(id),
  nome              text not null,
  tem_validade      boolean not null default false,  -- liga o monitoramento de vencimento
  origem            text not null default 'fornecedor'
                      check (origem in ('fornecedor','interno')),
  permite_multiplos boolean not null default false,  -- aceita vários arquivos vigentes
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  created_by        uuid references core.usuarios(id),
  unique (org_id, nome)
);

-- 5.3 — checklist por segmento
create table qualidade.segmento_documentos (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references core.organizacoes(id),
  segmento_id          uuid not null references qualidade.segmentos_fornecedor(id) on delete cascade,
  documento_exigido_id uuid not null references qualidade.documentos_exigidos(id) on delete cascade,
  exigencia            text not null check (exigencia in ('obrigatorio','condicional')),
  created_at           timestamptz not null default now(),
  created_by           uuid references core.usuarios(id),
  unique (segmento_id, documento_exigido_id)
);

-- 5.4 — vínculo N:N
create table qualidade.fornecedor_segmentos (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  fornecedor_id uuid not null references core.fornecedores(id) on delete cascade,
  segmento_id   uuid not null references qualidade.segmentos_fornecedor(id) on delete cascade,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id),
  unique (fornecedor_id, segmento_id)
);

create index on qualidade.segmento_documentos (org_id, segmento_id);
create index on qualidade.fornecedor_segmentos (org_id, fornecedor_id);

-- org_id automático + RLS + grants (padrão da casa)
do $$
declare t text;
begin
  foreach t in array array['segmentos_fornecedor','documentos_exigidos',
                           'segmento_documentos','fornecedor_segmentos'] loop
    execute format('create trigger trg_set_org_id before insert on qualidade.%I
                    for each row execute function core.set_org_id()', t);
    execute format('alter table qualidade.%I enable row level security', t);
    execute format('create policy tenant_isolation on qualidade.%I
                      for all to authenticated
                      using (org_id = core.current_org())
                      with check (org_id = core.current_org())', t);
    execute format('grant select, insert, update, delete on qualidade.%I to authenticated', t);
  end loop;
end $$;
