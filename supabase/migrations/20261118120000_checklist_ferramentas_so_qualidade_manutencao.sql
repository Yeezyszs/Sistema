-- Checklist de ferramentas: todos com acesso ao módulo consultam, mas só os
-- perfis Qualidade e Manutenção marcam/desmarcam. A tela esconde o clique;
-- aqui a regra vale mesmo para quem chamar a API direto.
create or replace function core.tem_perfil(p_perfis text[])
returns boolean
language sql
stable
security definer
set search_path = core, public
as $$
  select exists (
    select 1
      from core.usuario_perfis up
      join core.perfis p on p.id = up.perfil_id
      join core.usuarios u on u.id = up.usuario_id
     where u.auth_user_id = auth.uid()
       and p.nome = any (p_perfis)
  );
$$;
revoke execute on function core.tem_perfil(text[]) from public, anon;
grant execute on function core.tem_perfil(text[]) to authenticated;

drop policy if exists tenant_isolation on manutencao.checklist_ferramenta_estado;
create policy leitura on manutencao.checklist_ferramenta_estado
  for select using (org_id = core.current_org());
create policy escrita_qualidade_manutencao on manutencao.checklist_ferramenta_estado
  for all
  using (org_id = core.current_org() and core.tem_perfil(array['qualidade','manutencao']))
  with check (org_id = core.current_org() and core.tem_perfil(array['qualidade','manutencao']));
