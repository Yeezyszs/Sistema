// Painel da manutenção: o que está parado, o que atrasou e o que fazer hoje.
// Nada de produção aqui — quem abre este painel não acessa lotes nem linhas.
import { Link } from 'react-router-dom';
import {
  listOrdensPcm, listParadas, listPreventivaPcm, listLubrificacaoPcm, listLuExecucoes,
  listProducaoHoras, listAlmoxItens, listCalibracoes, listInstrumentos, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import {
  calcularIndicadores, situacaoCalibracao, abaixoDoMinimo,
  TIPO_PARADA, TRIMESTRE_PCM,
} from '@sistema/domain';
import type { OrdemPcm, LuExecucao, TipoParada, TrimestrePcm } from '@sistema/domain';
import {
  Card, CardTitle, Spinner, ErroCarregamento, EmptyState, LINHA_CABECALHO,
} from '../../components/ui';
import { Kpi } from './comum';

const PRIORIDADE_URGENTE = ['Urgente', 'Emergente'];

// Mesma formatação de horas usada em Indicadores do PCM.
const horas = (v: number | null) =>
  v == null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;

// Cor de cada tipo de parada. Só "Manutenção / Quebra" entra no MTTR/MTBF, e é
// a única em vermelho — as outras não são responsabilidade da manutenção.
const COR_PARADA: Record<TipoParada, string> = {
  'Manutenção / Quebra': '#dc2626',
  'Falta de Matéria Prima': '#d97706',
  'Queda de Energia': '#64748b',
  Outro: '#cbd5e1',
};

function diasDesde(iso: string | null): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const hoje = new Date();
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((base.getTime() - d.getTime()) / 86_400_000);
}

