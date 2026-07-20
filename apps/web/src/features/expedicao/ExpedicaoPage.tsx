import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  listCarregamentos, listPedidos, listClientes, listProdutos, listLotes,
  listPosicoesEstoque, listLocaisEstoque,
  criarCarregamento, atualizarCarregamento, cancelarCarregamento, excluirCarregamento, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, hojeLocalISO } from '../../lib/format';
import { STATUS_CARGA_LABEL, STATUS_CARGA_TOM, posicaoLabel } from '@sistema/domain';
import type { Carregamento } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

const TOM_CLASS: Record<string, string> = {
  sucesso: 'bg-emerald-100 text-emerald-700', erro: 'bg-red-100 text-red-700',
};

export function ExpedicaoPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Carregamento | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [pedidoId, setPedidoId] = useState('');
  const [posicaoId, setPosicaoId] = useState('');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [cargas, pedidos, clientes, produtos, lotes, posicoes, locais] = await Promise.all([
      listCarregamentos(), listPedidos(), listClientes(), listProdutos(), listLotes(),
      listPosicoesEstoque(), listLocaisEstoque(),
    ]);
    return {
      cargas, pedidos, clientes, produtos, lotes, posicoes, locais,
      clientesMap: mapBy(clientes, 'id'),
      produtosMap: mapBy(produtos, 'id'),
      lotesMap: mapBy(lotes, 'id'),
      locaisMap: mapBy(locais, 'id'),
    };
  }, [recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  // Só pedidos aprovados e ainda não carregados podem virar carga.
  const pedidosCarregaveis = useMemo(
    () => (data?.pedidos ?? []).filter((p) => p.status === 'aprovado' && p.situacao !== 'carregado'),
    [data?.pedidos],
  );
  const pedidoSel = useMemo(
    () => pedidosCarregaveis.find((p) => p.id === pedidoId) ?? null,
    [pedidosCarregaveis, pedidoId],
  );

  // Posições que casam com o lote do pedido selecionado (baixa no estoque).
  const posicoesDoLote = useMemo(() => {
    const posics = data?.posicoes ?? [];
    if (!pedidoSel?.lote_id) return posics;
    return posics.filter((p) => p.lote_id === pedidoSel.lote_id);
  }, [data?.posicoes, pedidoSel?.lote_id]);

  // Retorno do PCP: ao escolher o pedido, a posição do lote vem sozinha.
  useEffect(() => {
    if (!pedidoSel) { setPosicaoId(''); return; }
    setPosicaoId(posicoesDoLote[0]?.id ?? '');
  }, [pedidoSel, posicoesDoLote]);

  const posicaoSel = posicoesDoLote.find((p) => p.id === posicaoId) ?? null;

  function rotuloPosicao(localId: string): string {
    const local = data?.locaisMap.get(localId);
    return local ? posicaoLabel(local) : 'posição';
  }

  const linhas = (data?.cargas ?? []).filter((c) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const cli = c.cliente_id ? data?.clientesMap.get(c.cliente_id)?.nome ?? '' : '';
    const lote = c.lote_id ? data?.lotesMap.get(c.lote_id)?.codigo ?? '' : '';
    return [cli, lote, c.placa ?? '', c.transportadora ?? '', c.nota_fiscal ?? '', String(c.numero)]
      .some((v) => v.toLowerCase().includes(q));
  });

  async function onCriar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    if (!pedidoSel) { erro('Selecione um pedido aprovado.'); return; }
    setSalvando(true);
    try {
      await criarCarregamento({
        data: String(f.get('data') ?? hojeLocalISO()),
        pedido_id: pedidoSel.id,
        cliente_id: pedidoSel.cliente_id,
        produto_id: pedidoSel.produto_id,
        lote_id: pedidoSel.lote_id,
        posicao_id: posicaoId || null,
        qtd_bags: num('qtd_bags'),
        peso_kg: num('peso_kg'),
        placa: txt('placa'),
        motorista: txt('motorista'),
        transportadora: txt('transportadora'),
        nota_fiscal: txt('nota_fiscal'),
        observacoes: txt('observacoes'),
      });
      sucesso('Carga registrada — estoque baixado e pedido carregado.');
      setModal(false); setPedidoId(''); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function onEditar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editando) return;
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    setSalvando(true);
    try {
      await atualizarCarregamento(editando.id, {
        placa: txt('placa'),
        motorista: txt('motorista'),
        transportadora: txt('transportadora'),
        nota_fiscal: txt('nota_fiscal'),
        observacoes: txt('observacoes'),
      });
      sucesso('Carga atualizada.'); setEditando(null); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function cancelar(id: string) {
    try { await cancelarCarregamento(id); sucesso('Carga cancelada.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }
  async function remover(id: string) {
    try { await excluirCarregamento(id); sucesso('Carga excluída.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  function abrir() { setPedidoId(''); setPosicaoId(''); setModal(true); }

  return (
    <>
      <PageHeader
        title="Expedição"
        subtitle="Carregamentos — baixa automática no estoque e fecha o pedido"
        action={<Button onClick={abrir}><IconPlus width={16} height={16} />Novo carregamento</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar nº, cliente, lote, placa, transportadora, NF…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && linhas.length === 0 && (
        <EmptyState title="Nenhuma carga" description='Registre a primeira em "Novo carregamento".' />
      )}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Nº</th>
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Cliente</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Lote</th>
                <th className="px-3 py-3 font-medium text-right">Bags</th>
                <th className="px-3 py-3 font-medium text-right">Peso</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Placa</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Transportadora</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">NF</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{c.numero}</td>
                  <td className="px-3 py-2.5 text-slate-500">{formatarData(c.data)}</td>
                  <td className="px-3 py-2.5 text-slate-700">{c.cliente_id ? data.clientesMap.get(c.cliente_id)?.nome ?? '—' : '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{c.lote_id ? data.lotesMap.get(c.lote_id)?.codigo ?? '—' : '—'}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(c.qtd_bags)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(c.peso_kg)}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{c.placa ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{c.transportadora ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{c.nota_fiscal ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_CARGA_TOM[c.status]]}`}>
                      {STATUS_CARGA_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setEditando(c)} className="mr-3 text-xs font-medium text-slate-500 hover:text-emerald-600">Editar</button>
                    {c.status === 'carregado' && (
                      <button onClick={() => void cancelar(c.id)} className="mr-3 text-xs font-medium text-slate-400 hover:text-amber-600">Cancelar</button>
                    )}
                    <button onClick={() => void remover(c.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Novo carregamento */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo carregamento" size="xl">
        <form onSubmit={onCriar} className="space-y-4">
          <Field label="Pedido (aprovado)">
            <Select value={pedidoId} onChange={(e) => setPedidoId(e.target.value)} required>
              <option value="">Selecione um pedido…</option>
              {pedidosCarregaveis.map((p) => {
                const cli = p.cliente_id ? data?.clientesMap.get(p.cliente_id)?.nome ?? '' : '';
                const lote = p.lote_id ? data?.lotesMap.get(p.lote_id)?.codigo ?? '' : 's/ lote';
                return <option key={p.id} value={p.id}>#{p.numero} · {cli} · {lote}</option>;
              })}
            </Select>
          </Field>

          {pedidoSel && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <p>
                <span className="font-medium text-slate-700">Puxado do pedido:</span>{' '}
                {pedidoSel.produto_id ? data?.produtosMap.get(pedidoSel.produto_id)?.nome ?? '—' : '—'}
                {pedidoSel.lote_id && <> · lote {data?.lotesMap.get(pedidoSel.lote_id)?.codigo ?? '—'}</>}
                {pedidoSel.peso_carga_kg != null && <> · {formatarQuantidade(pedidoSel.peso_carga_kg)} kg previstos</>}
              </p>
              {posicaoSel ? (
                <p className="mt-1">
                  <span className="font-medium text-slate-700">Posição no estoque:</span>{' '}
                  {rotuloPosicao(posicaoSel.local_id)} · {formatarQuantidade(posicaoSel.qtd_bags)} bags
                  <span className="text-slate-400"> — baixa automática ao registrar</span>
                </p>
              ) : (
                <p className="mt-1 text-amber-600">Este lote não tem posição no estoque — a carga não dará baixa.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Data"><TextInput name="data" type="date" defaultValue={hojeLocalISO()} required /></Field>
            <Field label="Bags"><TextInput name="qtd_bags" type="number" step="any" min="0" defaultValue={posicaoSel?.qtd_bags ?? ''} key={`b-${posicaoSel?.id ?? 'v'}`} placeholder="0" /></Field>
            <Field label="Peso (kg)"><TextInput name="peso_kg" type="number" step="any" min="0" defaultValue={pedidoSel?.peso_carga_kg ?? ''} key={`p-${pedidoSel?.id ?? 'v'}`} placeholder="0" /></Field>
            <Field label="Placa"><TextInput name="placa" placeholder="ABC-1D23" /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Posição no estoque (baixa)">
              <Select value={posicaoId} onChange={(e) => setPosicaoId(e.target.value)}>
                <option value="">— não baixar estoque</option>
                {posicoesDoLote.map((p) => (
                  <option key={p.id} value={p.id}>
                    {rotuloPosicao(p.local_id)} · {p.lote_id ? data?.lotesMap.get(p.lote_id)?.codigo ?? 'lote' : 'lote'} · {formatarQuantidade(p.qtd_bags)} bags
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Transportadora"><TextInput name="transportadora" placeholder="—" /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Motorista"><TextInput name="motorista" placeholder="—" /></Field>
            <Field label="Nota fiscal"><TextInput name="nota_fiscal" placeholder="—" /></Field>
          </div>

          <Field label="Observações"><TextInput name="observacoes" placeholder="—" /></Field>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Registrar carga</Button>
          </div>
        </form>
      </Modal>

      {/* Edição de carreta/motorista/NF */}
      <Modal open={!!editando} onClose={() => setEditando(null)} title={editando ? `Editar carga #${editando.numero}` : ''} size="lg">
        {editando && (
          <form onSubmit={onEditar} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Placa"><TextInput name="placa" defaultValue={editando.placa ?? ''} placeholder="ABC-1D23" /></Field>
              <Field label="Motorista"><TextInput name="motorista" defaultValue={editando.motorista ?? ''} placeholder="—" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Transportadora"><TextInput name="transportadora" defaultValue={editando.transportadora ?? ''} placeholder="—" /></Field>
              <Field label="Nota fiscal"><TextInput name="nota_fiscal" defaultValue={editando.nota_fiscal ?? ''} placeholder="—" /></Field>
            </div>
            <Field label="Observações"><TextInput name="observacoes" defaultValue={editando.observacoes ?? ''} placeholder="—" /></Field>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button type="submit" loading={salvando}>Salvar</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
