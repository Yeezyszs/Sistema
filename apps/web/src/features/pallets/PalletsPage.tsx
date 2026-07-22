import { useState, type FormEvent } from 'react';
import { listPallets, listMovimentosPallet, lancarMovimentoPallet } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade, hojeLocalISO } from '../../lib/format';
import {
  TIPO_PALLET_LABEL, MOV_PALLET, MOV_PALLET_LABEL, palletsEmTerceiros,
} from '@sistema/domain';
import type { Pallet, TipoMovPallet } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function PalletsPage() {
  const [recarregar, setRecarregar] = useState(0);
  const [mov, setMov] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [pallets, movs] = await Promise.all([listPallets(), listMovimentosPallet()]);
    return { pallets, movs, palletsMap: new Map(pallets.map((p) => [p.id, p])) };
  }, [recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  async function onMovimentar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await lancarMovimentoPallet({
        pallet_id: String(f.get('pallet_id') ?? ''),
        tipo_mov: String(f.get('tipo_mov') ?? 'recebido') as TipoMovPallet,
        quantidade: Number(f.get('quantidade') ?? 0),
        parceiro: String(f.get('parceiro') ?? '').trim() || null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
        data: String(f.get('data') ?? hojeLocalISO()),
      });
      sucesso('Movimento lançado.'); setMov(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  // reconciliação por tipo: em poder de terceiros = Σ enviado − Σ devolvido
  function terceiros(palletId: string): number {
    return palletsEmTerceiros((data?.movs ?? []).filter((m) => m.pallet_id === palletId));
  }

  return (
    <>
      <PageHeader
        title="Pallets"
        subtitle="Saldo e reconciliação (CHEP · PBR · próprios)"
        action={<Button onClick={() => setMov(true)}><IconPlus width={16} height={16} />Movimentar</Button>}
      />

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>}

      {data && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {data.pallets.map((p) => (
            <Card key={p.id} className="p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">{TIPO_PALLET_LABEL[p.tipo]}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-800">{formatarQuantidade(p.saldo)}</p>
              <p className="text-xs text-slate-400">em casa</p>
              {p.tipo === 'chep' && (
                <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                  Em poder de terceiros: <span className="font-semibold text-amber-600">{formatarQuantidade(terceiros(p.id))}</span>
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {data && data.movs.length === 0 && (
        <EmptyState title="Sem movimentos" description='Lance o primeiro em "Movimentar".' />
      )}

      {data && data.movs.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Tipo pallet</th>
                <th className="px-3 py-3 font-medium">Movimento</th>
                <th className="px-3 py-3 font-medium text-right">Qtd</th>
                <th className="hidden px-3 py-3 font-medium md:table-cell">Parceiro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.movs.map((m) => {
                const negativo = m.tipo_mov === 'enviado';
                const pal = data.palletsMap.get(m.pallet_id);
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-500">{formatarData(m.data)}</td>
                    <td className="px-3 py-2.5 text-slate-700">{pal ? TIPO_PALLET_LABEL[pal.tipo] : '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{MOV_PALLET_LABEL[m.tipo_mov]}</td>
                    <td className={`px-3 py-2.5 text-right font-medium ${negativo ? 'text-red-600' : 'text-brand-600'}`}>
                      {negativo ? '−' : '+'}{formatarQuantidade(m.quantidade)}
                    </td>
                    <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{m.parceiro ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={mov} onClose={() => setMov(false)} title="Movimentar pallets">
        <form onSubmit={onMovimentar} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de pallet">
              <Select name="pallet_id" defaultValue={data?.pallets[0]?.id ?? ''} required>
                {(data?.pallets ?? []).map((p) => <option key={p.id} value={p.id}>{TIPO_PALLET_LABEL[p.tipo]}</option>)}
              </Select>
            </Field>
            <Field label="Movimento">
              <Select name="tipo_mov" defaultValue="recebido">
                {MOV_PALLET.map((t) => <option key={t} value={t}>{MOV_PALLET_LABEL[t]}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade"><TextInput name="quantidade" type="number" step="any" required placeholder="0" /></Field>
            <Field label="Data"><TextInput name="data" type="date" defaultValue={hojeLocalISO()} /></Field>
          </div>
          <Field label="Parceiro"><TextInput name="parceiro" placeholder="Cliente / transportadora" /></Field>
          <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
          <p className="text-xs text-slate-400">Enviado sai do saldo (fica em terceiros); recebido/devolvido entram. Ajuste aceita negativo.</p>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setMov(false)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Lançar</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
