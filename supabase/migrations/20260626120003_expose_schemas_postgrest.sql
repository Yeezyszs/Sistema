-- ============================================================================
-- 0003 — Expõe os schemas de domínio à API (PostgREST / supabase-js)
-- ============================================================================
-- Por padrão o Supabase expõe apenas `public` e `graphql_public`. Para o
-- front consumir `producao.*` direto (com RLS), os schemas precisam entrar
-- na config db-schemas do PostgREST. Equivale a "Exposed schemas" no painel.
-- ============================================================================

alter role authenticator
  set pgrst.db_schemas = 'public, graphql_public, core, producao, qualidade, manutencao';

notify pgrst, 'reload config';
