import { Link } from 'react-router-dom';
import {
  listApontamentos, listLinhas, listRecebimentos, listProgramacao, listLotes,
  listOrdensProducao, listNaoConformidades, listOrdensPcm, listParadas,
  listCalibracoes, listPedidos, listCarregamentos, getDocumentosVencendo, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, hojeLocalISO } from '../../lib/format';
import {
  calcularRendimento, ncEstaAberta, situacaoCalibracao,
  STATUS_LOTE, STATUS_LOTE_LABEL,
} from '@sistema/domain';
import type { StatusLote } from '@sistema/domain';
import { PageHeader, Card, CardTitle, Spinner, ErroCarregamento } from '../../components/ui';
import { IconClock } from '../../components/icons';
import { useAuth } from '../../lib/auth';

const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const kg = (n: number) => formatarQuantidade(n);

// Semana corrente: segunda a sábado.
function semanaAtual(): { de: string; ate: string } {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7;
  const seg = new Date(d); seg.setDate(d.getDate() - dow);
  const sab = new Date(seg); sab.setDate(seg.getDate() + 5);
  const iso = (x: Date) => {
    const off = x.getTimezoneOffset() * 60000;
    return new Date(x.getTime() - off).toISOString().slice(0, 10);
  };
  return { de: iso(seg), ate: iso(sab) };
}

// Cor da faixa de status do lote (semântica, independente do acento da marca).
const COR_STATUS: Record<StatusLote, string> = {
  em_processo: '#6366f1',
  aguardando_liberacao: '#f59e0b',
  liberado: '#10b981',
  bloqueado: '#ef4444',
  expedido: '#94a3b8',
  cancelado: '#cbd5e1',
};

