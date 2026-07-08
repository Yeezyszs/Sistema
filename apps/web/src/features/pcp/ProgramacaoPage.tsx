import { useState, type FormEvent } from 'react';
import {
  listProgramacao, listLinhas, listProdutos, criarProgramacao, excluirProgramacao, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import {
  TURNO_PROD, TURNO_PROD_LABEL, calcularMeta, atingimento, gap,
  raizNecessaria, numeroCargas,
} from '@sistema/domain';
import type { TurnoProd, Linha, Produto } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconPlus, IconClipboard, IconArrowLeft, IconChevronRight } from '../../components/icons';
import { useToast } from '../../components/Toast';

// Semana (segunda a domingo) que contém a data.
function semanaDe(base: Date): { de: string; ate: string } {
  const d = new Date(base);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  const seg = new Date(d); seg.setDate(d.getDate() - dow);
  const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  return { de: seg.toISOString().slice(0, 10), ate: dom.toISOString().slice(0, 10) };
}

export function ProgramacaoPage() {
  const [refBase, setRefBase] = useState(new Date());
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);
  const { de, ate } = semanaDe(refBase);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [prog, linhas, produtos] = await Promise.all([
      listProgramacao(de, ate), listLinhas(), listProdutos(),
    ]);
    return {
      prog, linhas, produtos,
      linhasMap: mapBy(linhas, 'id'),
      produtosMap: mapBy(produtos, 'id'),
    };
  }, [de, ate, recarregar]);

  const produtosAcabados = data?.produtos.filter((p) => p.tipo === 'produto_acabado') ?? [];

  // Totais da semana
  const totMeta = (data?.prog ?? []).reduce((s, p) => s + (p.meta_kg ?? 0), 0);
  const totReal = (data?.prog ?? []).reduce((s, p) => s + (p.real_kg ?? 0), 0);

  function mudarSemana(delta: number) {
    const d = new Date(refBase); d.setDate(d.getDate() + delta * 7); setRefBase(d);
  }

  async function excluir(id: string) {
    try { await excluirProgramacao(id); sucesso('Programação removida.'); setRecarregar((n) => n + 1); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader
        title="Programação de Produção"
        subtitle="Grade turno × linha × dia — meta e real (PCP)"
        action={<Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Nova programação</Button>}
      />

      {/* Navegação de semana + totais */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => mudarSemana(-1)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><IconArrowLeft width={16} height={16} /></button>
          <span className="text-sm font-medium text-slate-700">{formatarData(de)} — {formatarData(ate)}</span>
          <button onClick={() => mudarSemana(1)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><IconChevronRight width={16} height={16} /></button>
          <button onClick={() => setRefBase(new Date())} className="ml-1 text-xs font-medium text-emerald-600 hover:text-emerald-700">Semana atual</button>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-slate-500">Meta: <span className="font-semibold text-slate-800">{formatarQuantidade(totMeta, 'kg')}</span></span>
          <span className="text-slate-500">Real: <span className="font-semibold text-slate-800">{formatarQuantidade(totReal, 'kg')}</span></span>
          {totMeta > 0 && (
            <span className={`font-semibold ${totReal / totMeta >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {(totReal / totMeta * 100).toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && data.prog.length === 0 && (
        <EmptyState icon={<IconClipboard width={40} height={40} />} title="Sem programação nesta semana" description='Adicione em "Nova programação".' />
      )}

      {data && data.prog.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Data</th>
                <th className="px-3 py-3 font-medium">Turno</th>
                <th className="px-3 py-3 font-medium">Linha</th>
                <th className="px-3 py-3 font-medium">Produto / atividade</th>
                <th className="px-3 py-3 font-medium text-right">Meta</th>
                <th className="px-3 py-3 font-medium text-right">Real</th>
                <th className="px-3 py-3 font-medium text-right">Ating.</th>
                <th className="hidden px-3 py-3 font-medium text-right md:table-cell">Raiz</th>
                <th className="hidden px-3 py-3 font-medium text-center md:table-cell">Cargas</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.prog.map((p) => {
                const prod = p.produto_id ? data.produtosMap.get(p.produto_id) : null;
                const at = atingimento(p.real_kg, p.meta_kg);
                const g = gap(p.meta_kg, p.real_kg);
                const raiz = raizNecessaria(p.real_kg, prod?.rendimento ?? null);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-600">{formatarData(p.data)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${p.turno === '2t' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {TURNO_PROD_LABEL[p.turno]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{p.linha_id ? data.linhasMap.get(p.linha_id)?.codigo ?? '—' : '—'}</td>
                    <td className="px-3 py-2.5 text-slate-700">
                      <span className="line-clamp-1">{prod?.nome ?? p.atividade ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(p.meta_kg)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{formatarQuantidade(p.real_kg)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {at != null ? (
                        <span className={`font-semibold ${at >= 1 ? 'text-emerald-600' : at >= 0.8 ? 'text-amber-600' : 'text-red-600'}`}>
                          {(at * 100).toFixed(0)}%
                        </span>
                      ) : '—'}
                      {g != null && g > 0 && <span className="ml-1 text-xs text-slate-400">-{formatarQuantidade(g)}</span>}
                    </td>
                    <td className="hidden px-3 py-2.5 text-right text-slate-500 md:table-cell">{raiz != null ? formatarQuantidade(raiz, 'kg') : '—'}</td>
                    <td className="hidden px-3 py-2.5 text-center text-slate-500 md:table-cell">{numeroCargas(raiz) ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => void excluir(p.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <ModalProgramacao
        open={modal}
        onClose={() => setModal(false)}
        linhas={data?.linhas ?? []}
        produtos={produtosAcabados}
        dataDefault={de}
        onSaved={() => setRecarregar((n) => n + 1)}
      />
    </>
  );
}

function ModalProgramacao({
  open, onClose, linhas, produtos, dataDefault, onSaved,
}: {
  open: boolean; onClose: () => void; linhas: Linha[]; produtos: Produto[]; dataDefault: string; onSaved: () => void;
}) {
  const [linhaId, setLinhaId] = useState('');
  const [produtoId, setProdutoId] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const linha = linhas.find((l) => l.id === linhaId);
  const produto = produtos.find((p) => p.id === produtoId);
  const metaSugerida = linha && produto
    ? calcularMeta(linha.horas_disponiveis, produto.tempo_por_lote_min, produto.kg_por_lote)
    : null;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) ?? '').trim(); return v ? Number(v) : null; };
    setSalvando(true);
    try {
      await criarProgramacao({
        data: String(f.get('data') ?? dataDefault),
        turno: String(f.get('turno') ?? '1t') as TurnoProd,
        linha_id: linhaId || null,
        produto_id: produtoId || null,
        atividade: String(f.get('atividade') ?? '').trim() || null,
        meta_kg: num('meta_kg') ?? metaSugerida,
        real_kg: num('real_kg'),
        observacao: String(f.get('observacao') ?? '').trim() || null,
      });
      sucesso('Programação adicionada.');
      setLinhaId(''); setProdutoId('');
      onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova programação" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={dataDefault} required /></Field>
          <Field label="Turno"><Select name="turno" defaultValue="1t">{TURNO_PROD.map((t) => <option key={t} value={t}>{TURNO_PROD_LABEL[t]}</option>)}</Select></Field>
          <Field label="Linha">
            <Select value={linhaId} onChange={(e) => setLinhaId(e.target.value)}>
              <option value="">—</option>
              {linhas.map((l) => <option key={l.id} value={l.id}>{l.codigo}{l.nome ? ` (${l.nome})` : ''}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Produto">
          <Select value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
            <option value="">— ou informe atividade abaixo —</option>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Select>
        </Field>
        <Field label="Atividade (se não for produção)">
          <TextInput name="atividade" placeholder="Ex.: Limpeza, Manutenção" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Meta (kg)">
            <TextInput name="meta_kg" type="number" step="any" min="0" placeholder={metaSugerida != null ? `sugerido: ${metaSugerida}` : '0'} />
          </Field>
          <Field label="Real (kg)">
            <TextInput name="real_kg" type="number" step="any" min="0" placeholder="0" />
          </Field>
        </div>
        {metaSugerida != null && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Meta sugerida: <span className="font-semibold">{formatarQuantidade(metaSugerida, 'kg')}</span>
            {' '}(horas {linha?.horas_disponiveis}h · {produto?.kg_por_lote} kg/lote · eficiência 80%). Deixe o campo vazio para usar a sugestão.
          </p>
        )}
        <Field label="Observação"><TextInput name="observacao" placeholder="—" /></Field>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Adicionar</Button>
        </div>
      </form>
    </Modal>
  );
}
