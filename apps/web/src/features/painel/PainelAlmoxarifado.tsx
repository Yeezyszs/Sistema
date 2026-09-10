// Painel do almoxarifado: o que vai faltar e o que saiu da mão dele.
// Nada de produção aqui — quem abre este painel não acessa lotes nem linhas.
import { Link } from 'react-router-dom';
import { listAlmoxItens, listAlmoxMovimentos, listOrdensPcm, mapBy } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarQuantidade, hojeLocalISO } from '../../lib/format';
import { abaixoDoMinimo, CATEGORIA_ALMOX_LABEL } from '@sistema/domain';
import type { AlmoxItem, AlmoxMovimento, CategoriaAlmox } from '@sistema/domain';
import {
  Card, CardTitle, Spinner, ErroCarregamento, EmptyState, LINHA_CABECALHO,
} from '../../components/ui';
import { Kpi } from './comum';

const reais = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Item mais urgente primeiro: zerado antes de baixo, e entre os baixos o que
// está proporcionalmente mais longe do mínimo.
function urgencia(i: AlmoxItem): number {
  return i.estoque_minimo > 0 ? i.saldo / i.estoque_minimo : 1;
}

export function PainelAlmoxarifado() {
  const hoje = hojeLocalISO();

  const { data, loading, error } = useAsync(async () => {
    const [itens, movimentos, osPcm] = await Promise.all([
      listAlmoxItens(), listAlmoxMovimentos(), listOrdensPcm(),
    ]);
    return { itens, movimentos, osPcm };
  }, []);

  if (error || (loading === false && !data)) return <ErroCarregamento mensagem={error} />;
  if (loading || !data) {
    return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  }

  const ativos = data.itens.filter((i) => i.ativo);
  const comMinimo = ativos.filter((i) => i.estoque_minimo > 0);
  const semMinimo = ativos.length - comMinimo.length;
  const repor = ativos.filter(abaixoDoMinimo).sort((a, b) => urgencia(a) - urgencia(b));
  const zerados = repor.filter((i) => i.saldo <= 0).length;
  const valorEstoque = ativos.reduce((s, i) => s + i.saldo * i.custo_medio, 0);

  const movHoje = data.movimentos.filter((m) => m.data === hoje);
  const saidasHoje = movHoje.filter((m) => m.tipo === 'saida' || m.tipo === 'consumo');
  const entradasHoje = movHoje.filter((m) => m.tipo === 'entrada').length;

  // Última entrada de cada item: a lista já vem da mais recente para a mais
  // antiga, então a primeira que aparece é a que vale.
  const ultimaEntrada = new Map<string, AlmoxMovimento>();
  for (const m of data.movimentos) {
    if (m.tipo === 'entrada' && !ultimaEntrada.has(m.item_id)) ultimaEntrada.set(m.item_id, m);
  }

  const itemPorId = mapBy(data.itens, 'id');
  const embalagens = ativos.filter((i) => i.categoria === 'embalagem');
  const emb = embalagens.reduce(
    (a, i) => ({
      estoque: a.estoque + i.saldo,
      uso: a.uso + i.qtd_uso,
      reparo: a.reparo + i.qtd_reparo,
      terceiros: a.terceiros + i.qtd_terceiros,
      manutencao: a.manutencao + i.custo_manutencao,
    }),
    { estoque: 0, uso: 0, reparo: 0, terceiros: 0, manutencao: 0 },
  );
  const emPosse = emb.estoque + emb.uso + emb.reparo;

  const osAbertas = data.osPcm
    .filter((o) => o.status !== 'Concluído')
    .sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Abaixo do mínimo" valor={String(repor.length)}
          sub={zerados > 0 ? `${zerados} zerado(s) — repor hoje` : 'nenhum zerado'}
          tom={repor.length === 0 ? 'neutro' : zerados > 0 ? 'critico' : 'alerta'} />
        <Kpi label="Valor em estoque" valor={reais(valorEstoque)}
          sub={`${ativos.length} item(ns) ativo(s)`} />
        <Kpi label="Movimentos hoje" valor={String(movHoje.length)}
          sub={`${saidasHoje.length} saída(s) · ${entradasHoje} entrada(s)`} />
        <Kpi label="Sem mínimo definido" valor={String(semMinimo)}
          sub="não entram no alerta de reposição"
          tom={semMinimo > 0 ? 'alerta' : 'neutro'} />
      </div>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="flex flex-col gap-3.5">
          {/* Repor agora */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub="Saldo no mínimo ou abaixo dele.">Repor agora</CardTitle>
            </div>
            {repor.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nenhum item abaixo do mínimo"
                  description={semMinimo > 0
                    ? `Lembrando que ${semMinimo} item(ns) ainda não têm mínimo definido e por isso nunca alertam.`
                    : 'Todo item com mínimo definido está acima dele.'} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">Item</th>
                      <th className="hidden px-4 py-[11px] lg:table-cell">Categoria</th>
                      <th className="px-4 py-[11px] text-right">Saldo</th>
                      <th className="px-4 py-[11px] text-right">Mínimo</th>
                      <th className="hidden px-4 py-[11px] md:table-cell">Última compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repor.slice(0, 12).map((i) => {
                      const ult = ultimaEntrada.get(i.id);
                      const zerado = i.saldo <= 0;
                      return (
                        <tr key={i.id}
                          className={`border-b border-slate-100 last:border-0 border-l-[3px] ${
                            zerado ? 'border-l-red-500' : 'border-l-amber-400'
                          }`}>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-slate-900">{i.nome}</span>
                            {i.codigo && (
                              <span className="block text-[11px] text-slate-400">
                                {i.codigo} · {i.unidade}
                              </span>
                            )}
                          </td>
                          <td className="hidden px-4 py-2.5 text-slate-600 lg:table-cell">
                            {CATEGORIA_ALMOX_LABEL[i.categoria as CategoriaAlmox] ?? i.categoria}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              zerado ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {formatarQuantidade(i.saldo)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                            {formatarQuantidade(i.estoque_minimo)}
                          </td>
                          <td className="hidden px-4 py-2.5 text-slate-600 md:table-cell">
                            {ult ? (
                              <>
                                {ult.valor_unitario != null && (
                                  <span className="tabular-nums">{reais(ult.valor_unitario)}</span>
                                )}
                                {ult.fornecedor && (
                                  <span className="block text-[11px] text-slate-400">{ult.fornecedor}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-400">sem entrada registrada</span>
                            )}
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
                {repor.length} de {comMinimo.length} item(ns) com mínimo definido
                {repor.length > 12 ? ` · +${repor.length - 12} não exibido(s)` : ''}
              </span>
              <Link to="/almoxarifado" className="font-semibold text-brand-700 hover:underline">
                Ver almoxarifado →
              </Link>
            </div>
          </Card>

          {/* Saídas de hoje */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub="Quem está consumindo, e para qual setor.">Saídas de hoje</CardTitle>
            </div>
            {saidasHoje.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nenhuma saída hoje" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">Setor</th>
                      <th className="px-4 py-[11px]">Item</th>
                      <th className="px-4 py-[11px] text-right">Qtd</th>
                      <th className="hidden px-4 py-[11px] sm:table-cell">Solicitante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saidasHoje.slice(0, 8).map((m) => {
                      const item = itemPorId.get(m.item_id);
                      return (
                        <tr key={m.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2.5 font-semibold text-slate-700">{m.setor ?? '—'}</td>
                          <td className="px-4 py-2.5 text-slate-800">{item?.nome ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {formatarQuantidade(m.quantidade, item?.unidade ?? '')}
                          </td>
                          <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">
                            {m.solicitante ?? '—'}
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
                {saidasHoje.length} saída(s) hoje
                {saidasHoje.length > 8 ? ` · +${saidasHoje.length - 8} não exibida(s)` : ''}
              </span>
              <Link to="/almoxarifado" className="font-semibold text-brand-700 hover:underline">
                Ver movimentos →
              </Link>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Embalagens fora da fábrica */}
          {embalagens.length > 0 && (
            <Card className="p-[18px]">
              <CardTitle sub="O que não está aqui dentro também é patrimônio.">
                Embalagens
              </CardTitle>
              <ul className="divide-y divide-slate-100">
                <LinhaEstado rotulo="Com terceiros" detalhe="fora da fábrica"
                  valor={emb.terceiros} tom={emb.terceiros > 0 ? 'alerta' : 'neutro'} />
                <LinhaEstado rotulo="Em reparo"
                  detalhe={emb.manutencao > 0 ? `custo acumulado ${reais(emb.manutencao)}` : undefined}
                  valor={emb.reparo} tom={emb.reparo > 0 ? 'alerta' : 'neutro'} />
                <LinhaEstado rotulo="Em uso na produção" valor={emb.uso} tom="neutro" />
                <LinhaEstado rotulo="Em estoque" valor={emb.estoque} tom="ok" />
              </ul>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {formatarQuantidade(emPosse)} em posse · {formatarQuantidade(emb.terceiros)} fora
                </span>
                <Link to="/embalagens" className="font-semibold text-brand-700 hover:underline">
                  Ver embalagens →
                </Link>
              </div>
            </Card>
          )}

          {/* O.S. abertas — é o que gera requisição de peça */}
          <Card className="p-[18px]">
            <CardTitle sub="É delas que sai a requisição de peça.">O.S. abertas</CardTitle>
            {osAbertas.length === 0 ? (
              <EmptyState title="Nenhuma O.S. aberta" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {osAbertas.slice(0, 6).map((o) => (
                  <li key={o.id} className="flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-slate-800">
                        {o.descricao ?? `O.S. ${o.numero}`}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {o.setor ?? 'sem setor'} · O.S. {o.numero}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      o.parada_equip ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {o.parada_equip ? 'Equip. parado' : o.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                {osAbertas.length} aberta(s)
                {osAbertas.length > 6 ? ` · +${osAbertas.length - 6} não exibida(s)` : ''}
              </span>
              <Link to="/manutencao" className="font-semibold text-brand-700 hover:underline">
                Ver manutenção →
              </Link>
            </div>
          </Card>

          {/* O painel não pode fingir que enxerga tudo. */}
          {semMinimo > 0 && (
            <div className="rounded-[10px] border border-dashed border-slate-300 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
              <strong className="font-semibold text-slate-800">Ponto cego:</strong> item com mínimo
              zerado nunca alerta — é assim de propósito, para o painel não virar ruído. Os{' '}
              <strong className="font-semibold text-slate-800">{semMinimo} item(ns) sem mínimo</strong>{' '}
              podem zerar sem aviso enquanto ninguém definir o mínimo deles.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function LinhaEstado({ rotulo, detalhe, valor, tom }: {
  rotulo: string; detalhe?: string; valor: number; tom: 'alerta' | 'ok' | 'neutro';
}) {
  const estilo = tom === 'alerta' ? 'bg-amber-100 text-amber-800'
    : tom === 'ok' ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-100 text-slate-600';
  return (
    <li className="flex items-baseline justify-between gap-3 py-2">
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-slate-800">{rotulo}</span>
        {detalhe && <span className="block truncate text-[11px] text-slate-400">{detalhe}</span>}
      </span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${estilo}`}>
        {formatarQuantidade(valor)}
      </span>
    </li>
  );
}
