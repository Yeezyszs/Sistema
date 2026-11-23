// Alerta diário por e-mail: documentos de fornecedor e certificados de
// calibração vencidos ou vencendo nos próximos 30 dias.
//
// Lê o que ainda não foi avisado (qualidade.alertas_documento_pendentes e
// qualidade.alertas_calibracao_pendentes), manda UM e-mail com as duas listas
// e só então marca cada item como enviado — se o envio falhar, nada é marcado
// e o alerta volta amanhã.
//
// Disparo: pg_cron chama esta função todo dia com o cabeçalho x-cron-token,
// um segredo guardado no Vault do banco (nome 'alertas_cron_token') que a
// própria função confere por qualidade.alerta_cron_token_ok().
//
// Variáveis de ambiente (Supabase → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas pela plataforma)
//   ALERTA_EMAIL_DE       caixa remetente (Outlook da empresa)
//   MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET  aplicativo do Entra ID com Mail.Send
//   (ou RESEND_API_KEY, no lugar dos três acima)
//   ALERTA_EMAIL_PARA     destinatários internos, separados por vírgula
//   ALERTA_DIAS           opcional, padrão 30
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Estado = 'vencido' | 'proximo_vencimento';

interface DocPendente {
  documento_id: string;
  fornecedor: string;
  documento: string;
  validade: string;
  dias: number;
  estado: Estado;
}

interface CalPendente {
  calibracao_id: string;
  codigo: string;
  instrumento: string;
  area: string | null;
  certificado: string | null;
  validade: string;
  dias: number;
  estado: Estado;
}

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

const dataBR = (iso: string) => iso.split('-').reverse().join('/');
const td = 'padding:6px 12px;border-bottom:1px solid #e2e8f0';
const th = 'padding:6px 12px';

function situacao(estado: Estado, dias: number): string {
  const cor = estado === 'vencido' ? '#b91c1c' : '#b45309';
  const txt = estado === 'vencido' ? `Vencido há ${-dias} dia(s)` : dias === 0 ? 'Vence hoje' : `Vence em ${dias} dia(s)`;
  return `<td style="${td};color:${cor}">${txt}</td>`;
}

function tabela(cabecalho: string[], linhas: string[]): string {
  return `<table style="border-collapse:collapse;font-size:13px;margin-bottom:20px">
    <thead><tr style="background:#f8fafc;text-align:left">${cabecalho.map((c) => `<th style="${th}">${c}</th>`).join('')}</tr></thead>
    <tbody>${linhas.join('')}</tbody>
  </table>`;
}

function corpo(docs: DocPendente[], cals: CalPendente[]): string {
  const partes: string[] = [];
  if (cals.length > 0) {
    partes.push('<p><b>Certificados de calibração</b> (FOR-POP 05 1.4) — agende a calibração:</p>');
    partes.push(tabela(['Código', 'Equipamento', 'Certificado', 'Validade', 'Situação'], cals.map((c) => `<tr>
      <td style="${td}">${c.codigo}</td>
      <td style="${td}">${c.instrumento}${c.area ? ` — ${c.area}` : ''}</td>
      <td style="${td}">${c.certificado ?? '—'}</td>
      <td style="${td}">${dataBR(c.validade)}</td>
      ${situacao(c.estado, c.dias)}
    </tr>`)));
  }
  if (docs.length > 0) {
    partes.push('<p><b>Documentos de fornecedor</b>:</p>');
    partes.push(tabela(['Fornecedor', 'Documento', 'Vencimento', 'Situação'], docs.map((d) => `<tr>
      <td style="${td}">${d.fornecedor}</td>
      <td style="${td}">${d.documento}</td>
      <td style="${td}">${dataBR(d.validade)}</td>
      ${situacao(d.estado, d.dias)}
    </tr>`)));
  }
  return `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#0f172a">
    <p>Itens que precisam de atenção da Qualidade:</p>
    ${partes.join('')}
    <p style="color:#64748b;font-size:12px">Cada item é avisado uma vez quando entra nos 30 dias e outra quando vence. Detalhes no sistema, em Qualidade → Calibração e Documentos de fornecedores.</p>
  </div>`;
}

Deno.serve(async (req) => {
  try {
    // A função fica sem verificação de JWT para o cron poder chamar sem a
    // service role key; quem não manda o token certo não dispara nada.
    const supabase = createClient(
      exigir('SUPABASE_URL'),
      exigir('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'qualidade' } },
    );
    const { data: autorizado } = await supabase.rpc('alerta_cron_token_ok', { p_token: req.headers.get('x-cron-token') ?? '' });
    if (autorizado !== true) {
      return Response.json({ erro: 'Não autorizado.' }, { status: 401 });
    }

    const dias = Number(Deno.env.get('ALERTA_DIAS') ?? '30');
    const [rDocs, rCals] = await Promise.all([
      supabase.rpc('alertas_documento_pendentes', { p_dias: dias }),
      supabase.rpc('alertas_calibracao_pendentes', { p_dias: dias }),
    ]);
    if (rDocs.error) throw new Error(rDocs.error.message);
    if (rCals.error) throw new Error(rCals.error.message);
    const docs = (rDocs.data ?? []) as DocPendente[];
    const cals = (rCals.data ?? []) as CalPendente[];

    if (docs.length === 0 && cals.length === 0) {
      return Response.json({ enviados: 0, mensagem: 'Nada pendente.' });
    }

    const vencidos = [...docs, ...cals].filter((i) => i.estado === 'vencido').length;
    const total = docs.length + cals.length;
    await enviarEmail(
      exigir('ALERTA_EMAIL_PARA').split(',').map((e) => e.trim()),
      `Qualidade — ${vencidos} vencido(s), ${total - vencidos} vencendo em até ${dias} dias`,
      corpo(docs, cals),
    );

    // Só marca depois que o e-mail saiu.
    for (const d of docs) {
      const { error } = await supabase.rpc('registrar_alerta_documento', { p_documento_id: d.documento_id, p_tipo: d.estado });
      if (error) console.error('Falha ao registrar alerta de documento', d.documento_id, error.message);
    }
    for (const c of cals) {
      const { error } = await supabase.rpc('registrar_alerta_calibracao', { p_calibracao_id: c.calibracao_id, p_tipo: c.estado });
      if (error) console.error('Falha ao registrar alerta de calibração', c.calibracao_id, error.message);
    }

    return Response.json({ enviados: total, documentos: docs.length, calibracoes: cals.length, vencidos });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    console.error(mensagem);
    return Response.json({ erro: mensagem }, { status: 500 });
  }
});
