# alertas-documentos

Alerta diário por e-mail dos documentos de fornecedor **vencidos** ou **a
vencer nos próximos 30 dias**.

A regra de quem está vencendo mora no banco (`qualidade.documentos_vencendo`),
a mesma que o painel usa — tela e e-mail nunca discordam. A função lê o que
ainda não foi avisado (`qualidade.alertas_documento_pendentes`), envia **um**
e-mail com a lista e só então grava em `qualidade.alertas_documento_enviados`.
Se o envio falhar, nada é gravado e o alerta volta no dia seguinte.

## 1. Secrets

Supabase → Project Settings → Edge Functions → Secrets:

| Secret | Para quê |
| --- | --- |
| `RESEND_API_KEY` | chave do provedor de e-mail ([resend.com](https://resend.com)) |
| `ALERTA_EMAIL_DE` | remetente **verificado no domínio**, ex. `sistema@suaempresa.com.br` |
| `ALERTA_EMAIL_PARA` | destinatários internos, separados por vírgula |
| `ALERTA_DIAS` | opcional, janela de antecedência (padrão `30`) |

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas pela plataforma.

Sem esses secrets a função responde `500` com a variável que falta — ela não
envia nada pela metade.

## 2. Teste manual

```bash
curl -X POST 'https://xglbppuiwdfuxdmyvbix.supabase.co/functions/v1/alertas-documentos' \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Resposta esperada: `{"enviados":N,"vencidos":M}` ou `{"enviados":0,"mensagem":"Nada pendente."}`.

## 3. Agendamento diário

Este é o **primeiro** agendamento do repositório. O `cron` precisa da service
role key, que não pode ser versionada — por isso ele não vai numa migration.
Rode uma vez no SQL Editor do projeto, colando a chave:

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- Guarda a chave no Vault em vez de deixá-la escrita no job.
select vault.create_secret(
  '<SERVICE_ROLE_KEY>', 'service_role_key', 'Usada pelo cron de alertas'
);

select cron.schedule(
  'alertas-documentos-diario',
  '0 11 * * *',                       -- 08:00 em Brasília (o cron roda em UTC)
  $$
  select net.http_post(
    url     := 'https://xglbppuiwdfuxdmyvbix.supabase.co/functions/v1/alertas-documentos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    )
  );
  $$
);
```

Conferir: `select * from cron.job;` e `select * from cron.job_run_details order by start_time desc limit 10;`

Para desligar: `select cron.unschedule('alertas-documentos-diario');`
