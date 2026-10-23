// Painel da Qualidade: análises por cliente (FOR-CQ-001/002) e PCC do processo
// (forno, detector, ímãs) no período escolhido. Só lê o que já é registrado.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listAnalisesPeriodo, listClientes, listLeiturasFornoDesde, listPontosControle,
  listVerificacoesDMDesde, listVerificacoesImaDesde, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import {
  indicadoresPorCliente, aprovacaoPorDia, indicadoresPcc, percentual, TIPO_FARINHA_LABEL,
} from '@sistema/domain';
import type { TipoFarinha } from '@sistema/domain';
import { PageHeader, Card, CardTitle, Spinner, ErroCarregamento } from '../../components/ui';
import { Kpi } from '../painel/comum';

const PERIODOS = [7, 30, 90] as const;
const fmt = (v: number | null, casas = 1) => (v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: casas }));
const fmtPct = (v: number | null) => (v == null ? '—' : `${fmt(v)}%`);

export function PainelQualidadePage() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(7);

  const { data, loading, error } = useAsync(async () => {
    const hoje = new Date();
    const inicio = new Date(hoje.getTime() - (dias - 1) * 86_400_000);
    const de = hojeLocalISO(inicio);
    const desdeISO = new Date(`${de}T00:00:00`).toISOString();
    const [{ analises, valores }, clientes, leituras, pontos, dm, imas] = await Promise.all([
      listAnalisesPeriodo(de, hojeLocalISO(hoje)), listClientes(), listLeiturasFornoDesde(desdeISO),
      listPontosControle(), listVerificacoesDMDesde(desdeISO), listVerificacoesImaDesde(desdeISO),
    ]);
    const c1 = pontos.find((p) => p.codigo === 'CCP-01');
    const c2 = pontos.find((p) => p.codigo === 'CCP-02');
    const limites = { tempSaidaMin: c1?.limite_min ?? null, tempSaidaMax: c1?.limite_max ?? null, umidadeMax: c2?.limite_max ?? null };
    return {
      de,
      analises,
      grupos: indicadoresPorCliente(analises, valores),
      porDia: aprovacaoPorDia(analises),
      pcc: indicadoresPcc(leituras, limites, dm, imas),
      clientes: mapBy(clientes, 'id'),
    };
  }, [dias]);

  const total = data?.analises.length ?? 0;
  const aprovadas = data?.analises.filter((a) => a.conforme).length ?? 0;
  const lotes = new Set(data?.analises.map((a) => a.lote_codigo ?? a.lote_id).filter(Boolean)).size;
  const pcc = data?.pcc;

  return (
    <>
      <PageHeader grupo="Qualidade" title="Painel da Qualidade"
        subtitle={data ? `De ${formatarData(data.de)} até hoje` : 'Indicadores do período'}
        action={
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {PERIODOS.map((p) => (
              <button key={p} type="button" onClick={() => setDias(p)} aria-pressed={dias === p}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${dias === p ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {p} dias
              </button>
            ))}
          </div>
        } />

      {error && <ErroCarregamento mensagem={error} />}
      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {data && pcc && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Análises por cliente</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Análises de bag" valor={String(total)} sub={`${lotes} lote(s)`} />
              <Kpi label="Aprovação" valor={fmtPct(percentual(aprovadas, total))}
                sub={`${total - aprovadas} reprovada(s)`} tom={total - aprovadas > 0 ? 'alerta' : 'neutro'} />
              <Kpi label="Clientes / tipos" valor={String(data.grupos.length)} sub="combinações com análise" />
              <Kpi label="Dias com análise" valor={String(data.porDia.length)} sub={`de ${dias} dias`} />
            </div>

            {data.porDia.length > 0 && <GraficoAprovacao dias={data.porDia} />}

            <Card className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11.5px] font-bold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-[11px]">Cliente</th>
                    <th className="px-3 py-[11px]">Farinha</th>
                    <th className="px-3 py-[11px] text-right">Análises</th>
                    <th className="px-3 py-[11px] text-right">Aprovação</th>
                    <th className="px-3 py-[11px]">Média por ensaio (fora do limite)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.grupos.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Nenhuma análise no período. <Link to="/acompanhamento" className="font-semibold text-brand-600">Registrar análise</Link></td></tr>
                  )}
                  {data.grupos.map((g) => {
                    const ap = percentual(g.aprovadas, g.analises);
                    return (
                      <tr key={`${g.cliente_id}|${g.tipo_farinha}`}>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{g.cliente_id ? data.clientes.get(g.cliente_id)?.nome ?? '—' : 'Sem cliente'}</td>
                        <td className="px-3 py-2.5 text-slate-600">{g.tipo_farinha ? TIPO_FARINHA_LABEL[g.tipo_farinha as TipoFarinha] : '—'}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{g.analises}<span className="text-xs text-slate-400"> · {g.lotes} lote(s)</span></td>
                        <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${ap != null && ap < 100 ? 'text-amber-700' : 'text-slate-800'}`}>{fmtPct(ap)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {g.ensaios.map((e) => (
                              <span key={e.ensaio} className={`rounded-md border px-2 py-0.5 text-[11.5px] ${e.fora > 0 ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 text-slate-600'}`}>
                                {e.ensaio.replace('Granulometria ', '')}: <b className="tabular-nums">{fmt(e.media, 2)}</b>
                                {e.fora > 0 && <> · ⚠ {e.fora} fora</>}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">PCC do processo</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              <Card className="p-4">
                <CardTitle>Forno (FOR PQSA 8)</CardTitle>
                <Linha rotulo="Leituras" valor={String(pcc.forno.leituras)} />
                <Linha rotulo="Fora do limite (temp./umidade)" valor={String(pcc.forno.desvios)} alerta={pcc.forno.desvios > 0}
                  extra={fmtPct(percentual(pcc.forno.desvios, pcc.forno.leituras))} />
                <Linha rotulo="Temp. de saída média" valor={pcc.forno.temSaida == null ? '—' : `${fmt(pcc.forno.temSaida)} °C`} />
                <Linha rotulo="Umidade média" valor={pcc.forno.umidade == null ? '—' : `${fmt(pcc.forno.umidade, 2)}%`} />
                <Link to="/pcc-fisico?aba=forno" className="mt-2 inline-block text-xs font-semibold text-brand-600">Abrir forno →</Link>
              </Card>
              <Card className="p-4">
                <CardTitle>Detector de metais (FOR PQSA 11)</CardTitle>
                <Linha rotulo="Testes" valor={String(pcc.detector.testes)} extra={pcc.detector.nhp ? `+ ${pcc.detector.nhp} NHP` : undefined} />
                <Linha rotulo="Falhas (não detectou)" valor={String(pcc.detector.falhas)} alerta={pcc.detector.falhas > 0} />
                <Linha rotulo="Intervalos acima de 2h15" valor={String(pcc.detector.atrasos)} alerta={pcc.detector.atrasos > 0} />
                <Link to="/pcc-fisico?aba=detector" className="mt-2 inline-block text-xs font-semibold text-brand-600">Abrir detector →</Link>
              </Card>
              <Card className="p-4">
                <CardTitle>Ímãs (FOR PQSA 09)</CardTitle>
                <Linha rotulo="Verificações" valor={String(pcc.imas.verificacoes)} />
                <Linha rotulo="Com material retido" valor={String(pcc.imas.comMaterial)} alerta={pcc.imas.comMaterial > 0}
                  extra={fmtPct(percentual(pcc.imas.comMaterial, pcc.imas.verificacoes))} />
                <Linha rotulo="Material total" valor={`${fmt(pcc.imas.gramas)} g`} />
                <Link to="/pcc-fisico?aba=imas" className="mt-2 inline-block text-xs font-semibold text-brand-600">Abrir ímãs →</Link>
              </Card>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Linha({ rotulo, valor, extra, alerta = false }: { rotulo: string; valor: string; extra?: string; alerta?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-1.5 text-[13px] last:border-0">
      <span className="text-slate-500">{rotulo}</span>
      <span className={`font-semibold tabular-nums ${alerta ? 'text-red-700' : 'text-slate-800'}`}>
        {alerta && '⚠ '}{valor}{extra && <span className="ml-1 text-xs font-normal text-slate-400">{extra}</span>}
      </span>
    </div>
  );
}

// Barras de % aprovado por dia (uma série, uma cor). Hover mostra o dia e os
// números; a tabela acima cobre a leitura sem cor.
function GraficoAprovacao({ dias }: { dias: { dia: string; n: number; aprovadas: number }[] }) {
  const [foco, setFoco] = useState<number | null>(null);
  const f = foco != null ? dias[foco] : null;
  return (
    <Card className="mt-3 p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <CardTitle>Aprovação por dia</CardTitle>
        <p className="text-xs text-slate-500">
          {f ? `${formatarData(f.dia)}: ${fmtPct(percentual(f.aprovadas, f.n))} (${f.aprovadas} de ${f.n})` : 'Passe o mouse sobre uma barra'}
        </p>
      </div>
      <p className="text-right text-[10px] text-slate-400">100%</p>
      <div className="relative h-36" onMouseLeave={() => setFoco(null)}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
        <div className="flex h-full items-end gap-[2px]">
          {dias.map((d, i) => {
            const p = percentual(d.aprovadas, d.n) ?? 0;
            return (
              <button key={d.dia} type="button" onMouseEnter={() => setFoco(i)} onFocus={() => setFoco(i)}
                aria-label={`${formatarData(d.dia)}: ${fmt(p)}% aprovado`}
                className="group flex h-full min-w-0 max-w-[48px] flex-1 items-end">
                <span className={`w-full rounded-t-[4px] transition ${foco === i ? 'bg-brand-700' : 'bg-brand-500'}`}
                  style={{ height: `${Math.max(p, 2)}%` }} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[10.5px] text-slate-400">
        <span>{formatarData(dias[0]!.dia)}</span>
        <span>{formatarData(dias[dias.length - 1]!.dia)}</span>
      </div>
    </Card>
  );
}
