import { useState, type FormEvent } from 'react';
import {
  listReprocessos, listLotes, listProdutos, listNaoConformidades,
  criarReprocesso, atualizarReprocesso, excluirReprocesso, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import {
  STATUS_REPROCESSO_LABEL, STATUS_REPROCESSO_TOM,
  DESTINO_REPROCESSO, DESTINO_REPROCESSO_LABEL,
} from '@sistema/domain';
import type { Reprocesso, DestinoReprocesso } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

const TOM_CLASS: Record<string, string> = {
  alerta: 'bg-amber-100 text-amber-700', sucesso: 'bg-emerald-100 text-emerald-700',
};

export function ReprocessoPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [resolver, setResolver] = useState<Reprocesso | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'resolvido'>('todos');
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [reprocessos, lotes, produtos, ncs] = await Promise.all([
      listReprocessos(), listLotes(), listProdutos(), listNaoConformidades(),
    ]);
    return {
      reprocessos, lotes, produtos, ncs,
      lotesMap: mapBy(lotes, 'id'), produtosMap: mapBy(produtos, 'id'),
    };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const linhas = (data?.reprocessos ?? []).filter((r) => filtro === 'todos' || r.status === filtro);

  async function onCriar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    setSalvando(true);
    try {
      await criarReprocesso({
        data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
        lote_id: String(f.get('lote_id') ?? '') || null,
        produto_id: String(f.get('produto_id') ?? '') || null,
        qtd_bags: num('qtd_bags'),
        quantidade_kg: num('quantidade_kg'),
        motivo: String(f.get('motivo') ?? '').trim(),
        origem: String(f.get('origem') ?? '').trim() || null,
        nc_id: String(f.get('nc_id') ?? '') || null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
      });
      sucesso('Reprocesso registrado.'); setModal(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function onResolver(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!resolver) return;
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await atualizarReprocesso(resolver.id, {
        status: 'resolvido',
        destino: String(f.get('destino') ?? 'producao') as DestinoReprocesso,
      });
      sucesso('Reprocesso resolvido.'); setResolver(null); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function remover(id: string) {
    try { await excluirReprocesso(id); sucesso('Registro excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Reprocesso"
        subtitle="Material em retrabalho — motivo, destino e resolução"
        action={<Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Novo reprocesso</Button>}
      />

      <div className="mb-4 flex gap-2">
        {(['todos', 'pendente', 'resolvido'] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${filtro === f ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>
            {f === 'todos' ? 'Todos' : STATUS_REPROCESSO_LABEL[f]}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && linhas.length === 0 && (
        <EmptyState title="Nenhum reprocesso" description='Registre o primeiro em "Novo reprocesso".' />
      )}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Nº</th>
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Lote</th>
                <th className="px-3 py-3 font-medium">Motivo</th>
                <th className="px-3 py-3 font-medium text-right">Qtd</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Destino</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-700">{r.numero}</td>
                  <td className="px-3 py-2.5 text-slate-500">{formatarData(r.data)}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell">{r.lote_id ? data.lotesMap.get(r.lote_id)?.codigo ?? '—' : '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600"><span className="line-clamp-1">{r.motivo}</span></td>
                  <td className="px-3 py-2.5 text-right text-slate-600">
                    {r.qtd_bags != null ? `${formatarQuantidade(r.qtd_bags)} bags` : r.quantidade_kg != null ? `${formatarQuantidade(r.quantidade_kg)} kg` : '—'}
                  </td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{r.destino ? DESTINO_REPROCESSO_LABEL[r.destino] : '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOM_CLASS[STATUS_REPROCESSO_TOM[r.status]]}`}>
                      {STATUS_REPROCESSO_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {r.status === 'pendente' && (
                      <button onClick={() => setResolver(r)} className="mr-3 text-xs font-medium text-emerald-600 hover:text-emerald-700">Resolver</button>
                    )}
                    <button onClick={() => void remover(r.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Novo reprocesso */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo reprocesso" size="lg">
        <form onSubmit={onCriar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><TextInput name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
            <Field label="Origem"><TextInput name="origem" placeholder="Linha, estoque, cliente…" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lote">
              <Select name="lote_id" defaultValue="">
                <option value="">—</option>
                {(data?.lotes ?? []).map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}
              </Select>
            </Field>
            <Field label="Produto">
              <Select name="produto_id" defaultValue="">
                <option value="">—</option>
                {(data?.produtos ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Qtd (bags)"><TextInput name="qtd_bags" type="number" step="any" min="0" placeholder="—" /></Field>
            <Field label="Qtd (kg)"><TextInput name="quantidade_kg" type="number" step="any" min="0" placeholder="—" /></Field>
          </div>
          <Field label="Motivo"><TextInput name="motivo" required placeholder="Ex.: umidade fora do padrão" /></Field>
          <Field label="NC vinculada (opcional)">
            <Select name="nc_id" defaultValue="">
              <option value="">— sem NC</option>
              {(data?.ncs ?? []).map((n) => <option key={n.id} value={n.id}>#{n.numero} · {n.descricao.slice(0, 40)}</option>)}
            </Select>
          </Field>
          <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* Resolver */}
      <Modal open={!!resolver} onClose={() => setResolver(null)} title={resolver ? `Resolver reprocesso #${resolver.numero}` : ''}>
        <form onSubmit={onResolver} className="space-y-4">
          <p className="text-sm text-slate-600">{resolver?.motivo}</p>
          <Field label="Destino">
            <Select name="destino" defaultValue="producao">
              {DESTINO_REPROCESSO.map((d) => <option key={d} value={d}>{DESTINO_REPROCESSO_LABEL[d]}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setResolver(null)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Concluir</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
