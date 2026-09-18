// Painel do comercial: o que foi vendido e ainda não saiu, o que saiu, e o que
// existe pronto para vender.
//
// Enquanto o faturamento não entra no sistema — ele nasce no UNICO e chega
// junto com o BI —, este painel se apoia no que a fábrica já registra: pedido,
// carregamento e lote liberado. É menos do que um painel de vendas completo, e
// a tela diz isso em vez de fingir que o número não existe.
import { Link } from 'react-router-dom';
import {
  listPedidos, listCarregamentos, listLotes, listClientes, listProdutos, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, formatarReais, hojeLocalISO } from '../../lib/format';
import { SITUACAO_PEDIDO_LABEL } from '@sistema/domain';
import type { Pedido, SituacaoPedido } from '@sistema/domain';
import {
  Card, CardTitle, Spinner, ErroCarregamento, EmptyState, LINHA_CABECALHO,
} from '../../components/ui';
import { Kpi } from './comum';

const TOM_SITUACAO: Record<SituacaoPedido, string> = {
  pendente: 'bg-slate-100 text-slate-600',
  parcial: 'bg-amber-100 text-amber-800',
  completo: 'bg-sky-100 text-sky-800',
  carregado: 'bg-emerald-100 text-emerald-800',
};

// Pedido que ainda deve sair: aprovado e não carregado nem cancelado.
function aberto(p: Pedido): boolean {
  return p.status === 'aprovado' && p.situacao !== 'carregado';
}

