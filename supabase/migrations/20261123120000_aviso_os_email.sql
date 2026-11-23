-- E-mail para a Qualidade a cada O.S. aberta: o gatilho chama a Edge
-- Function `aviso-os` pelo pg_net (assíncrono — a abertura da O.S. não espera
-- o e-mail, e uma falha no envio nunca impede salvar a O.S.).
grant usage on schema manutencao to service_role;
grant select on manutencao.ordens to service_role;

create or replace function manutencao.avisar_os_aberta()
returns trigger
language plpgsql
security definer
set search_path = manutencao, public
as $$
begin
  begin
    perform net.http_post(
      url     := 'https://xglbppuiwdfuxdmyvbix.supabase.co/functions/v1/aviso-os',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'alertas_cron_token')
      ),
      body    := jsonb_build_object('id', new.id)
    );
  exception when others then
    raise warning 'Aviso de O.S. não enviado: %', sqlerrm;
  end;
  return null;
end $$;
revoke execute on function manutencao.avisar_os_aberta() from public, anon, authenticated;

drop trigger if exists trg_aviso_os_aberta on manutencao.ordens;
create trigger trg_aviso_os_aberta after insert on manutencao.ordens
  for each row execute function manutencao.avisar_os_aberta();
