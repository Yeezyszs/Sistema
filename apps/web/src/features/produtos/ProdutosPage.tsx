import { useState, type FormEvent } from 'react';
import { listProdutos, atualizarProduto } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import type { Produto } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Modal } from '../../components/ui';
import { IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function ProdutosPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [busca, setBusca] = useState('');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(() => listProdutos(), [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const acabados = (data ?? []).filter((p) => p.tipo === 'produto_acabado');
  const q = busca.trim().toLowerCase();
  const linhas = acabados.filter((p) =>
    !q || [p.codigo, p.nome_curto, p.nome].some((v) => (v ?? '').toLowerCase().includes(q)));

  return (
    <>
      <PageHeader
        title="Produtos"
        subtitle="Catálogo de produto acabado — código e apelido (nome curto)"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="search" placeholder="Buscar código, apelido, nome…" value={busca} onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && linhas.length === 0 && <EmptyState title="Nenhum produto" description="Ajuste a busca." />}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Código</th>
                <th className="px-3 py-3 font-medium">Apelido (nome curto)</th>
                <th className="px-3 py-3 font-medium">Nome completo</th>
                <th className="hidden px-3 py-3 font-medium text-right md:table-cell">Peso unit.</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-mono text-xs font-medium text-slate-600">{p.codigo ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    {p.nome_curto
                      ? <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{p.nome_curto}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{p.nome}</span></td>
                  <td className="hidden px-3 py-2.5 text-right text-slate-500 md:table-cell">{p.peso_unitario != null ? `${p.peso_unitario} kg` : '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => setEditando(p)} className="text-xs font-medium text-slate-500 hover:text-emerald-600">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {editando && (
        <ModalEditar produto={editando} onClose={() => setEditando(null)} onSaved={() => { setEditando(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

function ModalEditar({ produto, onClose, onSaved, sucesso, erro }: {
  produto: Produto; onClose: () => void; onSaved: () => void;
  sucesso: (m: string) => void; erro: (m: string) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    setSalvando(true);
    try {
      await atualizarProduto(produto.id, {
        codigo: String(f.get('codigo') ?? '').trim() || null,
        nome_curto: String(f.get('nome_curto') ?? '').trim() || null,
        nome: String(f.get('nome') ?? '').trim() || produto.nome,
        peso_unitario: num('peso_unitario'),
      });
      sucesso('Produto atualizado.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title="Editar produto" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código"><TextInput name="codigo" defaultValue={produto.codigo ?? ''} placeholder="16232" /></Field>
          <Field label="Apelido (nome curto)"><TextInput name="nome_curto" defaultValue={produto.nome_curto ?? ''} placeholder="P16 5%" /></Field>
        </div>
        <Field label="Nome completo"><TextInput name="nome" defaultValue={produto.nome} required /></Field>
        <Field label="Peso unitário (kg por bag/saca)"><TextInput name="peso_unitario" type="number" step="any" min="0" defaultValue={produto.peso_unitario ?? ''} /></Field>
        <p className="text-xs text-slate-400">O apelido aparece no quadro de programação e nas listas compactas.</p>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
