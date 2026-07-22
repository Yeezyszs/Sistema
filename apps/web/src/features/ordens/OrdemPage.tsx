import { useState, type FormEvent } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  getOrdemProducao,
  getLotesDaOrdem,
  listProdutos,
  listClientes,
  criarLote,
  atualizarStatusOP,
  atualizarOrdemProducao,
  excluirOrdemProducao,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { STATUS_OP_LABEL } from '@sistema/domain';
import type { Cliente } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { StatusChip } from '../../components/StatusChip';
import { IconArrowLeft, IconPlus, IconChevronRight, IconClipboard, IconDoc } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { ApontamentosLoteCard } from '../lotes/ApontamentosLoteCard';

export function OrdemPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [recarregar, setRecarregar] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mudandoStatus, setMudandoStatus] = useState(false);
  const [editandoOp, setEditandoOp] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  // Sinal para o card de apontamentos abrir o modal a partir do botão do topo.
  const [sinalApontar, setSinalApontar] = useState(0);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const op = await getOrdemProducao(id);
    if (!op) return { op: null } as const;
    const [lotes, produtos, clientes] = await Promise.all([
      getLotesDaOrdem(id),
      listProdutos(),
      listClientes(),
    ]);
    return {
      op,
      lotes,
      produtos: mapBy(produtos, 'id'),
      clientes: mapBy(clientes, 'id'),
      clientesList: clientes,
    };
  }, [id, recarregar]);

  async function onCriarLote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data?.op) return;
    const form = new FormData(e.currentTarget);
    const codigo = String(form.get('codigo') ?? '').trim();
    const volume_texto = String(form.get('volume_texto') ?? '').trim() || null;
    const quantidade = String(form.get('quantidade') ?? '').trim();
    if (!codigo) return;

    setSalvando(true);
    try {
      await criarLote({
        codigo,
        produto_id: data.op.produto_id,
        ordem_producao_id: data.op.id,
        cliente_id: data.op.cliente_id,
        pedido: data.op.pedido,
        data_producao: data.op.data,
        volume_texto,
        quantidade: quantidade ? Number(quantidade) : null,
      });
      // Ao gerar o primeiro lote, marca a OP como em processo
      if (data.op.status === 'aberta') await atualizarStatusOP(data.op.id, 'em_processo');
      sucesso(`Lote ${codigo} gerado da OP #${data.op.numero}.`);
      setModalAberto(false);
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao gerar lote.');
    } finally {
      setSalvando(false);
    }
  }

  async function concluirOP() {
    if (!data?.op) return;
    setMudandoStatus(true);
    try {
      await atualizarStatusOP(data.op.id, 'concluida');
      sucesso('Ordem concluída.');
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setMudandoStatus(false);
    }
  }

  async function handleExcluir() {
    if (!data?.op) return;
    setExcluindo(true);
    try {
      await excluirOrdemProducao(data.op.id);
      sucesso(`Ordem #${data.op.numero} excluída.`);
      navigate('/ordens');
    } catch (err) {
      erro(
        err instanceof Error && /foreign key|violates|constraint/i.test(err.message)
          ? 'Não é possível excluir: a ordem já tem um lote vinculado. Cancele ou exclua o lote primeiro.'
          : err instanceof Error ? err.message : 'Falha ao excluir.',
      );
      setConfirmarExcluir(false);
      setExcluindo(false);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7 text-brand-600" />
      </div>
    );
  if (error) return <Card className="p-4 text-sm text-red-600">Erro: {error}</Card>;
  if (!data || !data.op)
    return (
      <>
        <BackLink />
        <EmptyState title="Ordem não encontrada" />
      </>
    );

  const { op, lotes } = data;
  const produto = data.produtos.get(op.produto_id)?.nome ?? '—';
  const cliente = op.cliente_id ? data.clientes.get(op.cliente_id)?.nome ?? '—' : '—';
  // OP ↔ lote é 1=1: o lote da ordem é o primeiro (e único).
  const loteDaOrdem = lotes[0] ?? null;

  return (
    <>
      <BackLink />

      <PageHeader
        title={`Ordem #${op.numero}`}
        subtitle={cliente}
        action={
          <div className="flex items-center gap-2">
            <Link
              to={`/ordens/${op.id}/imprimir`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <IconDoc width={16} height={16} />
              Imprimir
            </Link>
            {loteDaOrdem ? (
              op.status !== 'concluida' ? (
                <Button onClick={() => setSinalApontar((n) => n + 1)}>
                  <IconClipboard width={16} height={16} />
                  Apontar produção
                </Button>
              ) : null
            ) : (
              <Button onClick={() => setModalAberto(true)}>
                <IconPlus width={16} height={16} />
                Gerar lote
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Dados da ordem
            </h2>
            <button onClick={() => setEditandoOp(true)} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Editar
            </button>
          </div>
          <dl className="space-y-3 text-sm">
            <Linha termo="Status" valor={STATUS_OP_LABEL[op.status]} />
            <Linha termo="Cliente" valor={cliente} />
            <Linha termo="Pedido" valor={op.pedido ?? '—'} />
            <Linha termo="Produto" valor={produto} />
            <Linha termo="Quantidade" valor={op.quantidade != null ? formatarQuantidade(op.quantidade) : '—'} />
            <Linha termo="Embalagem" valor={op.embalagem ? `${op.embalagem}${op.qtd_embalagem ? ` · ${op.qtd_embalagem}/emb` : ''}` : '—'} />
            <Linha
              termo="Peso (mín/máx)"
              valor={op.peso_min != null || op.peso_max != null ? `${op.peso_min ?? '—'} / ${op.peso_max ?? '—'} kg` : '—'}
            />
            <Linha termo="Data" valor={formatarData(op.data)} />
            {op.reprocessar && <Linha termo="Reprocessar" valor="Sim" />}
            {op.observacao && <Linha termo="Observação" valor={op.observacao} />}
          </dl>

          {op.status === 'em_processo' && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <Button variant="outline" className="w-full" loading={mudandoStatus} onClick={() => void concluirOP()}>
                Concluir ordem
              </Button>
            </div>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => setConfirmarExcluir(true)}
              className="text-xs font-medium text-red-500 hover:text-red-600"
            >
              Excluir ordem
            </button>
            {loteDaOrdem && (
              <p className="mt-1 text-xs text-slate-400">
                Esta ordem tem um lote — exclua ou cancele o lote antes.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Lote da ordem
          </h2>
          {lotes.length === 0 ? (
            <EmptyState title="Nenhum lote ainda" description='Gere o lote desta ordem em "Gerar lote" — cada ordem tem um lote (1=1).' />
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 font-medium">Lote</th>
                    <th className="hidden px-5 py-3 font-medium sm:table-cell">Volume</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lotes.map((l) => (
                    <tr key={l.id} className="group transition hover:bg-slate-50">
                      <td className="px-5 py-3.5">
                        <Link to={`/lotes/${l.id}`} className="font-medium text-slate-900">
                          {l.codigo}
                        </Link>
                      </td>
                      <td className="hidden px-5 py-3.5 text-slate-500 sm:table-cell">
                        {l.volume_texto ?? (l.quantidade != null ? formatarQuantidade(l.quantidade) : '—')}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusChip status={l.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/lotes/${l.id}`}
                          className="inline-flex text-slate-300 transition group-hover:text-brand-600"
                          aria-label={`Abrir lote ${l.codigo}`}
                        >
                          <IconChevronRight />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          </div>

          {/* Apontamento de produção direto pela ordem (OP ↔ lote 1=1) */}
          {loteDaOrdem && (
            <ApontamentosLoteCard
              loteId={loteDaOrdem.id}
              produtoId={loteDaOrdem.produto_id}
              sinalAbrir={sinalApontar}
            />
          )}
        </div>
      </div>

      {editandoOp && (
        <ModalEditarOp
          op={op}
          clientes={data.clientesList}
          onClose={() => setEditandoOp(false)}
          onSaved={() => { setEditandoOp(false); setRecarregar((n) => n + 1); }}
        />
      )}

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title={`Gerar lote — OP #${op.numero}`}>
        <form onSubmit={onCriarLote} className="space-y-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {produto} · {cliente}
          </p>
          <Field label="Código do lote">
            <TextInput name="codigo" placeholder="MC0704" required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Volume">
              <TextInput name="volume_texto" placeholder="16 Bag's" />
            </Field>
            <Field label="Quantidade (kg)">
              <TextInput name="quantidade" type="number" step="any" min="0" placeholder="0" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={salvando}>
              Gerar lote
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={confirmarExcluir} onClose={() => setConfirmarExcluir(false)} title="Excluir ordem">
        <p className="text-sm text-slate-600">
          Excluir a ordem <span className="font-semibold">#{op.numero}</span> de forma definitiva?
          Esta ação não pode ser desfeita.
          {loteDaOrdem && ' A ordem tem um lote vinculado — será preciso tratar o lote antes.'}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setConfirmarExcluir(false)}>Voltar</Button>
          <Button
            type="button"
            loading={excluindo}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-300"
            onClick={() => void handleExcluir()}
          >
            Excluir definitivamente
          </Button>
        </div>
      </Modal>
    </>
  );
}

function ModalEditarOp({ op, clientes, onClose, onSaved }: {
  op: {
    id: string; numero: number; cliente_id: string | null; pedido: string | null; data: string;
    quantidade: number | null; embalagem: string | null; qtd_embalagem: number | null;
    peso_min: number | null; peso_max: number | null; observacao: string | null; reprocessar: boolean;
  };
  clientes: Cliente[];
  onClose: () => void; onSaved: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    setSalvando(true);
    try {
      await atualizarOrdemProducao(op.id, {
        cliente_id: String(f.get('cliente_id') ?? '') || null,
        pedido: txt('pedido'),
        data: String(f.get('data') ?? op.data),
        quantidade: num('quantidade'),
        embalagem: txt('embalagem'),
        qtd_embalagem: num('qtd_embalagem'),
        peso_min: num('peso_min'),
        peso_max: num('peso_max'),
        observacao: txt('observacao'),
        reprocessar: f.get('reprocessar') === 'on',
      });
      sucesso(`OP #${op.numero} atualizada.`); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Editar OP #${op.numero}`} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente">
            <Select name="cliente_id" defaultValue={op.cliente_id ?? ''}>
              <option value="">— não informado —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
          </Field>
          <Field label="Pedido"><TextInput name="pedido" defaultValue={op.pedido ?? ''} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={op.data} required /></Field>
          <Field label="Quantidade"><TextInput name="quantidade" type="number" step="any" min="0" defaultValue={op.quantidade ?? ''} /></Field>
          <Field label="Qtd/embalagem"><TextInput name="qtd_embalagem" type="number" step="any" min="0" defaultValue={op.qtd_embalagem ?? ''} /></Field>
        </div>
        <Field label="Embalagem"><TextInput name="embalagem" defaultValue={op.embalagem ?? ''} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso mín (kg)"><TextInput name="peso_min" type="number" step="any" min="0" defaultValue={op.peso_min ?? ''} /></Field>
          <Field label="Peso máx (kg)"><TextInput name="peso_max" type="number" step="any" min="0" defaultValue={op.peso_max ?? ''} /></Field>
        </div>
        <Field label="Observação"><TextInput name="observacao" defaultValue={op.observacao ?? ''} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="reprocessar" defaultChecked={op.reprocessar} className="accent-brand-600" />
          Reprocessar
        </label>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

function Linha({ termo, valor }: { termo: string; valor: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-slate-400">{termo}</dt>
      <dd className="text-right font-medium text-slate-700">{valor}</dd>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/ordens"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
    >
      <IconArrowLeft width={16} height={16} />
      Ordens
    </Link>
  );
}