export function PainelComercial() {
  const hoje = hojeLocalISO();
  const mes = hoje.slice(0, 7);

  const { data, loading, error } = useAsync(async () => {
    const [pedidos, carregamentos, lotes, clientes, produtos] = await Promise.all([
      listPedidos(), listCarregamentos(), listLotes(), listClientes(), listProdutos(),
    ]);
    return {
      pedidos, carregamentos, lotes,
      clientesMap: mapBy(clientes, 'id'),
      produtosMap: mapBy(produtos, 'id'),
    };
  }, []);

  if (error || (loading === false && !data)) return <ErroCarregamento mensagem={error} />;
  if (loading || !data) {
    return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  }

  const nomeCliente = (id: string | null) => (id ? data.clientesMap.get(id)?.nome ?? '—' : '—');
  const nomeProduto = (id: string | null) => (id ? data.produtosMap.get(id)?.nome ?? '—' : '—');

  // ── Carteira em aberto ──
  const emAberto = data.pedidos.filter(aberto);
  const pesoEmAberto = emAberto.reduce((s, p) => s + (p.peso_carga_kg ?? 0), 0);
  const valorEmAberto = emAberto.reduce((s, p) => s + (p.valor_total_rs ?? 0), 0);
  // Passou da data combinada e ainda não saiu — é o que o cliente cobra.
  const atrasados = emAberto
    .filter((p) => p.data && p.data < hoje)
    .sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''));
  const aguardando = [...emAberto].sort((a, b) => (a.data ?? '').localeCompare(b.data ?? ''));

  const pendentesAprovacao = data.pedidos.filter((p) => p.status === 'pendente');

  // ── Saiu no mês ──
  const doMes = data.carregamentos.filter((c) => c.status === 'carregado' && c.data?.startsWith(mes));
  const pesoMes = doMes.reduce((s, c) => s + (c.peso_kg ?? 0), 0);
  const clientesDoMes = new Set(doMes.map((c) => c.cliente_id).filter(Boolean)).size;

  // ── Pronto para vender ──
  // Só lote liberado conta: aguardando liberação é promessa, não estoque.
  const liberados = data.lotes.filter((l) => l.status === 'liberado');
  const kgLiberado = liberados.reduce((s, l) => s + (l.quantidade ?? 0), 0);
  const porProduto = new Map<string, number>();
  for (const l of liberados) {
    porProduto.set(l.produto_id, (porProduto.get(l.produto_id) ?? 0) + (l.quantidade ?? 0));
  }
  const estoquePorProduto = [...porProduto.entries()].sort((a, b) => b[1] - a[1]);

  // ── Clientes do mês, por peso carregado ──
  const pesoPorCliente = new Map<string, number>();
  for (const c of doMes) {
    if (!c.cliente_id) continue;
    pesoPorCliente.set(c.cliente_id, (pesoPorCliente.get(c.cliente_id) ?? 0) + (c.peso_kg ?? 0));
  }
  const topClientes = [...pesoPorCliente.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Pedidos em aberto" valor={String(emAberto.length)}
          sub={pesoEmAberto > 0 ? `${formatarQuantidade(pesoEmAberto)} kg a entregar` : 'nada a entregar'}
          tom={emAberto.length > 0 ? 'alerta' : 'neutro'} />
        <Kpi label="Passaram da data" valor={String(atrasados.length)}
          sub={atrasados.length > 0
            ? `o mais antigo de ${formatarData(atrasados[0]?.data ?? null)}`
            : 'nenhum pedido atrasado'}
          tom={atrasados.length > 0 ? 'critico' : 'neutro'} />
        <Kpi label="Carregado no mês" valor={`${formatarQuantidade(pesoMes)} kg`}
          sub={`${doMes.length} carregamento(s) · ${clientesDoMes} cliente(s)`} />
        <Kpi label="Pronto para vender" valor={`${formatarQuantidade(kgLiberado)} kg`}
          sub={liberados.length > 0 ? `${liberados.length} lote(s) liberado(s)` : 'nenhum lote liberado'} />
      </div>

      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* A carregar */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub="Pedidos aprovados que ainda não saíram, do mais antigo para o mais novo.">
                A carregar
              </CardTitle>
            </div>
            {aguardando.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nenhum pedido em aberto"
                  description="Pedidos aprovados e ainda não carregados aparecem aqui." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">Pedido</th>
                      <th className="px-4 py-[11px]">Cliente</th>
                      <th className="hidden px-4 py-[11px] md:table-cell">Produto</th>
                      <th className="px-4 py-[11px] text-right">Peso</th>
                      <th className="px-4 py-[11px]">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aguardando.slice(0, 10).map((p) => {
                      const atrasado = !!p.data && p.data < hoje;
                      return (
                        <tr key={p.id}
                          className={`border-b border-slate-100 last:border-0 border-l-[3px] ${
                            atrasado ? 'border-l-red-500' : 'border-l-transparent'
                          }`}>
                          <td className="px-4 py-2.5">
                            <span className="font-semibold text-slate-900">nº {p.numero}</span>
                            <span className="block text-[11px] text-slate-400">
                              {formatarData(p.data)}{atrasado ? ' · atrasado' : ''}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">{nomeCliente(p.cliente_id)}</td>
                          <td className="hidden px-4 py-2.5 text-slate-600 md:table-cell">
                            {nomeProduto(p.produto_id)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                            {p.peso_carga_kg != null ? `${formatarQuantidade(p.peso_carga_kg)} kg` : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TOM_SITUACAO[p.situacao]}`}>
                              {SITUACAO_PEDIDO_LABEL[p.situacao]}
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
                {valorEmAberto > 0 ? `${formatarReais(valorEmAberto)} em carteira` : 'carteira sem valor lançado'}
                {aguardando.length > 10 ? ` · +${aguardando.length - 10} não exibido(s)` : ''}
              </span>
              <Link to="/pedidos" className="font-semibold text-brand-700 hover:underline">Pedidos →</Link>
            </div>
          </Card>

          {/* Saiu recentemente */}
          <Card className="overflow-hidden">
            <div className="px-[18px] pt-[18px]">
              <CardTitle sub="Últimos carregamentos, com placa e nota.">Saiu da fábrica</CardTitle>
            </div>
            {data.carregamentos.length === 0 ? (
              <div className="px-[18px] pb-[18px]">
                <EmptyState title="Nenhum carregamento"
                  description="As cargas expedidas aparecerão aqui." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={LINHA_CABECALHO}>
                      <th className="px-4 py-[11px]">Data</th>
                      <th className="px-4 py-[11px]">Cliente</th>
                      <th className="hidden px-4 py-[11px] md:table-cell">Placa</th>
                      <th className="hidden px-4 py-[11px] lg:table-cell">NF</th>
                      <th className="px-4 py-[11px] text-right">Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.carregamentos.slice(0, 8).map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 text-slate-600">{formatarData(c.data)}</td>
                        <td className="px-4 py-2.5 text-slate-700">{nomeCliente(c.cliente_id)}</td>
                        <td className="hidden px-4 py-2.5 text-slate-500 md:table-cell">{c.placa ?? '—'}</td>
                        <td className="hidden px-4 py-2.5 text-slate-500 lg:table-cell">{c.nota_fiscal ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                          {c.peso_kg != null ? `${formatarQuantidade(c.peso_kg)} kg` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-[18px] py-3 text-xs text-slate-500">
              <span>{formatarQuantidade(pesoMes)} kg no mês</span>
              <Link to="/expedicao" className="font-semibold text-brand-700 hover:underline">Expedição →</Link>
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3.5">
          {/* Estoque pronto */}
          <Card className="p-[18px]">
            <CardTitle sub="Lote liberado pela qualidade — o que dá para prometer hoje.">
              Pronto para vender
            </CardTitle>
            {estoquePorProduto.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Nenhum lote liberado. Lote aguardando liberação é promessa, não estoque.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {estoquePorProduto.map(([produtoId, kg]) => (
                  <li key={produtoId} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-slate-700">{nomeProduto(produtoId)}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                      {formatarQuantidade(kg)} kg
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>{liberados.length} lote(s)</span>
              <Link to="/lotes" className="font-semibold text-brand-700 hover:underline">Lotes →</Link>
            </div>
          </Card>

          {/* Aguardando aprovação */}
          {pendentesAprovacao.length > 0 && (
            <Card className="p-[18px]">
              <CardTitle sub="Pedidos lançados que ainda não foram aprovados.">
                Aguardando aprovação
              </CardTitle>
              <ul className="flex flex-col gap-2.5">
                {pendentesAprovacao.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0">
                      <span className="block truncate text-slate-700">{nomeCliente(p.cliente_id)}</span>
                      <span className="text-[11px] text-slate-400">
                        nº {p.numero} · {formatarData(p.data)}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {p.peso_carga_kg != null ? `${formatarQuantidade(p.peso_carga_kg)} kg` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Clientes do mês */}
          <Card className="p-[18px]">
            <CardTitle sub="Por peso carregado no mês corrente.">Clientes do mês</CardTitle>
            {topClientes.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Nenhum carregamento neste mês.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {topClientes.map(([clienteId, kg]) => (
                  <li key={clienteId} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate text-slate-700">{nomeCliente(clienteId)}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                      {formatarQuantidade(kg)} kg
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>{clientesDoMes} cliente(s) atendido(s)</span>
              <Link to="/comercial" className="font-semibold text-brand-700 hover:underline">Carteira →</Link>
            </div>
          </Card>

          {/* O que este painel ainda não é. */}
          <div className="rounded-[10px] border border-dashed border-slate-300 bg-white px-4 py-3.5 text-xs leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-800">Sobre faturamento:</strong> este painel
            mostra o que foi pedido e o que saiu da fábrica, não o que foi faturado. A nota nasce no
            UNICO, e o faturamento entra no sistema junto com a importação do BI — até lá, valor em
            reais só aparece onde o pedido tiver preço lançado.
          </div>
        </div>
      </div>
    </>
  );
}
