import { useState, type FormEvent } from 'react';
import {
  listInsumosLaboratorio, criarInsumoLaboratorio, atualizarInsumoLaboratorio, excluirInsumoLaboratorio,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarQuantidade } from '../../lib/format';
import type { InsumoLaboratorio } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function InsumosLaboratorioPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [edit, setEdit] = useState<InsumoLaboratorio | null>(null);
  const [novo, setNovo] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(() => listInsumosLaboratorio(), [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const aComprar = (data ?? []).filter((i) => i.precisa_comprar).length;

  async function alternarSolicitado(i: InsumoLaboratorio) {
    try { await atualizarInsumoLaboratorio(i.id, { solicitado: !i.solicitado }); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function remover(id: string) {
    try { await excluirInsumoLaboratorio(id); sucesso('Insumo excluído.'); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Insumos do Laboratório"
        subtitle={aComprar > 0 ? `${aComprar} insumo(s) precisam de compra` : 'Estoque de insumos do lab'}
        action={<Button onClick={() => setNovo(true)}><IconPlus width={16} height={16} />Novo insumo</Button>}
      />

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
      {data && data.length === 0 && (
        <EmptyState title="Nenhum insumo" description='Cadastre o primeiro em "Novo insumo".' />
      )}

      {data && data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Insumo</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Tipo</th>
                <th className="hidden px-3 py-3 font-medium lg:table-cell">Especificação</th>
                <th className="px-3 py-3 font-medium text-right">Necessária</th>
                <th className="px-3 py-3 font-medium text-right">Em estoque</th>
                <th className="px-3 py-3 font-medium">Comprar?</th>
                <th className="px-3 py-3 font-medium">Solicitado?</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((i) => (
                <tr key={i.id} className={`hover:bg-slate-50 ${i.precisa_comprar && !i.solicitado ? 'bg-red-50/40' : ''}`}>
                  <td className="px-3 py-2.5 font-medium text-slate-700">{i.nome}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{i.tipo ?? '—'}</td>
                  <td className="hidden px-3 py-2.5 text-slate-500 lg:table-cell"><span className="line-clamp-1">{i.especificacao ?? '—'}</span></td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(i.quantidade_necessaria)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(i.quantidade_estoque)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${i.precisa_comprar ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {i.precisa_comprar ? 'SIM' : 'NÃO'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {i.precisa_comprar ? (
                      <button onClick={() => void alternarSolicitado(i)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${i.solicitado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {i.solicitado ? 'Solicitado' : 'Marcar'}
                      </button>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button onClick={() => setEdit(i)} className="mr-3 text-xs font-medium text-slate-500 hover:text-slate-800">Editar</button>
                    <button onClick={() => void remover(i.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {(novo || edit) && (
        <ModalInsumo insumo={edit} onClose={() => { setNovo(false); setEdit(null); }} onSaved={() => { setNovo(false); setEdit(null); rec(); }} sucesso={sucesso} erro={erro} />
      )}
    </>
  );
}

function ModalInsumo({ insumo, onClose, onSaved, sucesso, erro }: {
  insumo: InsumoLaboratorio | null;
  onClose: () => void; onSaved: () => void;
  sucesso: (m: string) => void; erro: (m: string) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    const payload = {
      nome: String(f.get('nome') ?? '').trim(),
      tipo: String(f.get('tipo') ?? '').trim() || null,
      especificacao: String(f.get('especificacao') ?? '').trim() || null,
      quantidade_necessaria: num('quantidade_necessaria'),
      quantidade_estoque: num('quantidade_estoque'),
      observacao: String(f.get('observacao') ?? '').trim() || null,
    };
    setSalvando(true);
    try {
      if (insumo) await atualizarInsumoLaboratorio(insumo.id, payload);
      else await criarInsumoLaboratorio(payload);
      sucesso('Insumo salvo.'); onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }
  return (
    <Modal open onClose={onClose} title={insumo ? `Editar — ${insumo.nome}` : 'Novo insumo'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome"><TextInput name="nome" defaultValue={insumo?.nome ?? ''} required placeholder="Hidróxido de sódio" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo"><TextInput name="tipo" defaultValue={insumo?.tipo ?? ''} placeholder="Produto químico" /></Field>
          <Field label="Especificação"><TextInput name="especificacao" defaultValue={insumo?.especificacao ?? ''} placeholder="1000mL, 0,1 N…" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade necessária"><TextInput name="quantidade_necessaria" type="number" step="any" min="0" defaultValue={insumo?.quantidade_necessaria ?? ''} placeholder="0" /></Field>
          <Field label="Quantidade em estoque"><TextInput name="quantidade_estoque" type="number" step="any" min="0" defaultValue={insumo?.quantidade_estoque ?? ''} placeholder="0" /></Field>
        </div>
        <Field label="Observação"><TextInput name="observacao" defaultValue={insumo?.observacao ?? ''} placeholder="Unidade, pacote…" /></Field>
        <p className="text-xs text-slate-400">"Precisa comprar?" é calculado automaticamente: estoque menor que a necessária.</p>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
