import { useState, type FormEvent } from 'react';
import {
  getApontamentosDoLote, listLinhas, listRecebimentosPeriodo, criarApontamento, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { TURNO_PROD, TURNO_PROD_LABEL, calcularRendimento } from '@sistema/domain';
import type { TurnoProd } from '@sistema/domain';
import { Card, Button, Field, TextInput, Select, Modal, Spinner } from '../../components/ui';
import { IconClipboard } from '../../components/icons';
import { useToast } from '../../components/Toast';

// Apontamento direto pelo lote (retorno do PCP): registra o kg produzido do
// lote no dia/turno e mostra a eficiência da extração por dia (produzido do
// lote ÷ raiz descarregada no dia).
export function ApontamentosLoteCard({ loteId, produtoId }: { loteId: string; produtoId: string }) {
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [apontamentos, linhas] = await Promise.all([getApontamentosDoLote(loteId), listLinhas()]);
    // Descargas dos dias apontados — denominador da eficiência diária.
    const dias = [...new Set(apontamentos.map((a) => a.data))].sort();
    const de = dias[0];
    const ate = dias[dias.length - 1];
    const descargas = de && ate ? await listRecebimentosPeriodo(de, ate) : [];
    return { apontamentos, linhas, linhasMap: mapBy(linhas, 'id'), descargas };
  }, [loteId, recarregar]);

  // Agrupa por dia: produzido do lote × raiz descarregada no dia.
  const porDia = new Map<string, { produzido: number; raiz: number }>();
  for (const a of data?.apontamentos ?? []) {
    const prev = porDia.get(a.data) ?? { produzido: 0, raiz: 0 };
    prev.produzido += a.quantidade_kg ?? 0;
    porDia.set(a.data, prev);
  }
  for (const r of data?.descargas ?? []) {
    const dia = r.recebido_em.slice(0, 10);
    const e = porDia.get(dia);
    if (e) e.raiz += r.quantidade ?? 0;
  }
  const diasOrdenados = [...porDia.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const totalProduzido = diasOrdenados.reduce((s, [, v]) => s + v.produzido, 0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const qtd = String(f.get('quantidade_kg') ?? '').trim();
    setSalvando(true);
    try {
      await criarApontamento({
        data: String(f.get('data') ?? new Date().toISOString().slice(0, 10)),
        turno: String(f.get('turno') ?? '1t') as TurnoProd,
        linha_id: String(f.get('linha_id') ?? '') || null,
        produto_id: produtoId,
        lote_id: loteId,
        quantidade_kg: qtd ? Number(qtd) : null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
      });
      sucesso('Produção apontada no lote.');
      setModal(false);
      setRecarregar((n) => n + 1);
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Apontamentos de produção
        </h2>
        <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setModal(true)}>
          <IconClipboard width={14} height={14} />
          Apontar
        </Button>
      </div>

      {loading && <div className="flex justify-center py-6"><Spinner className="h-5 w-5 text-emerald-600" /></div>}

      {data && data.apontamentos.length === 0 && (
        <p className="text-sm text-slate-400">Nenhum apontamento neste lote ainda.</p>
      )}

      {data && diasOrdenados.length > 0 && (
        <>
          <ul className="space-y-2">
            {diasOrdenados.map(([dia, v]) => {
              const ef = calcularRendimento(v.produzido || null, v.raiz || null);
              return (
                <li key={dia} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">{formatarData(dia)}</p>
                    <p className="text-xs text-slate-400">
                      {formatarQuantidade(v.produzido, 'kg')}
                      {v.raiz > 0 ? ` · raiz do dia ${formatarQuantidade(v.raiz, 'kg')}` : ' · sem descarga no dia'}
                    </p>
                  </div>
                  {ef != null ? (
                    <span className="shrink-0 text-xs font-semibold text-emerald-600">{(ef * 100).toFixed(1)}%</span>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-300">—</span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Total do lote: <span className="font-semibold text-slate-700">{formatarQuantidade(totalProduzido, 'kg')}</span>
            <span className="text-slate-400"> · eficiência = produzido ÷ raiz descarregada no dia</span>
          </p>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Apontar produção do lote">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Data"><TextInput name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
            <Field label="Turno"><Select name="turno" defaultValue="1t">{TURNO_PROD.map((t) => <option key={t} value={t}>{TURNO_PROD_LABEL[t]}</option>)}</Select></Field>
            <Field label="Linha">
              <Select name="linha_id" defaultValue="">
                <option value="">—</option>
                {(data?.linhas ?? []).map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Produzido (kg)"><TextInput name="quantidade_kg" type="number" step="any" min="0" required placeholder="0" /></Field>
          <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            O apontamento fica vinculado a este lote e ao dia — a eficiência usa a raiz das descargas do dia.
          </p>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={salvando}>Apontar</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
