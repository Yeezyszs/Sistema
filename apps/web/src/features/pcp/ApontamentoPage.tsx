import { useState, type FormEvent } from 'react';
import {
  listApontamentos, listLinhas, listProdutos, listLotes, listFuncionarios,
  criarApontamento, excluirApontamento, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { TURNO_PROD, TURNO_PROD_LABEL, calcularRendimento } from '@sistema/domain';
import type { TurnoProd } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select } from '../../components/ui';
import { IconArrowLeft, IconChevronRight, IconClipboard } from '../../components/icons';
import { useToast } from '../../components/Toast';

function semanaDe(base: Date): { de: string; ate: string } {
  const d = new Date(base);
  const dow = (d.getDay() + 6) % 7;
  const seg = new Date(d); seg.setDate(d.getDate() - dow);
  const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  return { de: seg.toISOString().slice(0, 10), ate: dom.toISOString().slice(0, 10) };
}

export function ApontamentoPage() {
  const [refBase, setRefBase] = useState(new Date());
  const [recarregar, setRecarregar] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [qtd, setQtd] = useState('');
  const [raiz, setRaiz] = useState('');
  const { de, ate } = semanaDe(refBase);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [apont, linhas, produtos, lotes, funcionarios] = await Promise.all([
      listApontamentos(de, ate), listLinhas(), listProdutos(), listLotes(), listFuncionarios(),
    ]);
    return {
      apont, linhas, produtos, lotes, funcionarios,
      linhasMap: mapBy(linhas, 'id'),
      produtosMap: mapBy(produtos, 'id'),
      lotesMap: mapBy(lotes, 'id'),
    };
  }, [de, ate, recarregar]);

  const produtosAcabados = data?.produtos.filter((p) => p.tipo === 'produto_acabado') ?? [];
  const rendimentoPreview = calcularRendimento(qtd ? Number(qtd) : null, raiz ? Number(raiz) : null);

  // Rendimento médio da semana
  const comRend = (data?.apont ?? []).filter((a) => a.rendimento != null);
  const rendMedio = comRend.length ? comRend.reduce((s, a) => s + (a.rendimento ?? 0), 0) / comRend.length : null;

  function mudarSemana(delta: number) {
    const d = new Date(refBase); d.setDate(d.getDate() + delta * 7); setRefBase(d);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await criarApontamento({
        data: String(f.get('data') ?? de),
        turno: String(f.get('turno') ?? '1t') as TurnoProd,
        linha_id: String(f.get('linha_id') ?? '') || null,
        produto_id: String(f.get('produto_id') ?? '') || null,
        lote_id: String(f.get('lote_id') ?? '') || null,
        operador_id: String(f.get('operador_id') ?? '') || null,
        quantidade_kg: qtd ? Number(qtd) : null,
        raiz_kg: raiz ? Number(raiz) : null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
      });
      (e.target as HTMLFormElement).reset();
      setQtd(''); setRaiz('');
      sucesso('Apontamento registrado. O real da programação foi atualizado.');
      setRecarregar((n) => n + 1);
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function excluir(id: string) {
    try { await excluirApontamento(id); sucesso('Apontamento removido.'); setRecarregar((n) => n + 1); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader title="Apontamento & Rendimento" subtitle="Produção real por turno/linha — fonte única (PCP)" />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulário */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Novo apontamento</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Data"><TextInput name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Field>
              <Field label="Turno"><Select name="turno" defaultValue="1t">{TURNO_PROD.map((t) => <option key={t} value={t}>{TURNO_PROD_LABEL[t]}</option>)}</Select></Field>
              <Field label="Linha"><Select name="linha_id" defaultValue=""><option value="">—</option>{(data?.linhas ?? []).map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}</Select></Field>
            </div>
            <Field label="Produto">
              <Select name="produto_id" defaultValue="">
                <option value="">—</option>
                {produtosAcabados.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lote"><Select name="lote_id" defaultValue=""><option value="">—</option>{(data?.lotes ?? []).map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}</Select></Field>
              <Field label="Operador"><Select name="operador_id" defaultValue=""><option value="">—</option>{(data?.funcionarios ?? []).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</Select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Produzido (kg)"><TextInput type="number" step="any" min="0" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="0" /></Field>
              <Field label="Raiz consumida (kg)"><TextInput type="number" step="any" min="0" value={raiz} onChange={(e) => setRaiz(e.target.value)} placeholder="0" /></Field>
            </div>
            {rendimentoPreview != null && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Rendimento: <span className="font-semibold">{(rendimentoPreview * 100).toFixed(1)}%</span> (produto ÷ raiz)
              </p>
            )}
            <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
            <Button type="submit" loading={salvando} className="w-full">Registrar apontamento</Button>
          </form>
        </Card>

        {/* Lista */}
        <div className="lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => mudarSemana(-1)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><IconArrowLeft width={16} height={16} /></button>
              <span className="text-sm font-medium text-slate-700">{formatarData(de)} — {formatarData(ate)}</span>
              <button onClick={() => mudarSemana(1)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><IconChevronRight width={16} height={16} /></button>
              <button onClick={() => setRefBase(new Date())} className="ml-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">Semana atual</button>
            </div>
            {rendMedio != null && (
              <span className="text-sm text-slate-500">Rendimento médio: <span className="font-semibold text-emerald-600">{(rendMedio * 100).toFixed(1)}%</span></span>
            )}
          </div>

          {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}
          {data && data.apont.length === 0 && (
            <EmptyState icon={<IconClipboard width={40} height={40} />} title="Sem apontamentos" description="Os apontamentos da semana aparecerão aqui." />
          )}
          {data && data.apont.length > 0 && (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-3 font-medium">Data</th>
                    <th className="px-3 py-3 font-medium">Turno</th>
                    <th className="px-3 py-3 font-medium">Linha</th>
                    <th className="px-3 py-3 font-medium">Produto</th>
                    <th className="hidden px-3 py-3 font-medium md:table-cell">Lote</th>
                    <th className="px-3 py-3 font-medium text-right">Produzido</th>
                    <th className="hidden px-3 py-3 font-medium text-right md:table-cell">Raiz</th>
                    <th className="px-3 py-3 font-medium text-right">Rend.</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.apont.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 text-slate-600">{formatarData(a.data)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${a.turno === '2t' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{TURNO_PROD_LABEL[a.turno]}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{a.linha_id ? data.linhasMap.get(a.linha_id)?.codigo ?? '—' : '—'}</td>
                      <td className="px-3 py-2.5 text-slate-700"><span className="line-clamp-1">{a.produto_id ? data.produtosMap.get(a.produto_id)?.nome ?? '—' : '—'}</span></td>
                      <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{a.lote_id ? data.lotesMap.get(a.lote_id)?.codigo ?? '—' : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(a.quantidade_kg)}</td>
                      <td className="hidden px-3 py-2.5 text-right text-slate-500 md:table-cell">{formatarQuantidade(a.raiz_kg)}</td>
                      <td className="px-3 py-2.5 text-right">
                        {a.rendimento != null ? <span className="font-semibold text-emerald-600">{(a.rendimento * 100).toFixed(1)}%</span> : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => void excluir(a.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
