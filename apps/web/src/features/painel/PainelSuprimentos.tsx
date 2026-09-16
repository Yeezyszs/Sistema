// Painel do comprador de mandioca: o que foi combinado, o que chegou e a que
// preço. As três perguntas que ele faz todo dia — quem falta chegar hoje, em
// quem dá para confiar na previsão, e se o custo cabe no teto.
//
// Tudo é medido em cargas contra cargas: a tonelagem varia por produtor, então
// converter carga em quilo seria inventar número. O dinheiro, esse, sai sempre
// do peso real da balança.
import { Link } from 'react-router-dom';
import {
  listProdutores, listPrevisaoDeSemanas, listDiasDaPrevisao,
  listRecebimentosPeriodo, listParametrosSemana,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarReais, hojeLocalISO } from '../../lib/format';
import {
  custoTFarinha, tetoCusto, rendaMaxima, segundaDaSemana, somarDias,
} from '@sistema/domain';
import {
  Card, CardTitle, Spinner, ErroCarregamento, EmptyState, LINHA_CABECALHO,
} from '../../components/ui';
import { Kpi } from './comum';

// Quatro semanas é o horizonte que o comprador enxerga: o bastante para a
// assertividade significar hábito, curto o bastante para refletir o momento.
const SEMANAS = 4;

