# alertas-documentos

Alerta diário por e-mail dos **documentos de fornecedor** e dos **certificados
de calibração** (FOR-POP 05 1.4) **vencidos** ou **a vencer nos próximos 30
dias**. Um e-mail por dia com as duas listas; cada item é avisado uma vez ao
entrar nos 30 dias e outra quando vence. Se o envio falhar, nada é marcado e o
alerta volta no dia seguinte.

## 1. Secrets (o que falta configurar)

Supabase → Edge Functions → Secrets:

| Secret | Para quê |
| --- | --- |
| `RESEND_API_KEY` | chave do provedor de e-mail ([resend.com](https://resend.com)) |
| `ALERTA_EMAIL_DE` | remetente **verificado no domínio**, ex. `qualidade@suaempresa.com.br` |
| `ALERTA_EMAIL_PARA` | destinatários, separados por vírgula |
| `ALERTA_DIAS` | opcional, antecedência (padrão `30`) |

## 2. Disparo automático (já configurado)

Migration `20261113120100_alertas_cron.sql`: job `alertas-qualidade-diario` no
pg_cron, todo dia às 07:47 de Brasília. Ele chama a função com o cabeçalho
`x-cron-token`, um segredo gerado e guardado no Vault (`alertas_cron_token`);
a função confere por `qualidade.alerta_cron_token_ok()`. Sem o token certo ela
responde 401 e não envia nada.

Conferir execuções:

```sql
select * from cron.job_run_details order by start_time desc limit 10;
select id, status_code, content from net._http_response order by id desc limit 10;
```

Disparar na hora (teste):

```sql
select net.http_post(
  url := 'https://xglbppuiwdfuxdmyvbix.supabase.co/functions/v1/alertas-documentos',
  headers := jsonb_build_object('Content-Type','application/json','x-cron-token',
    (select decrypted_secret from vault.decrypted_secrets where name = 'alertas_cron_token')),
  body := '{}'::jsonb);
```

Desligar: `select cron.unschedule('alertas-qualidade-diario');`
