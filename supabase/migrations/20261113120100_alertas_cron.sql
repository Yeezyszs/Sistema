-- Disparo diário automático do e-mail de alertas (documentos + calibração).
-- O token que autoriza a chamada nasce e fica no Vault: o cron o lê para o
-- cabeçalho e a Edge Function o confere por alerta_cron_token_ok(). Nenhuma
-- chave fica escrita no job nem no repositório.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net  with schema extensions;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'alertas_cron_token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'alertas_cron_token',
                                'Autoriza o cron a disparar a função alertas-documentos');
  end if;
end $$;

create or replace function qualidade.alerta_cron_token_ok(p_token text)
returns boolean
language sql
stable
security definer
set search_path = vault, public
as $$
  select exists (select 1 from vault.decrypted_secrets
                  where name = 'alertas_cron_token' and decrypted_secret = p_token and p_token <> '');
$$;
revoke execute on function qualidade.alerta_cron_token_ok(text) from public, anon, authenticated;
grant execute on function qualidade.alerta_cron_token_ok(text) to service_role;

-- 07:47 em Brasília (10:47 UTC), todo dia.
select cron.unschedule('alertas-qualidade-diario')
 where exists (select 1 from cron.job where jobname = 'alertas-qualidade-diario');
select cron.schedule(
  'alertas-qualidade-diario',
  '47 10 * * *',
  $job$
  select net.http_post(
    url     := 'https://xglbppuiwdfuxdmyvbix.supabase.co/functions/v1/alertas-documentos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'alertas_cron_token')
    ),
    body    := '{}'::jsonb
  );
  $job$
);
