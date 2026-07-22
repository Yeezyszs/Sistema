import { useState, type FormEvent } from 'react';
import { listClientes, criarCliente, atualizarCliente, excluirCliente } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import type { Cliente } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Modal } from '../../components/ui';
import { IconPlus, IconSearch } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function ClientesPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [excluindo, setExcluindo] = useState<Cliente | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(() => listClientes(), [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const linhas = (data ?? []).filter((c) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return [c.nome, c.cnpj, c.contato, c.email].some((v) => (v ?? '').toLowerCase().includes(q));
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const nome = String(f.get('nome') ?? '').trim();
    if (!nome) { erro('Informe o nome.'); return; }
    const payload = {
      nome,
      cnpj: txt('cnpj'),
      contato: txt('contato'),
      telefone: txt('telefone'),
      email: txt('email'),
      endereco_entrega: txt('endereco_entrega'),
      condicao_pagamento: txt('condicao_pagamento'),
    };
    setSalvando(true);
    try {
      if (editando) { await atualizarCliente(editando.id, payload); sucesso('Cliente atualizado.'); }
      else { await criarCliente(payload); sucesso('Cliente cadastrado.'); }
      setModal(false); setEditando(null); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha ao salvar.'); }
    finally { setSalvando(false); }
  }

  async function onExcluir() {
    if (!excluindo) return;
    setSalvando(true);
    try {
      await excluirCliente(excluindo.id);
      sucesso('Cliente excluído.'); setExcluindo(null); rec();
    } catch (err) {
      erro(err instanceof Error && /foreign key|violates|constraint/i.test(err.message)
        ? 'Não é possível excluir: o cliente tem pedidos ou lotes vinculados.'
        : err instanceof Error ? err.message : 'Falha ao excluir.');
    } finally { setSalvando(false); }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro comercial de clientes"
        action={<Button onClick={() => { setEditando(null); setModal(true); }}><IconPlus width={16} height={16} />Novo cliente</Button>}
      />

      <div className="mb-4 relative max-w-sm">
        <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="search" placeholder="Buscar nome, CNPJ, contato…" value={busca} onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && linhas.length === 0 && <EmptyState title="Nenhum cliente" description="Cadastre clientes em 'Novo cliente'." />}

      {data && linhas.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Cliente</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">CNPJ</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">Contato</th>
                <th className="hidden px-5 py-3 font-medium lg:table-cell">Condição pgto.</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{c.nome}</td>
                  <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{c.cnpj ?? '—'}</td>
                  <td className="hidden px-5 py-3 text-slate-500 lg:table-cell">
                    {[c.contato, c.telefone].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="hidden px-5 py-3 text-slate-500 lg:table-cell">{c.condicao_pagamento ?? '—'}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button onClick={() => { setEditando(c); setModal(true); }} className="text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                    <button onClick={() => setExcluindo(c)} className="ml-3 text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modal} onClose={() => { setModal(false); setEditando(null); }} title={editando ? 'Editar cliente' : 'Novo cliente'} size="lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome / razão social"><TextInput name="nome" defaultValue={editando?.nome ?? ''} required autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ"><TextInput name="cnpj" defaultValue={editando?.cnpj ?? ''} placeholder="00.000.000/0000-00" /></Field>
            <Field label="Condição de pagamento"><TextInput name="condicao_pagamento" defaultValue={editando?.condicao_pagamento ?? ''} placeholder="Ex.: 28 dias" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contato (pessoa)"><TextInput name="contato" defaultValue={editando?.contato ?? ''} placeholder="Nome do responsável" /></Field>
            <Field label="Telefone"><TextInput name="telefone" defaultValue={editando?.telefone ?? ''} /></Field>
          </div>
          <Field label="E-mail"><TextInput name="email" type="email" defaultValue={editando?.email ?? ''} /></Field>
          <Field label="Endereço de entrega"><TextInput name="endereco_entrega" defaultValue={editando?.endereco_entrega ?? ''} /></Field>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => { setModal(false); setEditando(null); }}>Cancelar</Button>
            <Button type="submit" loading={salvando}>{editando ? 'Salvar' : 'Cadastrar'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={excluindo != null} onClose={() => setExcluindo(null)} title="Excluir cliente">
        <p className="text-sm text-slate-600">Excluir <span className="font-semibold">{excluindo?.nome}</span>? Se houver pedidos ou lotes vinculados, a exclusão será bloqueada.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
          <Button type="button" loading={salvando} className="bg-red-600 hover:bg-red-700 disabled:bg-red-300" onClick={() => void onExcluir()}>Excluir</Button>
        </div>
      </Modal>
    </>
  );
}
