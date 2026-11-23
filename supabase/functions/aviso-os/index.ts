// E-mail para a Qualidade a cada O.S. aberta.
//
// Disparo: gatilho AFTER INSERT em manutencao.ordens (migration
// 20261123120000_aviso_os_email.sql) chama esta função com o id da O.S. e o
// cabeçalho x-cron-token — o mesmo segredo do Vault usado pelos alertas
// diários, conferido por qualidade.alerta_cron_token_ok().
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY, ALERTA_EMAIL_DE  (os mesmos dos alertas diários)
//   OS_EMAIL_PARA                    destinatários da Qualidade, separados por vírgula
import { createClient } from 'jsr:@supabase/supabase-js@2';

function exigir(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return v;
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

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${exigir('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: exigir('ALERTA_EMAIL_DE'),
        to: exigir('OS_EMAIL_PARA').split(',').map((s) => s.trim()),
        subject: `${os.risco_seguranca_alimentos ? '⚠ ' : ''}O.S. nº ${os.numero} aberta — ${os.setor ?? 's/ setor'} (${os.prioridade ?? 's/ prioridade'})`,
        html,
      }),
    });
    if (!resp.ok) throw new Error(`Falha no envio do e-mail: ${resp.status} ${await resp.text()}`);
    return Response.json({ enviado: true, numero: os.numero });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    console.error(mensagem);
    return Response.json({ erro: mensagem }, { status: 500 });
  }
});
