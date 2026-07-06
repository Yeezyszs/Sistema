-- ============================================================================
-- 0021 — Acesso por perfil: função de leitura + policy de leitura para o
--        próprio usuário consultar seus perfis (necessário pro frontend).
-- ============================================================================
create or replace function core.meus_perfis()
returns text[]
language sql
stable
security definer
set search_path = core, public
as $$
  select coalesce(array_agg(p.nome), array[]::text[])
    from core.usuario_perfis up
    join core.perfis p on p.id = up.perfil_id
    join core.usuarios u on u.id = up.usuario_id
   where u.auth_user_id = auth.uid()
$$;

grant execute on function core.meus_perfis() to authenticated;
