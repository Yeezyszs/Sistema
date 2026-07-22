import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listPedidos, listClientes, listProdutos, mapBy } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { SITUACAO_PEDIDO_LABEL } from '@sistema/domain';
import type { SituacaoPedido } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Select, Field } from '../../components/ui';

function reais(n: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TOM_SITUACAO: Record<SituacaoPedido, string> = {
  pendente: 'bg-slate-100 text-slate-600',
  parcial: 'bg-amber-100 text-amber-700',
  completo: 'bg-sky-100 text-sky-700',
  carregado: 'bg-emerald-100 text-emerald-700',
};

export function CarteiraPage() {
  const [cliente, setCliente] = useState('');
  const { data, loading } = useAsync(async () => {
    const [pedidos, clientes, produtos] = await Promise.all([listPedidos(), listClientes(), listProdutos()]);
    return { pedidos, clientes, clientesMap: mapBy(clientes, 'id'), produtosMap: mapBy(produtos, 'id') };
  }, []);

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Carteira de pedidos" subtitle="Pedidos vendidos ainda não entregues" />
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>
      </>
    );
  }

  const { pedidos, clientes, clientesMap, produtosMap } = data;
  const nomeCliente = (id: string | null) => (id ? clientesMap.get(id)?.nome ?? '—' : '—');

  // Carteira = pedidos aprovados ainda não carregados.
  const abertos = pedidos
    .filter((p) => p.status === 'aprovado' && p.situacao !== 'carregado')
    .filter((p) => !cliente || p.cliente_id === cliente);

  const totKg = abertos.reduce((s, p) => s + (p.peso_carga_kg ?? 0), 0);
  const totRs = abertos.reduce((s, p) => s + (p.valor_total_rs ?? 0), 0);

  // Resumo por cliente.
  const porCliente = new Map<string, { nome: string; n: number; kg: number; rs: number }>();
  for (const p of abertos) {
    const key = p.cliente_id ?? '—';
    const cur = porCliente.get(key) ?? { nome: nomeCliente(p.cliente_id), n: 0, kg: 0, rs: 0 };
    cur.n += 1; cur.kg += p.peso_carga_kg ?? 0; cur.rs += p.valor_total_rs ?? 0;
    porCliente.set(key, cur);
  }
  const resumo = [...porCliente.values()].sort((a, b) => b.rs - a.rs);

  return (
    <>
      <PageHeader title="Carteira de pedidos" subtitle="Pedidos vendidos ainda não entregues" />

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi titulo="Pedidos em aberto" valor={String(abertos.length)} />
        <Kpi titulo="Volume em aberto" valor={`${formatarQuantidade(totKg)} kg`} />
        <Kpi titulo="Valor em aberto" valor={reais(totRs)} tom="destaque" />
      </div>

      <div className="mt-5 max-w-xs">
        <Field label="Filtrar por cliente">
          <Select value={cliente} onChange={(e) => setCliente(e.target.value)}>
            <option value="">Todos os clientes</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Field>
      </div>

      {abertos.length === 0 ? (
        <div className="mt-6"><EmptyState title="Nenhum pedido em aberto" description="Pedidos aprovados e não carregados aparecem aqui." /></div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Resumo por cliente */}
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Por cliente</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-medium">Cliente</th>
                  <th className="px-5 py-2 text-right font-medium">Pedidos</th>
                  <th className="px-5 py-2 text-right font-medium">Kg</th>
                  <th className="px-5 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resumo.map((r) => (
                  <tr key={r.nome} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">{r.nome}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">{r.n}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">{formatarQuantidade(r.kg)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-800">{reais(r.rs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Pedidos em aberto */}
          <Card className="overflow-x-auto">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Pedidos</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-2 font-medium">Nº</th>
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="hidden px-4 py-2 font-medium md:table-cell">Produto</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                  <th className="px-4 py-2 text-right font-medium">Kg</th>
                  <th className="px-4 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {abertos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{p.numero}</td>
                    <td className="px-4 py-2.5 text-slate-600">{nomeCliente(p.cliente_id)}</td>
                    <td className="hidden px-4 py-2.5 text-slate-500 md:table-cell">
                      {p.produto_id ? produtosMap.get(p.produto_id)?.nome_curto || produtosMap.get(p.produto_id)?.nome || '—' : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOM_SITUACAO[p.situacao]}`}>{SITUACAO_PEDIDO_LABEL[p.situacao]}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{p.peso_carga_kg != null ? formatarQuantidade(p.peso_carga_kg) : '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-800">{reais(p.valor_total_rs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <Link to="/pedidos" className="mt-5 inline-block text-xs font-medium text-brand-600 hover:text-brand-700">Ir para Pedidos →</Link>
    </>
  );
}

function Kpi({ titulo, valor, tom }: { titulo: string; valor: string; tom?: 'destaque' }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${tom === 'destaque' ? 'bg-brand-600' : 'bg-slate-300'}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valor}</p>
    </Card>
  );
}
