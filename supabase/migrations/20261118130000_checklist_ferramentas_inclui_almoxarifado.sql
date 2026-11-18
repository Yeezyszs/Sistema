-- O Almoxarifado também marca o checklist de ferramentas.
drop policy if exists escrita_qualidade_manutencao on manutencao.checklist_ferramenta_estado;
create policy escrita_qualidade_manutencao_almox on manutencao.checklist_ferramenta_estado
  for all
  using (org_id = core.current_org() and core.tem_perfil(array['qualidade','manutencao','almoxarifado']))
  with check (org_id = core.current_org() and core.tem_perfil(array['qualidade','manutencao','almoxarifado']));
