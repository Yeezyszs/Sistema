import { useState } from 'react';
import { listPedidos, listClientes, listProdutos, mapBy } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarQuantidade } from '../../lib/format';
import { PageHeader, Card, Spinner, EmptyState, Field, Select } from '../../components/ui';

function reais(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
const MESES_LBL = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function AnaliseVendasPage() {
  const [meses, setMeses] = useState(6);
  const { data, loading } = useAsync(async () => {
    const [pedidos, clientes, produtos] = await Promise.all([listPedidos(), listClientes(), listProdutos()]);
    return { pedidos, clientesMap: mapBy(clientes, 'id'), produtosMap: mapBy(produtos, 'id') };
  }, []);

  if (loading || !data) {
    return (
      <>
        <PageHeader title="Análise de vendas" subtitle="Faturamento por período, cliente e produto" />
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>
      </>
    );
  }

  const { pedidos, clientesMap, produtosMap } = data;

  // Recorte do período (a partir da data do pedido) e "venda" = pedido não cancelado.
  const desde = new Date();
  desde.setMonth(desde.getMonth() - meses);
  const desdeISO = desde.toISOString().slice(0, 10);
  const vendas = pedidos.filter((p) => p.status !== 'cancelado' && p.data >= desdeISO);

  const totRs = vendas.reduce((s, p) => s + (p.valor_total_rs ?? 0), 0);
  const totKg = vendas.reduce((s, p) => s + (p.peso_carga_kg ?? 0), 0);
  const precoMedio = totKg > 0 ? totRs / totKg : null;

  // Por mês (chave AAAA-MM).
  const porMes = new Map<string, number>();
  for (const p of vendas) {
    const k = p.data.slice(0, 7);
    porMes.set(k, (porMes.get(k) ?? 0) + (p.valor_total_rs ?? 0));
  }
  const mesesOrd = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const maxMes = Math.max(1, ...mesesOrd.map(([, v]) => v));

  // Por produto e por cliente.
  const agrup = (chave: (p: typeof vendas[number]) => string | null, nome: (id: string) => string) => {
    const m = new Map<string, { nome: string; kg: number; rs: number }>();
    for (const p of vendas) {
      const id = chave(p) ?? '—';
      const cur = m.get(id) ?? { nome: id === '—' ? '—' : nome(id), kg: 0, rs: 0 };
      cur.kg += p.peso_carga_kg ?? 0; cur.rs += p.valor_total_rs ?? 0;
      m.set(id, cur);
    }
    return [...m.values()].sort((a, b) => b.rs - a.rs);
  };
  const porProduto = agrup((p) => p.produto_id, (id) => produtosMap.get(id)?.nome_curto || produtosMap.get(id)?.nome || '—');
  const porCliente = agrup((p) => p.cliente_id, (id) => clientesMap.get(id)?.nome ?? '—');
  const maxProd = Math.max(1, ...porProduto.map((x) => x.rs));

  // Curva ABC dos clientes (acumulado do faturamento).
  let acum = 0;
  const abc = porCliente.map((c) => {
    acum += c.rs;
    const pctAcum = totRs > 0 ? (acum / totRs) * 100 : 0;
    const classe = pctAcum <= 80 ? 'A' : pctAcum <= 95 ? 'B' : 'C';
    return { ...c, pctAcum, classe };
  });

  const semDados = vendas.length === 0;

  return (
    <>
      <PageHeader title="Análise de vendas" subtitle="Faturamento por período, cliente e produto" />

      <div className="mb-5 max-w-xs">
        <Field label="Período">
          <Select value={meses} onChange={(e) => setMeses(Number(e.target.value))}>
            <option value={3}>Últimos 3 meses</option>
            <option value={6}>Últimos 6 meses</option>
            <option value={12}>Últimos 12 meses</option>
          </Select>
        </Field>
      </div>

      {semDados ? (
        <EmptyState title="Sem vendas no período" description="Pedidos não cancelados aparecem aqui conforme a data." />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi titulo="Faturamento" valor={reais(totRs)} tom="destaque" />
            <Kpi titulo="Volume vendido" valor={`${formatarQuantidade(totKg)} kg`} />
            <Kpi titulo="Preço médio" valor={precoMedio != null ? `${reais(precoMedio)}/kg` : '—'} />
            <Kpi titulo="Pedidos" valor={String(vendas.length)} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Vendas por mês */}
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Faturamento por mês</h2>
              <div className="space-y-2.5">
                {mesesOrd.map(([k, v]) => {
                  const [ano, m] = k.split('-');
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-sm text-slate-600">{MESES_LBL[Number(m) - 1]}/{ano!.slice(2)}</span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                        <div className="h-full rounded bg-brand-500" style={{ width: `${(v / maxMes) * 100}%` }} />
                      </div>
                      <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">{reais(v)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Vendas por produto */}
            <Card className="p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Faturamento por produto</h2>
              <div className="space-y-2.5">
                {porProduto.slice(0, 10).map((p) => (
                  <div key={p.nome} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-sm text-slate-600" title={p.nome}>{p.nome}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                      <div className="h-full rounded bg-sky-400" style={{ width: `${(p.rs / maxProd) * 100}%` }} />
                    </div>
                    <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">{reais(p.rs)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Ranking de clientes (curva ABC) */}
          <Card className="mt-6 overflow-x-auto">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Ranking de clientes — curva ABC
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2 font-medium">#</th>
                  <th className="px-5 py-2 font-medium">Cliente</th>
                  <th className="px-5 py-2 text-center font-medium">Classe</th>
                  <th className="px-5 py-2 text-right font-medium">Volume</th>
                  <th className="px-5 py-2 text-right font-medium">Faturamento</th>
                  <th className="px-5 py-2 text-right font-medium">% acum.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {abc.map((c, i) => (
                  <tr key={c.nome} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 tabular-nums text-slate-400">{i + 1}</td>
                    <td className="px-5 py-2.5 font-medium text-slate-700">{c.nome}</td>
                    <td className="px-5 py-2.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        c.classe === 'A' ? 'bg-emerald-100 text-emerald-700' : c.classe === 'B' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>{c.classe}</span>
                    </td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">{formatarQuantidade(c.kg)} kg</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-slate-800">{reais(c.rs)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">{c.pctAcum.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
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
