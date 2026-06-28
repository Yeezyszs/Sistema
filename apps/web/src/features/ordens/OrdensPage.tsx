import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  listOrdensProducao,
  listProdutos,
  listClientes,
  criarOrdemProducao,
  criarLote,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { STATUS_OP_LABEL, STATUS_OP_TOM } from '@sistema/domain';
import type { StatusOP } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconClipboard, IconChevronRight, IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

const TOM_CLASS: Record<string, string> = {
  info: 'bg-sky-100 text-sky-700',
  alerta: 'bg-amber-100 text-amber-700',
  sucesso: 'bg-emerald-100 text-emerald-700',
};

function OPStatusChip({ status }: { status: StatusOP }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_OP_TOM[status]] ?? 'bg-slate-100 text-slate-600'}`}>
      {STATUS_OP_LABEL[status]}
    </span>
  );
}

export function OrdensPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [ordens, produtos, clientes] = await Promise.all([
      listOrdensProducao(),
      listProdutos(),
      listClientes(),
    ]);
    return {
      ordens,
      produtos: mapBy(produtos, 'id'),
      produtosList: produtos,
      clientes: mapBy(clientes, 'id'),
      clientesList: clientes,
    };
  }, [recarregar]);

  const ordensFiltradas = (data?.ordens ?? []).filter((o) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const prod = data?.produtos.get(o.produto_id)?.nome?.toLowerCase() ?? '';
    const cli = o.cliente_id ? data?.clientes.get(o.cliente_id)?.nome?.toLowerCase() ?? '' : '';
    return (
      String(o.numero).includes(q) ||
      (o.pedido ?? '').toLowerCase().includes(q) ||
      prod.includes(q) ||
      cli.includes(q)
    );
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const produto_id = String(form.get('produto_id') ?? '');
    const data_op = String(form.get('data') ?? '').trim();
    if (!produto_id || !data_op) return;

    const num = (k: string) => {
      const v = String(form.get(k) ?? '').trim();
      return v ? Number(v) : null;
    };
    const txt = (k: string) => String(form.get(k) ?? '').trim() || null;

    const cliente_id = String(form.get('cliente_id') ?? '') || null;
    const pedido = txt('pedido');
    const lote_codigo = String(form.get('lote_codigo') ?? '').trim();
    const lote_volume = txt('lote_volume');
    const tipo_bag = txt('tipo_bag');
    const local_barracao = txt('local_barracao');
    const local_rua = txt('local_rua');

    setSalvando(true);
    try {
      const op = await criarOrdemProducao({
        produto_id,
        data: data_op,
        pedido,
        cliente_id,
        quantidade: num('quantidade'),
        embalagem: txt('embalagem'),
        qtd_embalagem: num('qtd_embalagem'),
        peso_min: num('peso_min'),
        peso_max: num('peso_max'),
        observacao: txt('observacao'),
        reprocessar: form.get('reprocessar') === 'on',
      });
      // Se informou o lote, já cria vinculado à ordem
      if (lote_codigo) {
        await criarLote({
          codigo: lote_codigo,
          produto_id,
          ordem_producao_id: op.id,
          cliente_id,
          pedido,
          data_producao: data_op,
          volume_texto: lote_volume,
          quantidade: num('quantidade'),
          tipo_bag,
          local_barracao,
          local_rua,
        });
        sucesso(`Ordem #${op.numero} criada com lote ${lote_codigo}.`);
      } else {
        sucesso(`Ordem #${op.numero} criada.`);
      }
      setModalAberto(false);
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao criar OP.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Ordens de produção"
        subtitle="Programação de produção (planilha de acompanhamento)"
        action={
          <Button onClick={() => setModalAberto(true)}>
            <IconPlus width={16} height={16} />
            Nova ordem
          </Button>
        }
      />

      <div className="mb-4 relative">
        <IconSearch width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Buscar por nº, pedido, cliente ou produto…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:max-w-sm"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-emerald-600" />
        </div>
      )}

      {error && <Card className="p-4 text-sm text-red-600">Erro: {error}</Card>}

      {data && ordensFiltradas.length === 0 && (
        <EmptyState
          icon={<IconClipboard width={40} height={40} />}
          title={busca ? 'Nenhum resultado' : 'Nenhuma ordem ainda'}
          description={busca ? undefined : 'Clique em "Nova ordem" para programar a primeira produção.'}
        />
      )}

      {data && ordensFiltradas.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Nº</th>
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Quantidade</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Data</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordensFiltradas.map((op) => (
                <tr key={op.id} className="group transition hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <Link to={`/ordens/${op.id}`} className="font-semibold text-slate-900">
                      #{op.numero}
                    </Link>
                    {op.pedido && <span className="ml-1.5 text-xs text-slate-400">ped. {op.pedido}</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {op.cliente_id ? data.clientes.get(op.cliente_id)?.nome ?? '—' : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <span className="line-clamp-1">{data.produtos.get(op.produto_id)?.nome ?? '—'}</span>
                  </td>
                  <td className="hidden px-5 py-3.5 text-slate-500 md:table-cell">
                    {op.quantidade != null ? formatarQuantidade(op.quantidade) : '—'}
                  </td>
                  <td className="hidden px-5 py-3.5 text-slate-500 sm:table-cell">
                    {formatarData(op.data)}
                  </td>
                  <td className="px-5 py-3.5">
                    <OPStatusChip status={op.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/ordens/${op.id}`}
                      className="inline-flex text-slate-300 transition group-hover:text-emerald-600"
                      aria-label={`Abrir OP ${op.numero}`}
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

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Nova ordem de produção" size="xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Field label="Cliente">
              <Select name="cliente_id" defaultValue="">
                <option value="">— não informado —</option>
                {(data?.clientesList ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </Field>
            <Field label="Pedido">
              <TextInput name="pedido" placeholder="Nº do pedido" />
            </Field>
            <Field label="Data de produção">
              <TextInput name="data" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
            </Field>

            {/* Produto ocupa a linha inteira */}
            <div className="col-span-2 sm:col-span-3">
              <Field label="Produto">
                <Select name="produto_id" defaultValue="" required>
                  <option value="" disabled>Selecione…</option>
                  {(data?.produtosList ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Lote">
              <TextInput name="lote_codigo" placeholder="MC0704" />
            </Field>
            <Field label="Volume do lote">
              <TextInput name="lote_volume" placeholder="16 Bag's" />
            </Field>
            <Field label="Tipo de bag">
              <TextInput name="tipo_bag" list="tipos-bag-op" placeholder="Ex.: Big Bag 1000kg" />
              <datalist id="tipos-bag-op">
                <option value="Big Bag 1000kg" />
                <option value="Big Bag 1250kg" />
                <option value="Big Bag 750kg" />
                <option value="Saco 25kg" />
                <option value="Saco 50kg" />
                <option value="Fardo" />
              </datalist>
            </Field>

            <Field label="Loc. — Barracão">
              <TextInput name="local_barracao" placeholder="Barracão 1" />
            </Field>
            <Field label="Loc. — Rua">
              <TextInput name="local_rua" placeholder="Rua 17" />
            </Field>
            <Field label="Quantidade total">
              <TextInput name="quantidade" type="number" step="any" min="0" placeholder="0" />
            </Field>

            <Field label="Embalagem">
              <TextInput name="embalagem" placeholder="KG / BAG / SCS" />
            </Field>
            <Field label="Qtd / embalagem">
              <TextInput name="qtd_embalagem" type="number" step="any" min="0" placeholder="24" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Peso mín.">
                <TextInput name="peso_min" type="number" step="any" min="0" placeholder="23.88" />
              </Field>
              <Field label="Peso máx.">
                <TextInput name="peso_max" type="number" step="any" min="0" placeholder="24.12" />
              </Field>
            </div>

            {/* Observação ocupa a linha inteira */}
            <div className="col-span-2 sm:col-span-3">
              <Field label="Observação">
                <TextInput name="observacao" placeholder="Observações da ordem" />
              </Field>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="reprocessar" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              Reprocessar
            </label>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={salvando}>
                Criar ordem
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
