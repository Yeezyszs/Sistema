-- ============================================================================
-- Documentos de fornecedor — vínculo com o checklist, versionamento e
-- soft delete. ESTENDE qualidade.documentos_fornecedor (não cria tabela nova:
-- fragmentaria o histórico e quebraria a tela atual).
-- ============================================================================
alter table qualidade.documentos_fornecedor
  add column if not exists documento_exigido_id uuid references qualidade.documentos_exigidos(id),
  add column if not exists is_atual        boolean not null default true,
  add column if not exists excluido_em     timestamptz,
  add column if not exists excluido_por    uuid references core.usuarios(id),
  add column if not exists motivo_exclusao text;

-- documento_exigido_id é nullable de propósito: os laudos já cadastrados não
-- pertencem a nenhum item de checklist e continuam válidos como estão.

-- Índice parcial para as consultas quentes (checklist e status documental).
create index if not exists idx_docforn_vigentes
  on qualidade.documentos_fornecedor (fornecedor_id, documento_exigido_id)
  where is_atual and excluido_em is null;

-- ── Versionamento ───────────────────────────────────────────────────────────
-- Ao inserir um documento vigente cujo tipo NÃO permite múltiplos, arquiva os
-- anteriores do mesmo (fornecedor, tipo). Nunca apaga: substituir arquiva.
create or replace function qualidade.documento_fornecedor_versiona()
returns trigger
language plpgsql
security definer
set search_path = qualidade, core, public
as $$
declare
  v_multiplos boolean;
begin
  if new.documento_exigido_id is null or not new.is_atual then
    return new;
  end if;

  select permite_multiplos into v_multiplos
    from qualidade.documentos_exigidos
   where id = new.documento_exigido_id;

  if coalesce(v_multiplos, false) then
    return new;  -- tipo multi: os arquivos convivem vigentes
  end if;

  update qualidade.documentos_fornecedor
     set is_atual = false
   where fornecedor_id = new.fornecedor_id
     and documento_exigido_id = new.documento_exigido_id
     and id <> new.id
     and is_atual
     and excluido_em is null;

  return new;
end $$;

revoke execute on function qualidade.documento_fornecedor_versiona() from anon, authenticated, public;

drop trigger if exists trg_docforn_versiona on qualidade.documentos_fornecedor;
create trigger trg_docforn_versiona
  after insert on qualidade.documentos_fornecedor
  for each row execute function qualidade.documento_fornecedor_versiona();