export function PainelPage() {
  const hoje = hojeLocalISO();
  const { de, ate } = semanaAtual();
  const { podeAcessarModulo } = useAuth();
  const veComercial = podeAcessarModulo('comercial');

  const { data, loading, error } = useAsync(async () => {
    const [apontSemana, linhas, recebimentos, prog, lotes, ops, ncs, osPcm, paradas, calibracoes, pedidos, cargas] =
      await Promise.all([
        listApontamentos(de, ate), listLinhas(), listRecebimentos(), listProgramacao(de, ate),
        listLotes(), listOrdensProducao(), listNaoConformidades(), listOrdensPcm(),
        listParadas(), listCalibracoes(), listPedidos(), listCarregamentos(),
      ]);
    return { apontSemana, recebimentos, prog, lotes, ops, ncs, osPcm, paradas, calibracoes, pedidos, cargas, linhas, linhasMap: mapBy(linhas, 'id') };
  }, [de, ate]);

  if (error || (loading === false && !data)) {
    return (
      <>
        <PageHeader title="Painel" subtitle="Operação da fábrica — dia e semana" />
        <ErroCarregamento mensagem={error} />
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Painel" subtitle="Operação da fábrica — dia e semana" />
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>
      </>
    );
  }

  const { apontSemana, recebimentos, prog, lotes, ops, ncs, osPcm, paradas, calibracoes, pedidos, cargas, linhas } = data;

  // ── Pulso do dia ──
  const apontHoje = apontSemana.filter((a) => a.data === hoje);
  const prodHoje = apontHoje.reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);
  const descargasHoje = recebimentos.filter((r) => r.recebido_em.slice(0, 10) === hoje);
  const raizHoje = descargasHoje.reduce((s, r) => s + (r.quantidade ?? 0), 0);
  const rendHoje = calcularRendimento(prodHoje || null, raizHoje || null);
  const metaHoje = prog.filter((p) => p.data === hoje).reduce((s, p) => s + (p.meta_kg ?? 0), 0);
  const metaSemana = prog.reduce((s, p) => s + (p.meta_kg ?? 0), 0);
  const realSemana = apontSemana.reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);
  const pctSemana = metaSemana > 0 ? (realSemana / metaSemana) * 100 : null;

  // ── Produção por linha (hoje), com meta da programação ──
  const porLinha = linhas.map((l) => {
    const feito = apontHoje.filter((a) => a.linha_id === l.id).reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);
    const meta = prog.filter((p) => p.data === hoje && p.linha_id === l.id).reduce((s, p) => s + (p.meta_kg ?? 0), 0);
    const pct = meta > 0 ? Math.min(100, Math.round((feito / meta) * 100)) : null;
    return { codigo: l.codigo, nome: l.nome, feito, meta, pct };
  });
  const semLinha = apontHoje.filter((a) => !a.linha_id).reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);

  // ── Lotes por status ──
  const porStatus = STATUS_LOTE.map((st) => ({ st, n: lotes.filter((l) => l.status === st).length })).filter((x) => x.n > 0);
  const totalLotes = lotes.length;

  // ── Fila de ação ──
  const aguardando = lotes.filter((l) => l.status === 'aguardando_liberacao').length;
  const bloqueados = lotes.filter((l) => l.status === 'bloqueado').length;
  const opsAbertas = ops.filter((o) => o.status !== 'concluida').length;
  const ncsAbertas = ncs.filter(ncEstaAberta).length;
  const osAbertas = osPcm.filter((o) => o.status !== 'Concluído').length;
  const paradasHoje = paradas.filter((p) => p.data === hoje);
  const horasParadasHoje = paradasHoje.reduce((s, p) => s + (p.horas ?? 0), 0);
  const calibVencendo = calibracoes.filter((c) => ['a_vencer', 'vencida'].includes(situacaoCalibracao(c.valido_ate))).length;
  const carteira = pedidos.filter((p) => p.status === 'aprovado' && p.situacao !== 'carregado');
  const cargasHoje = cargas.filter((c) => c.data === hoje).length;

  // ── Comercial ──
  const kgAExpedir = carteira.reduce((s, p) => s + (p.peso_carga_kg ?? 0), 0);
  const rsEmAberto = carteira.reduce((s, p) => s + (p.valor_total_rs ?? 0), 0);
  const mesIni = `${hoje.slice(0, 7)}-01`;
  const faturamentoMes = pedidos.filter((p) => p.status !== 'cancelado' && p.data >= mesIni)
    .reduce((s, p) => s + (p.valor_total_rs ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Painel"
        subtitle="Operação da fábrica — dia e semana"
        meta={formatarData(hoje)}
      />

      {/* Pulso do dia */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Produção hoje" valor={`${kg(prodHoje)} kg`}
          sub={metaHoje > 0 ? `Meta do dia: ${kg(metaHoje)} kg` : 'Sem meta programada hoje'} />
        <Kpi label="Rendimento hoje" valor={rendHoje != null ? `${rendHoje.toFixed(1)}%` : '—'}
          sub="produzido ÷ raiz descarregada" />
        <Kpi label="Raiz recebida hoje" valor={`${kg(raizHoje)} kg`}
          sub={`${descargasHoje.length} descarga(s)`} />
        <Kpi label="Real / meta semana" valor={pctSemana != null ? `${pctSemana.toFixed(0)}%` : '—'}
          sub={`${kg(realSemana)} / ${kg(metaSemana)} kg`} />
      </div>

      {/* Fluxo: linhas + status */}
      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-[18px]">
          <CardTitle>Produção por linha — hoje</CardTitle>
          <div className="flex flex-col gap-2.5">
            {porLinha.length === 0 && <p className="text-slate-400">Nenhuma linha cadastrada.</p>}
            {porLinha.map((l) => (
              l.feito === 0 ? (
                <div key={l.codigo} className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3.5 py-3">
                  <IconClock width={18} height={18} className="shrink-0 text-slate-400" />
                  <div>
                    <p className="text-[13.5px] font-semibold text-slate-700">{l.codigo} — sem apontamentos hoje</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {l.meta > 0 ? `Meta do dia: ${kg(l.meta)} kg · verificar parada` : 'Sem meta programada · verificar parada'}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={l.codigo} className="rounded-lg bg-slate-50 px-3.5 py-3">
                  <div className="mb-[7px] flex items-baseline justify-between gap-3">
                    <span className="text-[13.5px] font-semibold text-slate-900">
                      {l.codigo}{l.nome && <span className="ml-1.5 font-normal text-slate-400">{l.nome}</span>}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {kg(l.feito)} kg{l.meta > 0 && <span className="text-slate-400"> / meta {kg(l.meta)} kg</span>}
                    </span>
                  </div>
                  <div className="h-[7px] overflow-hidden rounded bg-slate-200">
                    <div className="h-full rounded transition-[width]"
                      style={{
                        width: `${l.pct ?? 100}%`,
                        background: l.pct == null ? '#6366f1' : l.pct >= 95 ? '#059669' : l.pct >= 75 ? '#2563eb' : '#d97706',
                      }} />
                  </div>
                </div>
              )
            ))}
            {semLinha > 0 && (
              <p className="text-xs text-slate-400">+ {kg(semLinha)} kg apontados sem linha definida.</p>
            )}
          </div>
        </Card>

        <Card className="p-[18px]">
          <CardTitle sub={`${totalLotes} lote(s) no total`}>Lotes por status</CardTitle>
          {totalLotes === 0 ? (
            <p className="text-slate-400">Nenhum lote cadastrado.</p>
          ) : (
            <>
              <div className="mb-3.5 flex h-3 overflow-hidden rounded-md">
                {porStatus.map(({ st, n }) => (
                  <div key={st} title={STATUS_LOTE_LABEL[st]}
                    style={{ width: `${(n / totalLotes) * 100}%`, background: COR_STATUS[st] }} />
                ))}
              </div>
              <div className="flex flex-col gap-2.5">
                {porStatus.map(({ st, n }) => (
                  <div key={st} className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_STATUS[st] }} />
                      {STATUS_LOTE_LABEL[st]}
                    </span>
                    <span className="tabular-nums text-slate-500">{n} de {totalLotes}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <Link to="/lotes" className="mt-4 inline-block text-xs font-semibold text-brand-700 hover:underline">Ver lotes →</Link>
        </Card>
      </div>

      {/* Precisa de ação */}
      <Card className="mt-3.5 p-[18px]">
        <CardTitle>Precisa de ação</CardTitle>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          <Acao n={aguardando} label="Lotes aguardando liberação" to="/lotes" tom="alerta" />
          <Acao n={bloqueados} label="Lotes bloqueados" to="/lotes" tom="critico" />
          <Acao n={ncsAbertas} label="Não conformidades abertas" to="/nao-conformidades" tom="critico" />
          <Acao n={osAbertas} label="O.S. de manutenção abertas" to="/manutencao" tom="alerta" />
          <Acao n={horasParadasHoje > 0 ? `${horasParadasHoje.toFixed(1)} h` : 0}
            label={`Paradas de hoje${paradasHoje.length ? ` · ${paradasHoje.length} evento(s)` : ''}`}
            to="/pcm-indicadores" tom="alerta" />
          <Acao n={calibVencendo} label="Calibração vencendo / vencida" to="/calibracao" tom="alerta" />
          <Acao n={opsAbertas} label="Ordens de produção em aberto" to="/ordens" tom="info" />
          <Acao n={carteira.length} label="Pedidos a expedir" to="/pedidos" tom="info" />
          <Acao n={cargasHoje} label="Cargas de hoje" to="/expedicao" tom="info" />
        </div>
      </Card>

      {/* Documentos de fornecedor — bloco próprio: se a consulta falhar, o
          painel não pode dizer que está tudo em dia. */}
      {podeAcessarModulo('documentos') && <BlocoDocumentos />}

      {/* Comercial — só para quem acessa o módulo */}
      {veComercial && (
        <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <KpiLink label="Faturamento do mês" valor={reais(faturamentoMes)} to="/analise-vendas" destaque />
          <KpiLink label="Valor em aberto" valor={reais(rsEmAberto)} sub="carteira não entregue" to="/carteira" />
          <KpiLink label="Volume a expedir" valor={`${kg(kgAExpedir)} kg`} to="/carteira" />
          <KpiLink label="Pedidos em aberto" valor={String(carteira.length)} to="/carteira" />
        </div>
      )}
    </>
  );
}

// Documentos de fornecedor vencidos / a vencer em 30 dias.
function BlocoDocumentos() {
  const { data, loading, error } = useAsync(() => getDocumentosVencendo(30), []);

  if (loading) return null;

  if (error) {
    return (
      <Card className="mt-3.5 p-[18px]">
        <CardTitle>Documentos de fornecedor</CardTitle>
        <p className="text-sm font-semibold text-red-700">Não foi possível verificar a situação documental.</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
      </Card>
    );
  }
  if (!data || data.length === 0) return null;

  const vencidos = data.filter((d) => d.estado === 'vencido');

  return (
    <Card className="mt-3.5 p-[18px]">
      <CardTitle sub="Vencidos ou a vencer nos próximos 30 dias.">Documentos de fornecedor</CardTitle>
      <ul className="divide-y divide-slate-100">
        {data.slice(0, 8).map((d) => (
          <li key={d.documento_id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block truncate text-sm text-slate-800">{d.documento}</span>
              <span className="block truncate text-xs text-slate-400">{d.fornecedor}</span>
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              d.estado === 'vencido' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {d.estado === 'vencido'
                ? `Vencido em ${formatarData(d.validade)}`
                : `Vence em ${d.dias} dia${d.dias === 1 ? '' : 's'}`}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {vencidos.length > 0 ? `${vencidos.length} já vencido(s)` : 'Nenhum vencido'}
          {data.length > 8 ? ` · +${data.length - 8} não exibido(s)` : ''}
        </span>
        <Link to="/gestao-documentos" className="text-xs font-semibold text-brand-700 hover:underline">Gestão de Documentos →</Link>
      </div>
    </Card>
  );
}

function Kpi({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <Card className="px-[18px] py-4">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold leading-none tabular-nums text-slate-900">{valor}</p>
      {sub && <p className="mt-1.5 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

function KpiLink({ label, valor, sub, to, destaque }: {
  label: string; valor: string; sub?: string; to: string; destaque?: boolean;
}) {
  return (
    <Link to={to}
      className={`block rounded-[10px] border bg-white px-[18px] py-4 transition hover:border-brand-300 ${
        destaque ? 'border-brand-200' : 'border-slate-200'
      }`}>
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold leading-none tabular-nums ${destaque ? 'text-brand-700' : 'text-slate-900'}`}>{valor}</p>
      {sub && <p className="mt-1.5 text-xs text-slate-500">{sub}</p>}
    </Link>
  );
}

// Tile de ação: cor por severidade; zero fica apagado (nada a fazer).
function Acao({ n, label, to, tom }: {
  n: number | string; label: string; to: string; tom: 'critico' | 'alerta' | 'info';
}) {
  const zero = n === 0 || n === '0';
  const estilo = zero
    ? 'border-slate-200 bg-slate-50 text-slate-400'
    : tom === 'critico' ? 'border-red-200 bg-red-50 text-red-600'
    : tom === 'alerta' ? 'border-amber-200 bg-amber-50 text-amber-600'
    : 'border-brand-100 bg-brand-50 text-brand-700';
  const corRotulo = zero
    ? 'text-slate-400'
    : tom === 'critico' ? 'text-red-900' : tom === 'alerta' ? 'text-amber-900' : 'text-brand-900';
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-[9px] border px-3.5 py-3 transition hover:brightness-[0.98] ${estilo}`}>
      <span className="min-w-7 text-xl font-extrabold tabular-nums">{n}</span>
      <span className={`text-[12.5px] leading-tight ${corRotulo}`}>{label}</span>
    </Link>
  );
}
