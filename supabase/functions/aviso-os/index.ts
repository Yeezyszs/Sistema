// E-mail para a Qualidade a cada O.S. aberta.
//
// Disparo: gatilho AFTER INSERT em manutencao.ordens (migration
// 20261123120000_aviso_os_email.sql) chama esta função com o id da O.S. e o
// cabeçalho x-cron-token — o mesmo segredo do Vault usado pelos alertas
// diários, conferido por qualidade.alerta_cron_token_ok().
//
// Secrets (Supabase → Edge Functions → Secrets):
//   ALERTA_EMAIL_DE                  caixa remetente (Outlook da empresa)
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET  aplicativo do Entra ID com Mail.Send
//   (ou RESEND_API_KEY, no lugar dos três acima)
//   OS_EMAIL_PARA                    destinatários da Qualidade, separados por vírgula
import { createClient } from 'jsr:@supabase/supabase-js@2';

function exigir(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return v;
}

// Envio pelo Microsoft 365 (Outlook) via Microsoft Graph: o sistema entra com
// um aplicativo registrado no Entra ID da empresa (permissão Mail.Send) e manda
// em nome da caixa ALERTA_EMAIL_DE. Sem as variáveis do Microsoft, cai no
// Resend (RESEND_API_KEY), se estiver configurado.
async function enviarEmail(para: string[], assunto: string, html: string): Promise<void> {
  const de = exigir('ALERTA_EMAIL_DE');
  const tenant = Deno.env.get('MS_TENANT_ID');
  if (tenant) {
    const token = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: exigir('MS_CLIENT_ID'),
        client_secret: exigir('MS_CLIENT_SECRET'),
        scope: 'https://graph.microsoft.com/.default',
      }),
    });
    if (!token.ok) throw new Error(`Microsoft recusou o login do aplicativo: ${token.status} ${await token.text()}`);
    const { access_token } = await token.json() as { access_token: string };
    const resp = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(de)}/sendMail`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: assunto,
          body: { contentType: 'HTML', content: html },
          toRecipients: para.map((address) => ({ emailAddress: { address } })),
        },
        saveToSentItems: true,
      }),
    });
    if (!resp.ok) throw new Error(`Falha no envio pelo Outlook: ${resp.status} ${await resp.text()}`);
    return;
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${exigir('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: de, to: para, subject: assunto, html }),
  });
  if (!resp.ok) throw new Error(`Falha no envio do e-mail: ${resp.status} ${await resp.text()}`);
}

const esc = (s: unknown) => String(s ?? '—').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const dataBR = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

Deno.serve(async (req) => {
  try {
    const url = exigir('SUPABASE_URL');
    const chave = exigir('SUPABASE_SERVICE_ROLE_KEY');
    const qualidade = createClient(url, chave, { db: { schema: 'qualidade' } });
    const { data: autorizado } = await qualidade.rpc('alerta_cron_token_ok', { p_token: req.headers.get('x-cron-token') ?? '' });
    if (autorizado !== true) return Response.json({ erro: 'Não autorizado.' }, { status: 401 });

    const { id } = await req.json() as { id?: string };
    if (!id) return Response.json({ erro: 'id da O.S. ausente.' }, { status: 400 });

    const { data: os, error } = await createClient(url, chave, { db: { schema: 'manutencao' } })
      .from('ordens').select('*').eq('id', id).single();
    if (error || !os) throw new Error(error?.message ?? 'O.S. não encontrada.');

    const linha = (rotulo: string, valor: unknown) =>
      `<tr><td style="padding:4px 12px 4px 0;color:#64748b">${rotulo}</td><td style="padding:4px 0">${esc(valor)}</td></tr>`;
    const risco = os.risco_seguranca_alimentos
      ? '<p style="color:#b91c1c;font-weight:600">⚠ Risco à segurança de alimentos — exige liberação da Qualidade antes de concluir.</p>'
      : '';
    const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#0f172a">
      <p>Nova ordem de serviço aberta no sistema.</p>
      ${risco}
      <table style="border-collapse:collapse;font-size:13px">
        ${linha('O.S. nº', os.numero)}
        ${linha('Aberta em', `${dataBR(os.data)} ${os.hora ?? ''}`)}
        ${linha('Requisitante', os.req)}
        ${linha('Setor', os.setor)}
        ${linha('Tipo', os.tipo)}
        ${linha('Demanda', os.natureza)}
        ${linha('Prioridade', os.prioridade)}
        ${linha('Data programada', dataBR(os.data_prog))}
        ${linha('Parada de equipamento', os.parada_equip ? 'Sim' : 'Não')}
        ${linha('Parada de produção', os.parada_prod ? 'Sim' : 'Não')}
        ${linha('Status', os.status)}
      </table>
      <p style="margin-top:12px"><b>Descrição:</b><br>${esc(os.descricao).replace(/\n/g, '<br>')}</p>
      <p style="color:#64748b;font-size:12px">Aviso automático do sistema — Manutenção → Ordens de Serviço.</p>
    </div>`;

    await enviarEmail(
      exigir('OS_EMAIL_PARA').split(',').map((e) => e.trim()),
      `${os.risco_seguranca_alimentos ? '⚠ ' : ''}O.S. nº ${os.numero} aberta — ${os.setor ?? 's/ setor'} (${os.prioridade ?? 's/ prioridade'})`,
      html,
    );
    return Response.json({ enviado: true, numero: os.numero });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    console.error(mensagem);
    return Response.json({ erro: mensagem }, { status: 500 });
  }
});
