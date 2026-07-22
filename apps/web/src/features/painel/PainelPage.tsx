import { Link } from 'react-router-dom';
import {
  listApontamentos, listRecebimentos, listProgramacao, listLotes,
  listOrdensProducao, listNaoConformidades, listOrdensPcm,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarQuantidade, hojeLocalISO } from '../../lib/format';
import {
  calcularRendimento, ncEstaAberta,
  STATUS_LOTE, STATUS_LOTE_LABEL,
} from '@sistema/domain';
import type { StatusLote } from '@sistema/domain';
import { PageHeader, Card, Spinner } from '../../components/ui';

// Semana corrente: segunda a sábado.
function semanaAtual(): { de: string; ate: string } {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  const seg = new Date(d); seg.setDate(d.getDate() - dow);
  const sab = new Date(seg); sab.setDate(seg.getDate() + 5);
  const iso = (x: Date) => {
    const off = x.getTimezoneOffset() * 60000;
    return new Date(x.getTime() - off).toISOString().slice(0, 10);
  };
  return { de: iso(seg), ate: iso(sab) };
}

const TOM_STATUS: Record<StatusLote, string> = {
  em_processo: 'bg-sky-400',
  aguardando_liberacao: 'bg-amber-400',
  liberado: 'bg-brand-500',
  bloqueado: 'bg-red-500',
  expedido: 'bg-slate-400',
  cancelado: 'bg-slate-300',
};

export function PainelPage() {
  const hoje = hojeLocalISO();
  const { de, ate } = semanaAtual();

  const { data, loading } = useAsync(async () => {
    const [apontSemana, recebimentos, prog, lotes, ops, ncs, osPcm] = await Promise.all([
      listApontamentos(de, ate),
      listRecebimentos(),
      listProgramacao(de, ate),
      listLotes(),
      listOrdensProducao(),
      listNaoConformidades(),
      listOrdensPcm(),
    ]);
    return { apontSemana, recebimentos, prog, lotes, ops, ncs, osPcm };
  }, [de, ate]);

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Painel" subtitle="Visão geral do dia e da semana" />
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>
      </>
    );
  }

  const { apontSemana, recebimentos, prog, lotes, ops, ncs, osPcm } = data;

  // Produção e rendimento do dia
  const prodHoje = apontSemana.filter((a) => a.data === hoje).reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);
  const raizHoje = recebimentos
    .filter((r) => r.recebido_em.slice(0, 10) === hoje)
    .reduce((s, r) => s + (r.quantidade ?? 0), 0);
  const rendHoje = calcularRendimento(prodHoje || null, raizHoje || null);

  // Meta x real da semana
  const metaSemana = prog.reduce((s, p) => s + (p.meta_kg ?? 0), 0);
  const realSemana = apontSemana.reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);
  const pctSemana = metaSemana > 0 ? (realSemana / metaSemana) * 100 : null;

  // Lotes por status
  const porStatus = STATUS_LOTE.map((st) => ({ st, n: lotes.filter((l) => l.status === st).length }))
    .filter((x) => x.n > 0);
  const totalLotes = lotes.length;
  const aguardando = lotes.filter((l) => l.status === 'aguardando_liberacao').length;

  // Pendências
  const opsAbertas = ops.filter((o) => o.status !== 'concluida').length;
  const ncsAbertas = ncs.filter(ncEstaAberta).length;
  const osAbertas = osPcm.filter((o) => o.status !== 'Concluído').length;

  return (
    <>
      <PageHeader title="Painel" subtitle="Visão geral do dia e da semana" />

      {/* KPIs do dia */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Produção hoje" valor={formatarQuantidade(prodHoje, 'kg')} />
        <Kpi titulo="Rendimento hoje" valor={rendHoje != null ? `${rendHoje.toFixed(1)}%` : '—'} tom={rendHoje != null && rendHoje > 0 ? 'sucesso' : 'neutro'} />
        <Kpi titulo="Real / meta da semana" valor={pctSemana != null ? `${pctSemana.toFixed(0)}%` : '—'}
          rodape={`${formatarQuantidade(realSemana)} de ${formatarQuantidade(metaSemana, 'kg')}`}
          tom={pctSemana != null && pctSemana >= 100 ? 'sucesso' : 'alerta'} />
        <Kpi titulo="Lotes ativos" valor={String(totalLotes)} rodape={`${aguardando} aguardando liberação`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Lotes por status */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Lotes por status</h2>
          {porStatus.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum lote cadastrado.</p>
          ) : (
            <div className="space-y-2.5">
              {porStatus.map(({ st, n }) => (
                <div key={st} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-sm text-slate-600">{STATUS_LOTE_LABEL[st]}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                    <div className={`h-full rounded ${TOM_STATUS[st]}`} style={{ width: `${(n / totalLotes) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold text-slate-700">{n}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/lotes" className="mt-4 inline-block text-xs font-medium text-brand-600 hover:text-brand-700">Ver lotes →</Link>
        </Card>

        {/* Pendências */}
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Precisa de atenção</h2>
          <div className="space-y-2">
            <Pendencia rotulo="Lotes aguardando liberação" n={aguardando} to="/lotes" alerta={aguardando > 0} />
            <Pendencia rotulo="Não conformidades abertas" n={ncsAbertas} to="/nao-conformidades" alerta={ncsAbertas > 0} />
            <Pendencia rotulo="Ordens de produção em aberto" n={opsAbertas} to="/ordens" />
            <Pendencia rotulo="O.S. de manutenção em aberto" n={osAbertas} to="/manutencao" alerta={osAbertas > 0} />
          </div>
        </Card>
      </div>
    </>
  );
}

function Kpi({ titulo, valor, rodape, tom = 'neutro' }: {
  titulo: string; valor: string; rodape?: string; tom?: 'neutro' | 'sucesso' | 'alerta';
}) {
  const cor = tom === 'sucesso' ? 'text-brand-600' : tom === 'alerta' ? 'text-amber-600' : 'text-slate-800';
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-1 text-2xl font-bold ${cor}`}>{valor}</p>
      {rodape && <p className="mt-0.5 text-xs text-slate-400">{rodape}</p>}
    </Card>
  );
}

function Pendencia({ rotulo, n, to, alerta = false }: {
  rotulo: string; n: number; to: string; alerta?: boolean;
}) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-slate-50">
      <span className="text-slate-600">{rotulo}</span>
      <span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${
        n === 0 ? 'bg-slate-100 text-slate-400' : alerta ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
      }`}>{n}</span>
    </Link>
  );
}
