// Alerta diário de documentos de fornecedor vencidos / a vencer.
//
// Lê o que ainda não foi avisado (qualidade.alertas_documento_pendentes),
// manda UM e-mail com a lista e só então marca cada item como enviado — se o
// envio falhar, nada é marcado e o alerta volta amanhã.
//
// Variáveis de ambiente (Supabase → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (injetadas pela plataforma)
//   RESEND_API_KEY        chave do provedor de e-mail
//   ALERTA_EMAIL_DE       remetente verificado, ex. sistema@suaempresa.com.br
//   ALERTA_EMAIL_PARA     destinatários internos, separados por vírgula
//   ALERTA_DIAS           opcional, padrão 30
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface Pendente {
  documento_id: string;
  fornecedor: string;
  documento: string;
  validade: string;
  dias: number;
  estado: 'vencido' | 'proximo_vencimento';
}

function exigir(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return v;
}

const dataBR = (iso: string) => iso.split('-').reverse().join('/');

function corpo(itens: Pendente[]): string {
  const linha = (p: Pendente) =>
    `<tr>
       <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${p.fornecedor}</td>
       <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${p.documento}</td>
       <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${dataBR(p.validade)}</td>
       <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:${p.estado === 'vencido' ? '#b91c1c' : '#b45309'}">
         ${p.estado === 'vencido' ? 'Vencido' : `Vence em ${p.dias} dia(s)`}
       </td>
     </tr>`;

  return `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#0f172a">
    <p>Documentos de fornecedor que precisam de atenção:</p>
    <table style="border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#f8fafc;text-align:left">
          <th style="padding:6px 12px">Fornecedor</th>
          <th style="padding:6px 12px">Documento</th>
          <th style="padding:6px 12px">Vencimento</th>
          <th style="padding:6px 12px">Situação</th>
        </tr>
      </thead>
      <tbody>${itens.map(linha).join('')}</tbody>
    </table>
  </div>`;
}

Deno.serve(async () => {
  try {
    const supabase = createClient(
      exigir('SUPABASE_URL'),
      exigir('SUPABASE_SERVICE_ROLE_KEY'),
      { db: { schema: 'qualidade' } },
    );

    const dias = Number(Deno.env.get('ALERTA_DIAS') ?? '30');
    const { data, error } = await supabase.rpc('alertas_documento_pendentes', { p_dias: dias });
    if (error) throw new Error(error.message);

    const itens = (data ?? []) as Pendente[];
    if (itens.length === 0) {
      return Response.json({ enviados: 0, mensagem: 'Nada pendente.' });
    }

    const vencidos = itens.filter((i) => i.estado === 'vencido').length;
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${exigir('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: exigir('ALERTA_EMAIL_DE'),
        to: exigir('ALERTA_EMAIL_PARA').split(',').map((s) => s.trim()),
        subject: `Documentos de fornecedor — ${vencidos} vencido(s), ${itens.length - vencidos} a vencer`,
        html: corpo(itens),
      }),
    });
    if (!resp.ok) throw new Error(`Falha no envio do e-mail: ${resp.status} ${await resp.text()}`);

    // Só marca depois que o e-mail saiu.
    for (const i of itens) {
      const { error: e } = await supabase.rpc('registrar_alerta_documento', {
        p_documento_id: i.documento_id,
        p_tipo: i.estado,
      });
      if (e) console.error('Falha ao registrar alerta', i.documento_id, e.message);
    }

    return Response.json({ enviados: itens.length, vencidos });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    console.error(mensagem);
    return Response.json({ erro: mensagem }, { status: 500 });
  }
});
