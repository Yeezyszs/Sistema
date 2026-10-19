-- ============================================================================
-- O.S. com risco à segurança de alimentos + anexos (fotos e vídeos).
--
-- 1. Risco à segurança de alimentos
--    Manutenção em equipamento que toca o produto pode deixar parafuso, cavaco,
--    graxa ou resto de solda na linha. A FSSC 22000 (PRP de manutenção) exige
--    que, nesses casos, o equipamento só volte à produção depois de liberado
--    pela Qualidade. Daí o fluxo:
--
--      Em Aberto ──(manutenção encerra o serviço)──▶ Aguardando Qualidade
--      Aguardando Qualidade ──(qualidade libera)──▶ Concluído
--      Aguardando Qualidade ──(qualidade devolve)──▶ Em Aberto
--
--    A trava fica no banco, não só na tela: botão escondido não é controle,
--    qualquer chamada direta à API passaria por cima. Só quem tem o perfil
--    `qualidade` pode concluir uma O.S. marcada com risco, e só a qualidade
--    pode desmarcar o risco de uma O.S. que já o tinha — senão bastaria
--    desmarcar e concluir.
--
-- 2. Anexos
--    Foto e vídeo na abertura (o defeito), no fechamento (o serviço feito) e
--    na liberação (a evidência da inspeção). Arquivo vai para o Storage, num
--    bucket privado; a tabela guarda o caminho, a etapa e quem anexou.
-- ============================================================================

-- ── 1. Colunas novas na O.S. ──────────────────────────────────────────────
alter table manutencao.ordens
  add column if not exists risco_seguranca_alimentos boolean not null default false,
  add column if not exists liberado_em    timestamptz,
  add column if not exists liberado_por   uuid references core.usuarios(id),
  add column if not exists liberacao_obs  text;

comment on column manutencao.ordens.risco_seguranca_alimentos is
  'Serviço com risco à segurança de alimentos: só a Qualidade conclui (libera) a O.S.';

alter table manutencao.ordens drop constraint if exists ordens_status_check;
alter table manutencao.ordens add constraint ordens_status_check
  check (status in ('Em Aberto', 'Aguardando Qualidade', 'Concluído'));

-- ── 2. A trava ────────────────────────────────────────────────────────────
create or replace function manutencao.os_guarda_seguranca_alimentos()
returns trigger language plpgsql security definer set search_path = manutencao, core, public as $$
declare
  eh_qualidade boolean;
  usuario_atual uuid;
begin
  -- Sem usuário autenticado (SQL editor, service role) não há perfil a
  -- conferir; esse caminho é de administrador do banco, não do sistema.
  if auth.uid() is null then
    return NEW;
  end if;

  eh_qualidade := 'qualidade' = any(core.meus_perfis());

  -- Desmarcar o risco de uma O.S. que o tinha é decisão da qualidade.
  if TG_OP = 'UPDATE' and OLD.risco_seguranca_alimentos and not NEW.risco_seguranca_alimentos
     and not eh_qualidade then
    raise exception 'Só a Qualidade pode retirar o risco à segurança de alimentos desta O.S.'
      using errcode = '42501';
  end if;

  -- Concluir O.S. com risco é a liberação da qualidade.
  if NEW.risco_seguranca_alimentos and NEW.status = 'Concluído'
     and (TG_OP = 'INSERT' or OLD.status is distinct from 'Concluído') then
    if not eh_qualidade then
      raise exception 'O.S. com risco à segurança de alimentos só pode ser concluída pela Qualidade. Encerre o serviço para enviá-la à liberação.'
        using errcode = '42501';
    end if;
    select u.id into usuario_atual from core.usuarios u where u.auth_user_id = auth.uid();
    NEW.liberado_em  := now();
    NEW.liberado_por := usuario_atual;
  end if;

  -- Reabrir uma O.S. liberada apaga a liberação: ela vai precisar de outra.
  if TG_OP = 'UPDATE' and OLD.status = 'Concluído' and NEW.status <> 'Concluído' then
    NEW.liberado_em  := null;
    NEW.liberado_por := null;
  end if;

  return NEW;
end; $$;

drop trigger if exists trg_os_seguranca_alimentos on manutencao.ordens;
create trigger trg_os_seguranca_alimentos before insert or update on manutencao.ordens
  for each row execute function manutencao.os_guarda_seguranca_alimentos();

-- ── 3. Anexos ─────────────────────────────────────────────────────────────
create table if not exists manutencao.os_anexos (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references core.organizacoes(id),
  os_id      uuid not null references manutencao.ordens(id) on delete cascade,
  etapa      text not null check (etapa in ('abertura', 'fechamento', 'liberacao')),
  caminho    text not null,          -- chave no bucket os-anexos
  nome       text,                   -- nome original do arquivo
  mime       text,
  tamanho    bigint,
  created_at timestamptz not null default now(),
  created_by uuid references core.usuarios(id)
);
create index if not exists idx_os_anexos_os on manutencao.os_anexos (os_id, etapa);

alter table manutencao.os_anexos enable row level security;
drop policy if exists tenant_isolation on manutencao.os_anexos;
create policy tenant_isolation on manutencao.os_anexos
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
drop trigger if exists trg_set_org_id on manutencao.os_anexos;
create trigger trg_set_org_id before insert on manutencao.os_anexos
  for each row execute function core.set_org_id();
grant select, insert, update, delete on manutencao.os_anexos to authenticated;

-- Bucket privado. 50 MB por arquivo cobre foto de celular com folga e cerca
-- de um minuto de vídeo em 1080p; só imagem e vídeo entram.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('os-anexos', 'os-anexos', false, 52428800, array['image/*', 'video/*'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "os_anexos_read"   on storage.objects;
drop policy if exists "os_anexos_insert" on storage.objects;
drop policy if exists "os_anexos_delete" on storage.objects;
create policy "os_anexos_read"   on storage.objects for select to authenticated using (bucket_id = 'os-anexos');
create policy "os_anexos_insert" on storage.objects for insert to authenticated with check (bucket_id = 'os-anexos');
create policy "os_anexos_delete" on storage.objects for delete to authenticated using (bucket_id = 'os-anexos');
