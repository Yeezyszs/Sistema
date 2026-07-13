-- ============================================================================
-- 0034 — Qualidade: Controle de Insumos do Laboratório (FOR-POP09).
--   Estoque de insumos do lab (reagentes, embalagens de amostra, material).
--   "Precisa comprar?" é coluna gerada: estoque < necessária => true.
--   "Foi solicitado?" é marcado à mão quando a compra é pedida.
-- ============================================================================
create table qualidade.insumos_laboratorio (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references core.organizacoes(id),
  nome                text not null,
  tipo                text,          -- produto químico, embalagem, material...
  especificacao       text,
  quantidade_necessaria numeric,
  quantidade_estoque    numeric,
  precisa_comprar     boolean generated always as (
                        coalesce(quantidade_estoque, 0) < coalesce(quantidade_necessaria, 0)
                      ) stored,
  solicitado          boolean not null default false,
  observacao          text,
  ativo               boolean not null default true,
  created_at          timestamptz not null default now(),
  created_by          uuid references core.usuarios(id)
);
create index on qualidade.insumos_laboratorio (org_id);

create trigger trg_set_org_id before insert on qualidade.insumos_laboratorio
  for each row execute function core.set_org_id();

alter table qualidade.insumos_laboratorio enable row level security;
create policy tenant_isolation on qualidade.insumos_laboratorio
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on qualidade.insumos_laboratorio to authenticated;
