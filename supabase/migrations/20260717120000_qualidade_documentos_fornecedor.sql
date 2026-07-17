-- ============================================================================
-- Fornecedores & Homologação — documentos (laudos externos) + Storage.
--   · qualidade.documentos_fornecedor  (metadados + caminho do arquivo)
--   · bucket privado `fornecedores`     (PDFs dos laudos)
--   · trigger org_id em core.fornecedores (cadastro pelo front)
--   · sincroniza homologado também no UPDATE de homologacoes.status
-- ============================================================================

create table if not exists qualidade.documentos_fornecedor (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references core.organizacoes(id),
  fornecedor_id     uuid not null references core.fornecedores(id) on delete cascade,
  homologacao_id    uuid references qualidade.homologacoes(id) on delete set null,
  tipo              text not null default 'laudo_laboratorial',
  categoria_analise text,          -- metais_pesados | microbiologia | ecoli | bacillus | outro
  fazenda           text,
  variedade         text,
  numero_laudo      text,
  ano               integer,
  resultado         text not null default 'pendente'
                      check (resultado in ('aprovado','reprovado','pendente')),
  emitido_em        date,
  validade          date,
  arquivo_bucket    text,
  arquivo_path      text,
  arquivo_nome      text,
  observacao        text,
  created_at        timestamptz not null default now(),
  created_by        uuid references core.usuarios(id)
);

create index if not exists idx_docforn_fornecedor on qualidade.documentos_fornecedor (fornecedor_id);
create index if not exists idx_docforn_org_forn   on qualidade.documentos_fornecedor (org_id, fornecedor_id);

drop trigger if exists trg_set_org_id on qualidade.documentos_fornecedor;
create trigger trg_set_org_id before insert on qualidade.documentos_fornecedor
  for each row execute function core.set_org_id();

alter table qualidade.documentos_fornecedor enable row level security;

drop policy if exists tenant_isolation on qualidade.documentos_fornecedor;
create policy tenant_isolation on qualidade.documentos_fornecedor
  for all to authenticated
  using (org_id = core.current_org())
  with check (org_id = core.current_org());

grant usage on schema qualidade to authenticated;
grant select, insert, update, delete on qualidade.documentos_fornecedor to authenticated;

-- org_id automático no cadastro de fornecedores pelo front
drop trigger if exists trg_set_org_id on core.fornecedores;
create trigger trg_set_org_id before insert on core.fornecedores
  for each row execute function core.set_org_id();

-- sincroniza core.fornecedores.homologado também quando o status muda
drop trigger if exists trg_homolog_fornecedor on qualidade.homologacoes;
create trigger trg_homolog_fornecedor
  after insert or update of status on qualidade.homologacoes
  for each row execute function qualidade.homologacao_atualiza_fornecedor();

-- ----------------------------------------------------------------------------
-- Bucket privado dos laudos + políticas (usuários autenticados)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('fornecedores', 'fornecedores', false)
on conflict (id) do nothing;

drop policy if exists "forn_docs_read"   on storage.objects;
drop policy if exists "forn_docs_insert" on storage.objects;
drop policy if exists "forn_docs_update" on storage.objects;
drop policy if exists "forn_docs_delete" on storage.objects;
create policy "forn_docs_read"   on storage.objects for select to authenticated using (bucket_id = 'fornecedores');
create policy "forn_docs_insert" on storage.objects for insert to authenticated with check (bucket_id = 'fornecedores');
create policy "forn_docs_update" on storage.objects for update to authenticated using (bucket_id = 'fornecedores');
create policy "forn_docs_delete" on storage.objects for delete to authenticated using (bucket_id = 'fornecedores');
