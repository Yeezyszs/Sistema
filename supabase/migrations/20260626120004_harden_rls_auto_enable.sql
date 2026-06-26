-- ============================================================================
-- 0004 — Hardening: revoga EXECUTE de public.rls_auto_enable() via API
-- ============================================================================
-- public.rls_auto_enable() é um event trigger PRÉ-EXISTENTE (secure-by-default:
-- habilita RLS em tabelas novas do schema public). Como SECURITY DEFINER, o
-- linter alerta que anon/authenticated podem chamá-la via /rest/v1/rpc. Ela só
-- deve rodar como event trigger — nunca via RPC — então revogamos o EXECUTE.
-- Não altera o comportamento do trigger (event triggers rodam como owner).
-- ============================================================================

revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