export function PainelSuprimentos() {
  const { data, loading, error } = useAsync(async () => {
    const semanaAtual = segundaDaSemana(hojeLocalISO());
    const semanas = Array.from({ length: SEMANAS }, (_, i) => somarDias(semanaAtual, -7 * i));
    const inicio = semanas[semanas.length - 1]!;
    const [produtores, linhas, parametros, cargas] = await Promise.all([
      listProdutores(),
      listPrevisaoDeSemanas(semanas),
      listParametrosSemana(),
      listRecebimentosPeriodo(inicio, somarDias(semanaAtual, 5)),
    ]);
    const dias = await listDiasDaPrevisao(linhas.map((l) => l.id));
    return { semanaAtual, semanas, produtores, linhas, dias, parametros, cargas };
  }, []);

  if (error || (loading === false && !data)) return <ErroCarregamento mensagem={error} />;
  if (loading || !data) {
    return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  }

  const hoje = hojeLocalISO();
  const { semanaAtual } = data;
  const diasDaSemana = Array.from({ length: 6 }, (_, i) => somarDias(semanaAtual, i));
  const param = data.parametros.find((p) => p.semana_inicio === semanaAtual) ?? null;
  const limiteRenda = param ? rendaMaxima(param.preco_renda, param.preco_farinha, param.teto_pct) : null;

  const nomeDoProdutor = new Map(data.produtores.map((p) => [p.id, p.razao_social]));
  const linhaPorId = new Map(data.linhas.map((l) => [l.id, l]));

  // Previsto por (produtor, dia) — a linha da previsão é por semana, a célula
  // é por dia.
  const previstoNoDia = new Map<string, number>();
  const previstoPorProdutor = new Map<string, number>();
  for (const d of data.dias) {
    const linha = linhaPorId.get(d.previsao_id);
    if (!linha) continue;
    // O dia de hoje fica fora da assertividade: a carga combinada para hoje
    // ainda pode chegar à tarde, e cobrá-la agora faria todo produtor parecer
    // devedor. Hoje é assunto do quadro "Hoje no pátio".
    previstoNoDia.set(`${linha.fornecedor_id}|${d.data}`, d.cargas);
    if (d.data < hoje) {
      previstoPorProdutor.set(linha.fornecedor_id, (previstoPorProdutor.get(linha.fornecedor_id) ?? 0) + d.cargas);
    }
  }

  const chegouNoDia = new Map<string, number>();
  const chegouPorProdutor = new Map<string, number>();
  for (const c of data.cargas) {
    if (!c.fornecedor_id) continue;
    const dia = c.recebido_em.slice(0, 10);
    chegouNoDia.set(`${c.fornecedor_id}|${dia}`, (chegouNoDia.get(`${c.fornecedor_id}|${dia}`) ?? 0) + 1);
    if (dia < hoje) {
      chegouPorProdutor.set(c.fornecedor_id, (chegouPorProdutor.get(c.fornecedor_id) ?? 0) + 1);
    }
  }

  const cargasHoje = data.cargas.filter((c) => c.recebido_em.slice(0, 10) === hoje);
  const previstoHoje = [...previstoNoDia.entries()]
    .filter(([k]) => k.endsWith(`|${hoje}`))
    .reduce((s, [, v]) => s + v, 0);

  // Aderência do período: só os dias já vencidos, em cargas.
  const previstoVencido = [...previstoPorProdutor.values()].reduce((s, v) => s + v, 0);
  const chegouVencido = [...chegouPorProdutor.values()].reduce((s, v) => s + v, 0);
  const aderencia = previstoVencido > 0 ? Math.round((chegouVencido / previstoVencido) * 100) : null;

  // Custo médio da farinha, ponderado pelo peso de cada carga — carga grande
  // pesa mais na média do que carga pequena, que é como o custo se forma.
  const cargasDaSemana = data.cargas.filter((c) => c.recebido_em.slice(0, 10) >= semanaAtual);
  let pesoTotal = 0;
  let custoPonderado = 0;
  for (const c of cargasDaSemana) {
    const custo = custoTFarinha(c.renda, c.preco_renda);
    if (custo == null || !c.quantidade) continue;
    pesoTotal += c.quantidade;
    custoPonderado += custo * c.quantidade;
  }
  const custoMedio = pesoTotal > 0 ? custoPonderado / pesoTotal : null;
  const teto = param ? tetoCusto(param.preco_farinha, param.teto_pct) : null;

  const acimaDoTeto = data.cargas.filter((c) => {
    const custo = custoTFarinha(c.renda, c.preco_renda);
    const t = tetoCusto(c.preco_farinha, c.teto_pct ?? 58);
    return custo != null && t != null && custo > t;
  });

  // Quem estava combinado para hoje e ainda não apareceu.
  const faltamHoje = data.produtores
    .map((p) => ({
      id: p.id,
      nome: p.razao_social,
      previsto: previstoNoDia.get(`${p.id}|${hoje}`) ?? 0,
      chegou: chegouNoDia.get(`${p.id}|${hoje}`) ?? 0,
    }))
    .filter((l) => l.previsto > 0 || l.chegou > 0)
    .sort((a, b) => (b.previsto - b.chegou) - (a.previsto - a.chegou));

  // Assertividade: quem cumpre o que combina, nas semanas medidas.
  const desempenho = [...previstoPorProdutor.entries()]
    .map(([id, previsto]) => {
      const chegou = chegouPorProdutor.get(id) ?? 0;
      return { id, nome: nomeDoProdutor.get(id) ?? '—', previsto, chegou, pct: Math.round((chegou / previsto) * 100) };
    })
    .sort((a, b) => a.pct - b.pct);

  return (
    <>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Cargas hoje" valor={String(cargasHoje.length)}
          sub={previstoHoje > 0 ? `de ${previstoHoje} previstas` : 'nada previsto para hoje'}
          tom={previstoHoje > 0 && cargasHoje.length < previstoHoje ? 'alerta' : 'neutro'} />
        <Kpi label={`Aderência (${SEMANAS} semanas)`}
          valor={aderencia == null ? '—' : `${aderencia}%`}
          sub={aderencia == null ? 'sem previsão até ontem' : `${chegouVencido} de ${previstoVencido} cargas`}
          tom={aderencia != null && aderencia < 80 ? 'alerta' : 'neutro'} />
        <Kpi label="Renda máxima hoje"
          valor={limiteRenda == null ? '—' : `${Math.floor(limiteRenda)} g`}
          sub={param ? `teto de ${formatarReais(teto)}/t` : 'preços da semana não definidos'} />
        <Kpi label="Custo médio da semana"
          valor={formatarReais(custoMedio)}
          sub={custoMedio != null && teto != null
            ? custoMedio > teto ? 'acima do teto' : `${formatarReais(teto - custoMedio)} de folga`
            : 'sem cargas com preço'}
          tom={custoMedio != null && teto != null && custoMedio > teto ? 'critico' : 'neutro'} />
      </div>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Hoje, produtor a produtor */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub={`Combinado para ${formatarData(hoje)} e o que já entrou.`}>
                Hoje no pátio
              </CardTitle>
            </div>
            {faltamHoje.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nada combinado para hoje"
                  description="Nenhuma carga prevista nem recebida hoje." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">Produtor</th>
                      <th className="px-4 py-[11px] text-right">Previsto</th>
                      <th className="px-4 py-[11px] text-right">Chegou</th>
                      <th className="px-4 py-[11px]">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faltamHoje.slice(0, 10).map((l) => {
                      const falta = l.previsto - l.chegou;
                      return (
                        <tr key={l.id}
                          className={`border-b border-slate-100 last:border-0 border-l-[3px] ${
                            falta > 0 ? 'border-l-amber-400'
                              : l.previsto === 0 ? 'border-l-sky-400' : 'border-l-emerald-500'
                          }`}>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">{l.nome}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{l.previsto}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{l.chegou}</td>
                          <td className="px-4 py-2.5 text-[12px] text-slate-500">
                            {falta > 0 ? `faltam ${falta}` : l.previsto === 0 ? 'sem previsão' : 'completo'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-[18px] py-3 text-xs text-slate-500">
              <span>Carga sem previsão não é erro — entra e aparece aqui</span>
              <Link to="/semana" className="font-semibold text-brand-700 hover:underline">
                Previsão da semana →
              </Link>
            </div>
          </Card>

          {/* Assertividade por produtor */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub={`Cargas combinadas × entregues nas últimas ${SEMANAS} semanas, até ontem.`}>
                Quem cumpre o combinado
              </CardTitle>
            </div>
            {desempenho.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Sem previsão registrada"
                  description="A assertividade aparece quando houver semana preenchida." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">Produtor</th>
                      <th className="px-4 py-[11px] text-right">Combinado</th>
                      <th className="px-4 py-[11px] text-right">Entregue</th>
                      <th className="px-4 py-[11px] text-right">Assertividade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {desempenho.slice(0, 10).map((d) => (
                      <tr key={d.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{d.nome}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{d.previsto}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{d.chegou}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                            d.pct >= 95 ? 'bg-emerald-100 text-emerald-800'
                              : d.pct >= 80 ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {d.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-[18px] py-3 text-xs text-slate-500">
              <span>Acima de 100% é quem mandou mais do que combinou</span>
              <Link to="/produtores" className="font-semibold text-brand-700 hover:underline">
                Produtores →
              </Link>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Cargas acima do teto */}
          <Card className="p-[18px]">
            <CardTitle sub={`Custo maior que o teto da semana em que a carga chegou.`}>
              Cargas acima do teto
            </CardTitle>
            {acimaDoTeto.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma carga passou do teto nas últimas {SEMANAS} semanas.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {acimaDoTeto.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 text-[12.5px]">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-800">
                        {c.produtor ?? nomeDoProdutor.get(c.fornecedor_id ?? '') ?? '—'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatarData(c.recebido_em)} · renda {c.renda ?? '—'}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-red-700">
                      {formatarReais(custoTFarinha(c.renda, c.preco_renda))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>
                {acimaDoTeto.length > 6 ? `+${acimaDoTeto.length - 6} não exibida(s)` : `${acimaDoTeto.length} carga(s)`}
              </span>
              <Link to="/recebimentos" className="font-semibold text-brand-700 hover:underline">
                Chegada da carga →
              </Link>
            </div>
          </Card>

          {/* Cargas da semana por dia */}
          <Card className="p-[18px]">
            <CardTitle sub="Cargas por dia na semana corrente.">Semana</CardTitle>
            <ul className="flex flex-col gap-2">
              {diasDaSemana.map((d) => {
                const prev = data.produtores.reduce((s, p) => s + (previstoNoDia.get(`${p.id}|${d}`) ?? 0), 0);
                const cheg = data.produtores.reduce((s, p) => s + (chegouNoDia.get(`${p.id}|${d}`) ?? 0), 0);
                return (
                  <li key={d} className="flex items-center justify-between text-[12.5px]">
                    <span className={d === hoje ? 'font-semibold text-slate-900' : 'text-slate-600'}>
                      {formatarData(d)}
                    </span>
                    <span className="tabular-nums text-slate-500">
                      <span className={d <= hoje && cheg < prev ? 'font-semibold text-amber-700' : 'text-slate-700'}>
                        {cheg}
                      </span>
                      {' / '}{prev}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* O que este painel ainda não é. */}
          <div className="rounded-[10px] border border-dashed border-slate-300 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-800">Cargas, não toneladas:</strong> a
            tonelagem muda de produtor para produtor, então previsto e entregue se comparam em
            cargas. O dinheiro sai sempre do peso real da balança.
          </div>
        </div>
      </div>
    </>
  );
}
