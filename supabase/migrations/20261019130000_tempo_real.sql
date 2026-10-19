-- ============================================================================
-- Tempo real: registros aparecem nas telas abertas assim que são gravados.
--
-- O Supabase só avisa o navegador de mudanças em tabelas que estão na
-- publicação `supabase_realtime`. Até aqui ela estava vazia — por isso um
-- registro feito em outro computador só aparecia com F5.
--
-- Entram todas as tabelas dos quatro schemas do sistema. O aviso respeita o
-- RLS: cada navegador só é avisado do que o usuário dele já pode ler, então
-- uma organização nunca fica sabendo das mudanças de outra.
--
-- Idempotente: só adiciona o que ainda não está na publicação, então pode ser
-- rodada de novo quando surgirem tabelas novas.
-- ============================================================================
do $p$
declare t record;
begin
  for t in
    select schemaname, tablename from pg_tables
     where schemaname in ('core', 'producao', 'qualidade', 'manutencao')
       and not exists (
         select 1 from pg_publication_tables pt
          where pt.pubname = 'supabase_realtime'
            and pt.schemaname = pg_tables.schemaname and pt.tablename = pg_tables.tablename)
  loop
    execute format('alter publication supabase_realtime add table %I.%I', t.schemaname, t.tablename);
  end loop;
end $p$;
