import { useState, type FormEvent } from 'react';
import {
  listEmbalagens, listMovimentosEmbalagem, criarEmbalagem, lancarMovimentoEmbalagem,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, hojeLocalISO } from '../../lib/format';
import {
  MOV_EMBALAGEM, MOV_EMBALAGEM_LABEL, embalagemAbaixoMinimo,
} from '@sistema/domain';
import type { Embalagem, MovimentoEmbalagem, TipoMovEmbalagem } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function EmbalagensPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [modalNova, setModalNova] = useState(false);
  const [mov, setMov] = useState<Embalagem | null>(null);
  const [hist, setHist] = useState<Embalagem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(() => listEmbalagens(), [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  async function onNova(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    setSalvando(true);
    try {
      await criarEmbalagem({
        nome: String(f.get('nome') ?? '').trim(),
        tipo: String(f.get('tipo') ?? '').trim() || null,
        capacidade_kg: num('capacidade_kg'),
        unidade: String(f.get('unidade') ?? 'un').trim() || 'un',
        estoque_minimo: num('estoque_minimo'),
      });
      sucesso('Embalagem cadastrada.'); setModalNova(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function onMovimentar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!mov) return;
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await lancarMovimentoEmbalagem({
        embalagem_id: mov.id,
        tipo: String(f.get('tipo') ?? 'entrada') as TipoMovEmbalagem,
        quantidade: Number(f.get('quantidade') ?? 0),
        origem: String(f.get('origem') ?? '').trim() || null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
        data: String(f.get('data') ?? hojeLocalISO()),
      });
      sucesso('Movimento lançado.'); setMov(null); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <>
      <PageHeader
        title="Embalagens"
        subtitle="Material de embalagem — saldo e consumo"
        action={<Button onClick={() => setModalNova(true)}><IconPlus width={16} height={16} />Nova embalagem</Button>}
      />

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && data.length === 0 && (
        <EmptyState title="Nenhuma embalagem" description='Cadastre a primeira em "Nova embalagem".' />
      )}

      {data && data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Embalagem</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Tipo</th>
                <th className="hidden px-3 py-3 font-medium text-right sm:table-cell">Capac.</th>
                <th className="px-3 py-3 font-medium text-right">Saldo</th>
                <th className="hidden px-3 py-3 font-medium text-right md:table-cell">Mínimo</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((e) => {
                const baixo = embalagemAbaixoMinimo(e);
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700">{e.nome}</td>
                    <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{e.tipo ?? '—'}</td>
                    <td className="hidden px-3 py-2.5 text-right text-slate-500 sm:table-cell">{e.capacidade_kg != null ? `${formatarQuantidade(e.capacidade_kg)} kg` : '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-semibold ${baixo ? 'text-red-600' : 'text-slate-800'}`}>{formatarQuantidade(e.saldo, e.unidade)}</span>
                      {baixo && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">baixo</span>}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right text-slate-500 md:table-cell">{e.estoque_minimo != null ? formatarQuantidade(e.estoque_minimo) : '—'}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => setHist(e)} className="mr-3 text-xs font-medium text-slate-400 hover:text-slate-700">Histórico</button>
                      <button onClick={() => setMov(e)} className="text-xs font-medium text-brand-600 hover:text-brand-700">Movimentar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Nova embalagem */}
      <Modal open={modalNova} onClose={() => setModalNova(false)} title="Nova embalagem">
        <form onSubmit={onNova} className="space-y-4">
          <Field label="Nome"><TextInput name="nome" required placeholder="Ex.: Big bag 1000kg" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo"><TextInput name="tipo" placeholder="big bag, saco, bag…" /></Field>
            <Field label="Unidade"><TextInput name="unidade" defaultValue="un" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacidade (kg)"><TextInput name="capacidade_kg" type="number" step="any" min="0" placeholder="0" /></Field>
            <Field label="Estoque mínimo"><TextInput name="estoque_minimo" type="number" step="any" min="0" placeholder="—" /></Field>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalNova(false)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Cadastrar</Button>
          </div>
        </form>
      </Modal>

      {/* Movimentar */}
      <Modal open={!!mov} onClose={() => setMov(null)} title={mov ? `Movimentar — ${mov.nome}` : ''}>
        <form onSubmit={onMovimentar} className="space-y-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Saldo atual: <span className="font-semibold text-slate-800">{mov ? formatarQuantidade(mov.saldo, mov.unidade) : ''}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select name="tipo" defaultValue="entrada">
                {MOV_EMBALAGEM.filter((t) => t !== 'consumo').map((t) => <option key={t} value={t}>{MOV_EMBALAGEM_LABEL[t]}</option>)}
              </Select>
            </Field>
            <Field label="Quantidade"><TextInput name="quantidade" type="number" step="any" required placeholder="0" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data"><TextInput name="data" type="date" defaultValue={hojeLocalISO()} /></Field>
            <Field label="Origem"><TextInput name="origem" placeholder="NF, fornecedor…" /></Field>
          </div>
          <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
          <p className="text-xs text-slate-400">Ajuste aceita valor negativo para corrigir o saldo.</p>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setMov(null)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Lançar</Button>
          </div>
        </form>
      </Modal>

      {/* Histórico */}
      <HistoricoModal embalagem={hist} onClose={() => setHist(null)} />
    </>
  );
}

function HistoricoModal({ embalagem, onClose }: { embalagem: Embalagem | null; onClose: () => void }) {
  const { data, loading } = useAsync(
    () => (embalagem ? listMovimentosEmbalagem(embalagem.id) : Promise.resolve([] as MovimentoEmbalagem[])),
    [embalagem?.id],
  );
  return (
    <Modal open={!!embalagem} onClose={onClose} title={embalagem ? `Histórico — ${embalagem.nome}` : ''} size="lg">
      {loading && <div className="flex justify-center py-10"><Spinner className="h-6 w-6 text-brand-600" /></div>}
      {data && data.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Sem movimentos.</p>}
      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-2 py-2 font-medium">Data</th>
                <th className="px-2 py-2 font-medium">Tipo</th>
                <th className="px-2 py-2 font-medium text-right">Qtd</th>
                <th className="px-2 py-2 font-medium">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((m) => {
                const negativo = m.tipo === 'saida' || m.tipo === 'consumo';
                return (
                  <tr key={m.id}>
                    <td className="px-2 py-2 text-slate-500">{formatarData(m.data)}</td>
                    <td className="px-2 py-2 text-slate-600">{MOV_EMBALAGEM_LABEL[m.tipo]}</td>
                    <td className={`px-2 py-2 text-right font-medium ${negativo ? 'text-red-600' : 'text-brand-600'}`}>
                      {negativo ? '−' : '+'}{formatarQuantidade(m.quantidade)}
                    </td>
                    <td className="px-2 py-2 text-slate-500">{m.origem ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
