import { useState, type FormEvent } from 'react';
import {
  listPedidos, listClientes, listProdutos, listLotes,
  criarPedido, definirStatusPedido, excluirPedido, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import {
  STATUS_PEDIDO, STATUS_PEDIDO_LABEL, STATUS_PEDIDO_TOM,
  SITUACAO_PEDIDO, SITUACAO_PEDIDO_LABEL, valorTotalPedido,
} from '@sistema/domain';
import type { StatusPedido, SituacaoPedido } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { ProdutoPicker } from '../../components/ProdutoPicker';

const TOM_CLASS: Record<string, string> = {
  alerta: 'bg-amber-100 text-amber-700', sucesso: 'bg-emerald-100 text-emerald-700', erro: 'bg-red-100 text-red-700',
};

function reais(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PedidosPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [pedidos, clientes, produtos, lotes] = await Promise.all([
      listPedidos(), listClientes(), listProdutos(), listLotes(),
    ]);
    return {
      pedidos, clientes, produtos, lotes,
      clientesMap: mapBy(clientes, 'id'),
      produtosMap: mapBy(produtos, 'id'),
      lotesMap: mapBy(lotes, 'id'),
    };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  const linhas = (data?.pedidos ?? []).filter((p) => {
    if (filtroCliente && p.cliente_id !== filtroCliente) return false;
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const cli = p.cliente_id ? data?.clientesMap.get(p.cliente_id)?.nome ?? '' : '';
    const prod = p.produto_id ? data?.produtosMap.get(p.produto_id)?.nome ?? '' : '';
    const lote = p.lote_id ? data?.lotesMap.get(p.lote_id)?.codigo ?? '' : '';
    return [cli, prod, lote, p.destino ?? '', String(p.numero)].some((v) => v.toLowerCase().includes(q));
  });

  const totalCarteira = linhas.reduce((s, p) => s + (p.valor_total_rs ?? 0), 0);

  async function onCriar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    setSalvando(true);
    try {
      await criarPedido({
        data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
        cliente_id: String(f.get('cliente_id') ?? '') || null,
        produto_id: produtoId || null,
        lote_id: String(f.get('lote_id') ?? '') || null,
        status: String(f.get('status') ?? 'pendente') as StatusPedido,
        situacao: String(f.get('situacao') ?? 'pendente') as SituacaoPedido,
        destino: txt('destino'),
        observacoes: txt('observacoes'),
        valor_rs: num('valor_rs'),
        peso_carga_kg: num('peso_carga_kg'),
      });
      sucesso('Pedido registrado.'); setModal(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function mudar(id: string, campo: 'status' | 'situacao', valor: string) {
    try { await definirStatusPedido(id, campo, valor as never); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function remover(id: string) {
    try { await excluirPedido(id); sucesso('Pedido excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  // meta de valor total no form (ao vivo)
  const [valorRs, setValorRs] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const totalPreview = valorTotalPedido(valorRs ? Number(valorRs) : null, pesoKg ? Number(pesoKg) : null);

  return (
    <>
      <PageHeader
        title="Pedidos"
        subtitle="Carteira de pedidos por cliente (ERP)"
        action={<Button onClick={() => { setValorRs(''); setPesoKg(''); setProdutoId(''); setModal(true); }}><IconPlus width={16} height={16} />Novo pedido</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar nº, cliente, produto, lote, destino…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div className="w-52">
          <Select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
            <option value="">Todos os clientes</option>
            {(data?.clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </div>
        {linhas.length > 0 && (
          <span className="ml-auto text-sm text-slate-500">Carteira: <span className="font-semibold text-slate-800">{reais(totalCarteira)}</span></span>
        )}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && linhas.length === 0 && (
        <EmptyState title="Nenhum pedido" description='Registre o primeiro em "Novo pedido".' />
      )}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Nº</th>
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Cliente</th>
                <th className="px-3 py-3 font-medium">Produto</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Lote</th>
                <th className="px-3 py-3 font-medium text-right">Peso</th>
                <th className="hidden px-3 py-3 font-medium text-right md:table-cell">R$/kg</th>
                <th className="px-3 py-3 font-medium text-right">Total</th>
                <th className="px-3 py-3 font-medium">Aprovação</th>
                <th className="px-3 py-3 font-medium">Atendimento</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{p.numero}</td>
                  <td className="px-3 py-2.5 text-slate-500">{formatarData(p.data)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{p.cliente_id ? data.clientesMap.get(p.cliente_id)?.nome ?? '—' : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{p.produto_id ? data.produtosMap.get(p.produto_id)?.nome ?? '—' : '—'}</span></td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{p.lote_id ? data.lotesMap.get(p.lote_id)?.codigo ?? '—' : '—'}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(p.peso_carga_kg)}</td>
                  <td className="hidden px-3 py-2.5 text-right text-slate-500 md:table-cell">{reais(p.valor_rs)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-800">{reais(p.valor_total_rs)}</td>
                  <td className="px-3 py-2.5">
                    <select value={p.status} onChange={(e) => void mudar(p.id, 'status', e.target.value)}
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_PEDIDO_TOM[p.status]]}`}>
                      {STATUS_PEDIDO.map((s) => <option key={s} value={s}>{STATUS_PEDIDO_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <select value={p.situacao} onChange={(e) => void mudar(p.id, 'situacao', e.target.value)}
                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
                      {SITUACAO_PEDIDO.map((s) => <option key={s} value={s}>{SITUACAO_PEDIDO_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => void remover(p.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Novo pedido" size="xl">
        <form onSubmit={onCriar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <Field label="Cliente">
                <Select name="cliente_id" defaultValue="">
                  <option value="">—</option>
                  {(data?.clientes ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Data"><TextInput name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
            <Field label="Destino"><TextInput name="destino" placeholder="Local de entrega" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ProdutoPicker
              produtos={(data?.produtos ?? []).filter((p) => p.tipo === 'produto_acabado')}
              value={produtoId}
              onChange={setProdutoId}
            />
            <Field label="Lote alocado">
              <Select name="lote_id" defaultValue="">
                <option value="">—</option>
                {(data?.lotes ?? []).map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Peso da carga (kg)"><TextInput name="peso_carga_kg" type="number" step="any" min="0" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} placeholder="0" /></Field>
            <Field label="R$ por kg"><TextInput name="valor_rs" type="number" step="any" min="0" value={valorRs} onChange={(e) => setValorRs(e.target.value)} placeholder="0,00" /></Field>
            <Field label="Valor total"><TextInput value={totalPreview != null ? reais(totalPreview) : ''} readOnly placeholder="—" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Aprovação"><Select name="status" defaultValue="pendente">{STATUS_PEDIDO.map((s) => <option key={s} value={s}>{STATUS_PEDIDO_LABEL[s]}</option>)}</Select></Field>
            <Field label="Atendimento"><Select name="situacao" defaultValue="pendente">{SITUACAO_PEDIDO.map((s) => <option key={s} value={s}>{SITUACAO_PEDIDO_LABEL[s]}</option>)}</Select></Field>
          </div>
          <Field label="Observações"><TextInput name="observacoes" placeholder="—" /></Field>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Registrar pedido</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
