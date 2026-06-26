import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { listLotes, listProdutos, criarLote, mapBy } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { StatusChip } from '../../components/StatusChip';
import { IconBox, IconChevronRight, IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function LotesPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(
    async () => {
      const [lotes, produtos] = await Promise.all([listLotes(), listProdutos()]);
      return { lotes, produtos: mapBy(produtos, 'id'), produtosList: produtos };
    },
    [recarregar],
  );

  const lotesFiltrados = (data?.lotes ?? []).filter((l) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    const nomeProduto = data?.produtos.get(l.produto_id)?.nome?.toLowerCase() ?? '';
    return l.codigo.toLowerCase().includes(q) || nomeProduto.includes(q);
  });

  const produtosList = data?.produtosList ?? [];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const codigo = String(form.get('codigo') ?? '').trim();
    const produto_id = String(form.get('produto_id') ?? '');
    const data_producao = String(form.get('data_producao') ?? '').trim() || null;

    if (!codigo || !produto_id) return;
    setSalvando(true);
    try {
      await criarLote({ codigo, produto_id, data_producao });
      sucesso(`Lote ${codigo} criado.`);
      setModalAberto(false);
      setRecarregar((n) => n + 1);
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao criar lote.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Lotes"
        subtitle="Produção e rastreabilidade dos lotes"
        action={
          <Button onClick={() => setModalAberto(true)}>
            <IconPlus width={16} height={16} />
            Novo lote
          </Button>
        }
      />

      <div className="mb-4 relative">
        <IconSearch width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Buscar por código ou produto…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:max-w-xs"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-emerald-600" />
        </div>
      )}

      {error && <Card className="p-4 text-sm text-red-600">Erro ao carregar lotes: {error}</Card>}

      {data && lotesFiltrados.length === 0 && !busca && (
        <EmptyState
          icon={<IconBox width={40} height={40} />}
          title="Nenhum lote ainda"
          description='Clique em "Novo lote" para registrar o primeiro lote de produção.'
        />
      )}

      {data && lotesFiltrados.length === 0 && busca && (
        <EmptyState title="Nenhum resultado" description={`Nenhum lote encontrado para "${busca}".`} />
      )}

      {data && lotesFiltrados.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Lote</th>
                <th className="px-5 py-3 font-medium">Produto</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Produção</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lotesFiltrados.map((lote) => (
                <tr key={lote.id} className="group transition hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <Link to={`/lotes/${lote.id}`} className="font-medium text-slate-900">
                      {lote.codigo}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {data.produtos.get(lote.produto_id)?.nome ?? '—'}
                  </td>
                  <td className="hidden px-5 py-3.5 text-slate-500 sm:table-cell">
                    {formatarData(lote.data_producao)}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusChip status={lote.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      to={`/lotes/${lote.id}`}
                      className="inline-flex text-slate-300 transition group-hover:text-emerald-600"
                      aria-label={`Abrir lote ${lote.codigo}`}
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

      <Modal open={modalAberto} onClose={() => setModalAberto(false)} title="Novo lote">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Código do lote">
            <TextInput name="codigo" placeholder="FEC-2026-004" required autoFocus />
          </Field>
          <Field label="Produto">
            <Select name="produto_id" defaultValue="" required>
              <option value="" disabled>Selecione…</option>
              {produtosList.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </Select>
          </Field>
          <Field label="Data de produção">
            <TextInput name="data_producao" type="date" />
          </Field>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={salvando}>
              Criar lote
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