// Segunda da semana corrente, em ISO local.
function inicioDaSemana(): string {
  const d = new Date();
  const dow = (d.getDay() + 6) % 7;
  const seg = new Date(d.getFullYear(), d.getMonth(), d.getDate() - dow);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${seg.getFullYear()}-${p(seg.getMonth() + 1)}-${p(seg.getDate())}`;
}

function trimestreAtual(): TrimestrePcm {
  return TRIMESTRE_PCM[Math.floor(new Date().getMonth() / 3)] ?? '1º';
}

// Chave de um ponto da rota de lubrificação. O cadastro e a execução não têm
// vínculo por id — são duas planilhas — então casamos por equipamento + item.
function chaveRota(equip: string | null, item: string | null): string {
  return `${(equip ?? '').trim().toLowerCase()}|${(item ?? '').trim().toLowerCase()}`;
}

export function PainelManutencao() {
  const hoje = hojeLocalISO();

  const { data, loading, error } = useAsync(async () => {
    const [ordens, paradas, preventivas, rotas, execucoes, producao, itens, calibracoes, instrumentos] =
      await Promise.all([
        listOrdensPcm(), listParadas(), listPreventivaPcm(), listLubrificacaoPcm(),
        listLuExecucoes(), listProducaoHoras(), listAlmoxItens(), listCalibracoes(), listInstrumentos(),
      ]);
    return { ordens, paradas, preventivas, rotas, execucoes, producao, itens, calibracoes, instrumentos };
  }, []);

  if (error || (loading === false && !data)) return <ErroCarregamento mensagem={error} />;
  if (loading || !data) {
    return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  }

  // ── O.S. ──
  const abertas = data.ordens.filter((o) => o.status !== 'Concluído');
  const paradas_equip = abertas.filter((o) => o.parada_equip);
  const parandoProducao = abertas.filter((o) => o.parada_prod).length;
  const urgentes = abertas.filter((o) => PRIORIDADE_URGENTE.includes(o.prioridade ?? ''));
  // "Agora" = equipamento parado ou urgência. Mais grave primeiro.
  const agora = [...new Set([...paradas_equip, ...urgentes])].sort((a, b) => peso(b) - peso(a));
  const atrasadas = abertas
    .filter((o) => o.data_prog && o.data_prog < hoje)
    .sort((a, b) => (a.data_prog ?? '').localeCompare(b.data_prog ?? ''));

  // ── Indicadores do mês ──
  const agoraData = new Date();
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const paradasMes = data.paradas.filter((p) => p.data >= inicioMes);
  const horasPlan = data.producao
    .filter((pr) => pr.mes === agoraData.getMonth() + 1 && pr.ano === agoraData.getFullYear())
    .reduce((s, pr) => s + pr.horas, 0);
  const kpi = calcularIndicadores(paradasMes, horasPlan);

  // ── Paradas da semana, por tipo ──
  const desdeSegunda = inicioDaSemana();
  const paradasSemana = data.paradas.filter((p) => p.data >= desdeSegunda);
  const horasSemana = paradasSemana.reduce((s, p) => s + (p.horas ?? 0), 0);
  const porTipo = TIPO_PARADA
    .map((t) => ({ tipo: t, horas: paradasSemana.filter((p) => p.tipo === t).reduce((s, p) => s + (p.horas ?? 0), 0) }))
    .filter((x) => x.horas > 0)
    .sort((a, b) => b.horas - a.horas);

  // ── Preventiva do trimestre ──
  // A tabela não tem coluna de ano: o ano vem da data planejada. Linhas de
  // trimestres antigos ficariam marcadas como realizadas para sempre e
  // inflariam a aderência, então só entram as deste ano ou ainda sem data.
  const tri = trimestreAtual();
  const anoAtual = agoraData.getFullYear();
  const doTrimestre = data.preventivas.filter((p) => {
    if (p.trimestre !== tri) return false;
    const ref = p.planejada ?? p.realizada;
    return !ref || ref.slice(0, 4) === String(anoAtual);
  });
  const realizadas = doTrimestre.filter((p) => p.realizada).length;
  const pendentes = doTrimestre
    .filter((p) => !p.realizada)
    .sort((a, b) => (a.planejada ?? '9999').localeCompare(b.planejada ?? '9999'));
  const pctPreventiva = doTrimestre.length > 0 ? Math.round((realizadas / doTrimestre.length) * 100) : null;

  // ── Rota de lubrificação ──
  const ultimaExecucao = new Map<string, LuExecucao>();
  for (const e of data.execucoes) {
    const k = chaveRota(e.equip, e.item);
    const atual = ultimaExecucao.get(k);
    if (!atual || e.data > atual.data) ultimaExecucao.set(k, e);
  }
  const rota = data.rotas
    .map((r) => {
      const ult = ultimaExecucao.get(chaveRota(r.equip, r.item));
      return { r, ultima: ult?.data ?? null, dias: diasDesde(ult?.data ?? null) };
    })
    // Sem execução nenhuma primeiro, depois da mais antiga para a mais recente.
    .sort((a, b) => (b.dias ?? 99_999) - (a.dias ?? 99_999));

  // ── Peças de manutenção em falta ──
  const pecas = data.itens
    .filter((i) => i.ativo && i.categoria === 'pecas_manutencao' && abaixoDoMinimo(i))
    .sort((a, b) => a.saldo / (a.estoque_minimo || 1) - b.saldo / (b.estoque_minimo || 1));

  // ── Calibração ──
  const instrumentoPorId = mapBy(data.instrumentos, 'id');
  const calibracoesCriticas = data.calibracoes
    .map((c) => ({ c, sit: situacaoCalibracao(c.valido_ate) }))
    .filter((x) => x.sit === 'vencida' || x.sit === 'a_vencer')
    .sort((a, b) => (a.c.valido_ate ?? '').localeCompare(b.c.valido_ate ?? ''));

  return (
    <>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Equipamento parado" valor={String(paradas_equip.length)}
          sub={parandoProducao > 0 ? `${parandoProducao} parando produção` : 'nenhuma parando produção'}
          tom={paradas_equip.length > 0 ? 'critico' : 'neutro'} />
        <Kpi label="O.S. em aberto" valor={String(abertas.length)}
          sub={atrasadas.length > 0 ? `${atrasadas.length} passaram da data` : 'nenhuma atrasada'}
          tom={atrasadas.length > 0 ? 'alerta' : 'neutro'} />
        <Kpi label="Disponibilidade do mês"
          valor={kpi.disponibilidade != null ? `${kpi.disponibilidade.toFixed(1)}%` : '—'}
          sub={kpi.disponibilidade != null
            ? `MTTR ${horas(kpi.mttr)} · MTBF ${horas(kpi.mtbf)}`
            : 'sem horas planejadas no mês'} />
        <Kpi label={`Preventiva do ${tri} tri`}
          valor={doTrimestre.length > 0 ? `${realizadas} / ${doTrimestre.length}` : '—'}
          sub={pctPreventiva != null ? `${pctPreventiva}% do plano` : 'nada planejado no trimestre'}
          tom={pctPreventiva != null && pctPreventiva < 100 ? 'alerta' : 'neutro'} />
      </div>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Agora */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub="Equipamento parado ou urgência.">Agora</CardTitle>
            </div>
            {agora.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nada parado nem urgente"
                  description="Nenhuma O.S. aberta com equipamento parado ou prioridade urgente." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">O.S.</th>
                      <th className="px-4 py-[11px]">Serviço</th>
                      <th className="px-4 py-[11px] text-right">Aberta há</th>
                      <th className="px-4 py-[11px]">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agora.slice(0, 8).map((o) => (
                      <tr key={o.id}
                        className={`border-b border-slate-100 last:border-0 border-l-[3px] ${
                          o.parada_equip ? 'border-l-red-500' : 'border-l-amber-400'
                        }`}>
                        <td className="px-4 py-2.5 font-semibold tabular-nums text-slate-700">{o.numero}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-semibold text-slate-900">{o.descricao ?? 'Sem descrição'}</span>
                          <span className="block text-[11px] text-slate-400">
                            {[o.setor, o.natureza, o.req].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                          {diasDesde(o.data) != null ? `${diasDesde(o.data)} d` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <Situacao os={o} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-[18px] py-3 text-xs text-slate-500">
              <span>
                {agora.length} precisando de atenção
                {agora.length > 8 ? ` · +${agora.length - 8} não exibida(s)` : ''}
              </span>
              <Link to="/manutencao" className="font-semibold text-brand-700 hover:underline">Ver O.S. →</Link>
            </div>
          </Card>

          {/* Passaram da data */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub="Programadas e ainda em aberto.">Passaram da data</CardTitle>
            </div>
            {atrasadas.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nenhuma O.S. atrasada" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">O.S.</th>
                      <th className="px-4 py-[11px]">Serviço</th>
                      <th className="px-4 py-[11px] text-right">Programada</th>
                      <th className="px-4 py-[11px] text-right">Atraso</th>
                      <th className="hidden px-4 py-[11px] md:table-cell">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atrasadas.slice(0, 8).map((o) => {
                      const dias = diasDesde(o.data_prog);
                      return (
                        <tr key={o.id} className="border-b border-slate-100 border-l-[3px] border-l-amber-400 last:border-b-0">
                          <td className="px-4 py-2.5 font-semibold tabular-nums text-slate-700">{o.numero}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-slate-900">{o.descricao ?? 'Sem descrição'}</span>
                            <span className="block text-[11px] text-slate-400">{o.setor ?? 'sem setor'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                            {o.data_prog ? formatarData(o.data_prog) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-800">
                              {dias != null ? `${dias} d` : '—'}
                            </span>
                          </td>
                          <td className="hidden px-4 py-2.5 text-slate-600 md:table-cell">{o.tipo ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-[18px] py-3 text-xs text-slate-500">
              <span>
                {atrasadas.length} atrasada(s) de {abertas.length} aberta(s)
                {atrasadas.length > 8 ? ` · +${atrasadas.length - 8} não exibida(s)` : ''}
              </span>
              <Link to="/manutencao" className="font-semibold text-brand-700 hover:underline">Ver O.S. →</Link>
            </div>
          </Card>

          {/* Preventiva do trimestre */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub={`Plano do ${tri} trimestre de ${anoAtual}.`}>Preventiva</CardTitle>
              {doTrimestre.length > 0 && (
                <>
                  <div className="h-2.5 overflow-hidden rounded-md bg-slate-100">
                    <div className="h-full rounded-md bg-brand-600" style={{ width: `${pctPreventiva ?? 0}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-xs text-slate-500">
                    <span>{realizadas} realizada(s)</span>
                    <span className="font-semibold tabular-nums text-slate-700">{pctPreventiva}% do plano</span>
                  </div>
                </>
              )}
            </div>
            {doTrimestre.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nada planejado neste trimestre" />
              </div>
            ) : pendentes.length === 0 ? (
              <div className="px-[18px] pb-[18px] pt-3">
                <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                  Trimestre fechado — todas as preventivas foram realizadas.
                </p>
              </div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">Equipamento</th>
                      <th className="px-4 py-[11px]">Componente</th>
                      <th className="px-4 py-[11px] text-right">Planejada</th>
                      <th className="px-4 py-[11px]">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendentes.slice(0, 6).map((p) => {
                      const vencida = !!p.planejada && p.planejada < hoje;
                      return (
                        <tr key={p.id}
                          className={`border-b border-slate-100 last:border-0 border-l-[3px] ${
                            vencida ? 'border-l-amber-400' : 'border-l-transparent'
                          }`}>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">{p.equip}</td>
                          <td className="px-4 py-2.5 text-slate-600">{p.comp}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                            {p.planejada ? formatarData(p.planejada) : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              vencida ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {vencida ? 'Vencida' : 'A fazer'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-[18px] py-3 text-xs text-slate-500">
              <span>
                {pendentes.length} pendente(s)
                {pendentes.length > 6 ? ` · +${pendentes.length - 6} não exibida(s)` : ''}
              </span>
              <Link to="/preventiva" className="font-semibold text-brand-700 hover:underline">Ver preventiva →</Link>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Paradas da semana */}
          <Card className="p-[18px]">
            <CardTitle sub={`${horas(horasSemana)} desde segunda.`}>
              Paradas da semana
            </CardTitle>
            {porTipo.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Nenhuma parada lançada nesta semana.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {porTipo.map(({ tipo, horas: h }) => (
                  <li key={tipo}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="text-[12.5px] text-slate-700">{tipo}</span>
                      <span className="text-[12.5px] tabular-nums text-slate-500">
                        {horas(h)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-slate-100">
                      <div className="h-full rounded"
                        style={{ width: `${(h / horasSemana) * 100}%`, background: COR_PARADA[tipo] }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3.5 flex items-center justify-between text-xs text-slate-500">
              <span>Só quebra entra no MTTR e MTBF</span>
              <Link to="/pcm-indicadores" className="font-semibold text-brand-700 hover:underline">Indicadores →</Link>
            </div>
          </Card>

          {/* Rota de lubrificação */}
          <Card className="p-[18px]">
            <CardTitle sub="Há quanto tempo cada ponto não é lubrificado.">Rota de lubrificação</CardTitle>
            {rota.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Nenhum ponto cadastrado na rota.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {rota.slice(0, 6).map(({ r, dias }) => (
                  <li key={r.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-slate-800">
                        {r.equip ?? 'Sem equipamento'}{r.item ? ` · ${r.item}` : ''}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {[r.setor, r.lubrificante, r.frequencia].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      dias == null ? 'bg-slate-100 text-slate-500'
                        : dias >= 30 ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {dias == null ? 'sem registro' : dias === 0 ? 'hoje' : `há ${dias} d`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>{rota.length} ponto(s) na rota</span>
              <Link to="/lubrificacao" className="font-semibold text-brand-700 hover:underline">Ver lubrificação →</Link>
            </div>
          </Card>

          {/* Peças em falta */}
          {pecas.length > 0 && (
            <Card className="p-[18px]">
              <CardTitle sub="Abaixo do mínimo no almoxarifado.">Peças em falta</CardTitle>
              <ul className="divide-y divide-slate-100">
                {pecas.slice(0, 5).map((i) => (
                  <li key={i.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-slate-800">{i.nome}</span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {i.codigo ? `${i.codigo} · ` : ''}saldo {i.saldo} · mínimo {i.estoque_minimo} {i.unidade}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      i.saldo <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {i.saldo <= 0 ? 'Zerado' : 'Abaixo'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{pecas.length} peça(s) · o almoxarifado vê a mesma lista</span>
                <Link to="/almoxarifado" className="font-semibold text-brand-700 hover:underline">Ver almoxarifado →</Link>
              </div>
            </Card>
          )}

          {/* Calibração */}
          {calibracoesCriticas.length > 0 && (
            <Card className="p-[18px]">
              <CardTitle sub="Vencidas ou vencendo em 30 dias.">Calibração</CardTitle>
              <ul className="divide-y divide-slate-100">
                {calibracoesCriticas.slice(0, 5).map(({ c, sit }) => {
                  const inst = instrumentoPorId.get(c.instrumento_id);
                  return (
                    <li key={c.id} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-slate-800">
                          {inst ? `${inst.codigo} — ${inst.nome}` : 'Instrumento'}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          {c.valido_ate ? `válido até ${formatarData(c.valido_ate)}` : 'sem validade'}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        sit === 'vencida' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sit === 'vencida' ? 'Vencida' : 'A vencer'}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{calibracoesCriticas.length} de {data.calibracoes.length} registro(s)</span>
                <Link to="/calibracao" className="font-semibold text-brand-700 hover:underline">Ver calibração →</Link>
              </div>
            </Card>
          )}

          {/* O painel não pode fingir que enxerga o que não foi lançado. */}
          <div className="rounded-[10px] border border-dashed border-slate-300 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-800">Lubrificação:</strong> a frequência é
            texto livre no cadastro, então o sistema não decide o que está vencido — mostra há
            quantos dias foi a última e deixa a leitura com o mantenedor.
            {horasPlan === 0 && (
              <>
                {' '}<strong className="font-semibold text-slate-800">Disponibilidade:</strong> sem
                horas planejadas lançadas para este mês em Indicadores, não há como calculá-la.
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Ordem da fila: parar produção é pior que parar equipamento, que é pior que
// urgência declarada.
function peso(o: OrdemPcm): number {
  return (o.parada_prod ? 4 : 0) + (o.parada_equip ? 2 : 0)
    + (o.prioridade === 'Emergente' ? 1.5 : o.prioridade === 'Urgente' ? 1 : 0);
}

function Situacao({ os }: { os: OrdemPcm }) {
  if (os.parada_prod) {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Parou produção</span>;
  }
  if (os.parada_equip) {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Equip. parado</span>;
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
      {os.prioridade ?? 'Urgente'}
    </span>
  );
}
