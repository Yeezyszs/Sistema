import { Link } from 'react-router-dom';
import {
  listApontamentos, listLinhas, listRecebimentos, listProgramacao, listLotes,
  listOrdensProducao, listNaoConformidades, listOrdensPcm, listParadas,
  listCalibracoes, listPedidos, listCarregamentos, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarQuantidade, hojeLocalISO } from '../../lib/format';
import {
  calcularRendimento, ncEstaAberta, situacaoCalibracao,
  STATUS_LOTE, STATUS_LOTE_LABEL,
} from '@sistema/domain';
import type { StatusLote } from '@sistema/domain';
import { PageHeader, Card, Spinner } from '../../components/ui';
import { useAuth } from '../../lib/auth';

function reais(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
  liberado: 'bg-emerald-500',
  bloqueado: 'bg-red-500',
  expedido: 'bg-slate-400',
  cancelado: 'bg-slate-300',
};

export function PainelPage() {
  const hoje = hojeLocalISO();
  const { de, ate } = semanaAtual();
  const { podeAcessarModulo } = useAuth();
  const veComercial = podeAcessarModulo('comercial');

  const { data, loading } = useAsync(async () => {
    const [apontSemana, linhas, recebimentos, prog, lotes, ops, ncs, osPcm, paradas, calibracoes, pedidos, cargas] =
      await Promise.all([
        listApontamentos(de, ate),
        listLinhas(),
        listRecebimentos(),
        listProgramacao(de, ate),
        listLotes(),
        listOrdensProducao(),
        listNaoConformidades(),
        listOrdensPcm(),
        listParadas(),
        listCalibracoes(),
        listPedidos(),
        listCarregamentos(),
      ]);
    return {
      apontSemana, recebimentos, prog, lotes, ops, ncs, osPcm, paradas, calibracoes, pedidos, cargas,
      linhas, linhasMap: mapBy(linhas, 'id'),
    };
  }, [de, ate]);

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Painel" subtitle="Operação da fábrica — dia e semana" />
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>
      </>
    );
  }

  const { apontSemana, recebimentos, prog, lotes, ops, ncs, osPcm, paradas, calibracoes, pedidos, cargas, linhas, linhasMap } = data;

  // ── Zona 1: pulso do dia ──
  const prodHoje = apontSemana.filter((a) => a.data === hoje).reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);
  const descargasHoje = recebimentos.filter((r) => r.recebido_em.slice(0, 10) === hoje);
  const raizHoje = descargasHoje.reduce((s, r) => s + (r.quantidade ?? 0), 0);
  const rendHoje = calcularRendimento(prodHoje || null, raizHoje || null);
  const metaSemana = prog.reduce((s, p) => s + (p.meta_kg ?? 0), 0);
  const realSemana = apontSemana.reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);
  const pctSemana = metaSemana > 0 ? (realSemana / metaSemana) * 100 : null;

  // ── Zona 2: fluxo da produção ──
  const apontHoje = apontSemana.filter((a) => a.data === hoje);
  const porLinha = linhas
    .map((l) => ({ codigo: l.codigo, kg: apontHoje.filter((a) => a.linha_id === l.id).reduce((s, a) => s + (a.quantidade_kg ?? 0), 0) }))
    .filter((x) => x.kg > 0);
  const semLinha = apontHoje.filter((a) => !a.linha_id).reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);
  if (semLinha > 0) porLinha.push({ codigo: 'Sem linha', kg: semLinha });
  const maxLinha = Math.max(1, ...porLinha.map((x) => x.kg));

  const porStatus = STATUS_LOTE.map((st) => ({ st, n: lotes.filter((l) => l.status === st).length })).filter((x) => x.n > 0);
  const totalLotes = lotes.length;
  const emProcesso = lotes.filter((l) => l.status === 'em_processo').length;

  // ── Zona 3: fila de ação ──
  const aguardando = lotes.filter((l) => l.status === 'aguardando_liberacao').length;
  const bloqueados = lotes.filter((l) => l.status === 'bloqueado').length;
  const opsAbertas = ops.filter((o) => o.status !== 'concluida').length;
  const ncsAbertas = ncs.filter(ncEstaAberta).length;
  const osAbertas = osPcm.filter((o) => o.status !== 'Concluído').length;
  const paradasHoje = paradas.filter((p) => p.data === hoje);
  const horasParadasHoje = paradasHoje.reduce((s, p) => s + (p.horas ?? 0), 0);
  const calibVencendo = calibracoes.filter((c) => ['a_vencer', 'vencida'].includes(situacaoCalibracao(c.valido_ate))).length;
  const carteiraAberta = pedidos.filter((p) => p.status === 'aprovado' && p.situacao !== 'carregado');
  const pedidosAExpedir = carteiraAberta.length;
  const cargasHoje = cargas.filter((c) => c.data === hoje).length;

  // ── Comercial (só para quem acessa o módulo) ──
  const kgAExpedir = carteiraAberta.reduce((s, p) => s + (p.peso_carga_kg ?? 0), 0);
  const rsEmAberto = carteiraAberta.reduce((s, p) => s + (p.valor_total_rs ?? 0), 0);
  const mesIni = `${hoje.slice(0, 7)}-01`;
  const faturamentoMes = pedidos
    .filter((p) => p.status !== 'cancelado' && p.data >= mesIni)
    .reduce((s, p) => s + (p.valor_total_rs ?? 0), 0);

  return (
    <>
      <PageHeader title="Painel" subtitle="Operação da fábrica — dia e semana" />

      {/* Zona 1 — Pulso do dia */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Produção hoje" valor={fmt(prodHoje)} unidade="kg" />
        <Kpi titulo="Rendimento hoje" valor={rendHoje != null ? rendHoje.toFixed(1) : '—'} unidade={rendHoje != null ? '%' : ''}
          tom={rendHoje != null && rendHoje > 0 ? 'ok' : 'neutro'} />
        <Kpi titulo="Raiz recebida hoje" valor={fmt(raizHoje)} unidade="kg"
          rodape={`${descargasHoje.length} descarga(s)`} />
        <Kpi titulo="Real / meta da semana" valor={pctSemana != null ? pctSemana.toFixed(0) : '—'} unidade={pctSemana != null ? '%' : ''}
          rodape={`${fmt(realSemana)} de ${fmt(metaSemana)} kg`}
          tom={pctSemana == null ? 'neutro' : pctSemana >= 100 ? 'ok' : 'alerta'} />
      </div>

      {/* Zona 2 — Fluxo da produção */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Produção por linha — hoje</h2>
            <span className="text-xs text-slate-400">{emProcesso} lote(s) em processo</span>
          </div>
          {porLinha.length === 0 ? (
            <p className="text-sm text-slate-400">Sem apontamentos hoje.</p>
          ) : (
            <div className="space-y-2.5">
              {porLinha.map((l) => (
                <div key={l.codigo} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm font-medium text-slate-600">{l.codigo}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                    <div className="h-full rounded bg-brand-500" style={{ width: `${(l.kg / maxLinha) * 100}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">{fmt(l.kg)} kg</span>
                </div>
              ))}
            </div>
          )}
        </Card>

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
      </div>

      {/* Zona 3 — Precisa de ação */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Precisa de ação</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Acao rotulo="Lotes aguardando liberação" valor={aguardando} to="/lotes" tom={aguardando > 0 ? 'alerta' : 'ok'} />
          <Acao rotulo="Lotes bloqueados" valor={bloqueados} to="/lotes" tom={bloqueados > 0 ? 'critico' : 'ok'} />
          <Acao rotulo="Não conformidades abertas" valor={ncsAbertas} to="/nao-conformidades" tom={ncsAbertas > 0 ? 'critico' : 'ok'} />
          <Acao rotulo="O.S. de manutenção abertas" valor={osAbertas} to="/manutencao" tom={osAbertas > 0 ? 'alerta' : 'ok'} />
          <Acao rotulo="Paradas de hoje" valor={horasParadasHoje > 0 ? `${horasParadasHoje.toFixed(1)} h` : 0}
            sub={`${paradasHoje.length} evento(s)`} to="/pcm-indicadores" tom={horasParadasHoje > 0 ? 'alerta' : 'ok'} />
          <Acao rotulo="Calibração vencendo / vencida" valor={calibVencendo} to="/calibracao" tom={calibVencendo > 0 ? 'alerta' : 'ok'} />
          <Acao rotulo="Ordens de produção em aberto" valor={opsAbertas} to="/ordens" tom="info" />
          <Acao rotulo="Pedidos a expedir" valor={pedidosAExpedir} to="/pedidos" tom={pedidosAExpedir > 0 ? 'info' : 'ok'} />
          <Acao rotulo="Cargas de hoje" valor={cargasHoje} to="/expedicao" tom="info" />
        </div>
      </div>

      {/* Comercial — só para quem acessa o módulo */}
      {veComercial && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Comercial</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiLink titulo="Faturamento do mês" valor={reais(faturamentoMes)} to="/analise-vendas" tom="destaque" />
            <KpiLink titulo="Valor em aberto" valor={reais(rsEmAberto)} sub="carteira não entregue" to="/carteira" />
            <KpiLink titulo="Volume a expedir" valor={`${fmt(kgAExpedir)} kg`} to="/carteira" />
            <KpiLink titulo="Pedidos em aberto" valor={String(pedidosAExpedir)} to="/carteira" />
          </div>
        </div>
      )}
    </>
  );
}

function fmt(n: number): string {
  return formatarQuantidade(n);
}

type Tom = 'neutro' | 'ok' | 'info' | 'alerta' | 'critico';

function Kpi({ titulo, valor, unidade, rodape, tom = 'neutro' }: {
  titulo: string; valor: string; unidade?: string; rodape?: string; tom?: Tom;
}) {
  const barra = tom === 'critico' ? 'bg-red-500' : tom === 'alerta' ? 'bg-amber-500' : tom === 'ok' ? 'bg-emerald-500' : 'bg-brand-600';
  return (
    <Card className="relative overflow-hidden p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${barra}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
        {valor}{unidade && <span className="ml-1 text-sm font-semibold text-slate-400">{unidade}</span>}
      </p>
      {rodape && <p className="mt-0.5 text-xs text-slate-400">{rodape}</p>}
    </Card>
  );
}

function KpiLink({ titulo, valor, sub, to, tom }: {
  titulo: string; valor: string; sub?: string; to: string; tom?: 'destaque';
}) {
  return (
    <Link to={to} className="relative block overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:bg-slate-50">
      <span className={`absolute inset-y-0 left-0 w-1 ${tom === 'destaque' ? 'bg-brand-600' : 'bg-slate-300'}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </Link>
  );
}

function Acao({ rotulo, valor, sub, to, tom }: {
  rotulo: string; valor: number | string; sub?: string; to: string; tom: Tom;
}) {
  const zero = valor === 0 || valor === '0';
  const badge = zero
    ? 'bg-slate-100 text-slate-400'
    : tom === 'critico' ? 'bg-red-100 text-red-700'
    : tom === 'alerta' ? 'bg-amber-100 text-amber-700'
    : tom === 'ok' ? 'bg-emerald-100 text-emerald-700'
    : 'bg-sky-100 text-sky-700';
  return (
    <Link to={to} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-brand-300 hover:bg-slate-50">
      <div>
        <p className="text-sm font-medium text-slate-700">{rotulo}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
      <span className={`min-w-8 shrink-0 rounded-full px-2.5 py-1 text-center text-sm font-bold tabular-nums ${badge}`}>{valor}</span>
    </Link>
  );
}
