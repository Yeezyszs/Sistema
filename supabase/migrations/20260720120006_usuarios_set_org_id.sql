-- ============================================================================
-- Preenche org_id automaticamente ao vincular perfil / criar usuário,
-- para a tela de administração de usuários inserir sem passar o org_id.
-- ============================================================================
create trigger trg_set_org_id before insert on core.usuario_perfis
  for each row execute function core.set_org_id();
create trigger trg_set_org_id before insert on core.usuarios
  for each row execute function core.set_org_id();
