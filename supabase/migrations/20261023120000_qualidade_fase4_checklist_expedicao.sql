-- ============================================================================
-- Qualidade, fase 4: checklist de expedição (FOR POP 14 1.1) no carregamento.
--
--   ultimo_produto      — último produto transportado pelo veículo
--   checklist           — {item: 'c' | 'nc' | 'na'}; L1–L10 Logística (seções
--                         1 e 2), Q1–Q7 Qualidade (seções 3 e 4)
--   checklist_obs       — observação da Logística
--   inspecao_obs        — observação da Qualidade
--   liberacao           — aprovado | aprovado_restricao | reprovado
--   liberacao_justificativa — obrigatória em "aprovado com restrição"
--   liberado_em / liberado_por — carimbados pelo banco; só a Qualidade libera
-- ============================================================================
alter table producao.carregamentos
  add column if not exists ultimo_produto          text,
  add column if not exists checklist               jsonb,
  add column if not exists checklist_obs           text,
  add column if not exists inspecao_obs            text,
  add column if not exists liberacao               text check (liberacao in ('aprovado','aprovado_restricao','reprovado')),
  add column if not exists liberacao_justificativa text,
  add column if not exists liberado_em             timestamptz,
  add column if not exists liberado_por            uuid references core.usuarios(id);

create or replace function producao.carregamento_guarda_liberacao()
returns trigger language plpgsql security definer set search_path = producao, core, public as $$
begin
  if auth.uid() is null then return NEW; end if;
  if NEW.liberacao is distinct from (case when TG_OP = 'UPDATE' then OLD.liberacao end) then
    if not ('qualidade' = any(core.meus_perfis())) then
      raise exception 'Só a Qualidade pode liberar a carga.' using errcode = '42501';
    end if;
    if NEW.liberacao = 'aprovado_restricao' and coalesce(trim(NEW.liberacao_justificativa), '') = '' then
      raise exception 'Aprovado com restrição exige justificativa.' using errcode = '23514';
    end if;
    if NEW.liberacao is null then
      NEW.liberado_em := null; NEW.liberado_por := null;
    else
      NEW.liberado_em  := now();
      NEW.liberado_por := (select u.id from core.usuarios u where u.auth_user_id = auth.uid());
    end if;
  end if;
  return NEW;
end $$;
drop trigger if exists trg_carregamento_liberacao on producao.carregamentos;
create trigger trg_carregamento_liberacao before insert or update on producao.carregamentos
  for each row execute function producao.carregamento_guarda_liberacao();

-- ── Laudo microbiológico externo anexado ao laudo interno ───────────────────
-- O laudo interno é só-inclusão (não se altera depois de emitido), então o PDF
-- do laboratório externo entra numa tabela à parte, também só-inclusão.
create table if not exists qualidade.laudo_anexos (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  laudo_id   uuid not null references qualidade.laudos_internos(id),
  tipo       text not null default 'microbiologico' check (tipo in ('microbiologico', 'outro')),
  caminho    text not null,
  nome       text,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
alter table qualidade.laudo_anexos enable row level security;
create policy append_select on qualidade.laudo_anexos for select using (org_id = core.current_org());
create policy append_insert on qualidade.laudo_anexos for insert with check (org_id = core.current_org());
create trigger trg_set_org_id before insert on qualidade.laudo_anexos
  for each row execute function core.set_org_id();
grant select, insert on qualidade.laudo_anexos to authenticated;
alter publication supabase_realtime add table qualidade.laudo_anexos;
