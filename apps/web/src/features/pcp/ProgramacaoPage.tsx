import { useState, type FormEvent } from 'react';
import {
  listProgramacao, listLinhas, listProdutos,
  criarProgramacao, atualizarProgramacao, excluirProgramacao, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { TURNO_PROD, TURNO_PROD_LABEL, calcularMeta } from '@sistema/domain';
import type { TurnoProd, Linha, Produto, Programacao } from '@sistema/domain';
import { PageHeader, Card, Spinner, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconArrowLeft, IconChevronRight } from '../../components/icons';
import { useToast } from '../../components/Toast';
import { ProdutoPicker } from '../../components/ProdutoPicker';

// Semana (segunda a sábado) que contém a data.
function semanaDe(base: Date): { dias: string[]; de: string; ate: string } {
  const d = new Date(base);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  const seg = new Date(d); seg.setDate(d.getDate() - dow);
  const dias: string[] = [];
  for (let i = 0; i < 6; i++) { // segunda a sábado
    const x = new Date(seg); x.setDate(seg.getDate() + i);
    dias.push(x.toISOString().slice(0, 10));
  }
  const de = dias[0] ?? '';
  const ate = dias[dias.length - 1] ?? '';
  return { dias, de, ate };
}

const DIA_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Rótulo curto do produto na grade (código quando houver).
function rotuloProduto(p: Programacao, produtosMap: Map<string, Produto>): string {
  if (p.produto_id) {
    const prod = produtosMap.get(p.produto_id);
    if (prod) return prod.codigo || prod.nome;
  }
  return p.atividade ?? '—';
}

export function ProgramacaoPage() {
  const [refBase, setRefBase] = useState(new Date());
  const [recarregar, setRecarregar] = useState(0);
  // Célula sendo criada (data+linha+turno) ou programação sendo editada.
  const [criando, setCriando] = useState<{ data: string; linhaId: string; turno: TurnoProd } | null>(null);
  const [editando, setEditando] = useState<Programacao | null>(null);
  const { dias, de, ate } = semanaDe(refBase);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [prog, linhas, produtos] = await Promise.all([
      listProgramacao(de, ate), listLinhas(), listProdutos(),
    ]);
    return { prog, linhas, produtos, produtosMap: mapBy(produtos, 'id') };
  }, [de, ate, recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const produtosAcabados = data?.produtos.filter((p) => p.tipo === 'produto_acabado') ?? [];

  const totMeta = (data?.prog ?? []).reduce((s, p) => s + (p.meta_kg ?? 0), 0);
  const totReal = (data?.prog ?? []).reduce((s, p) => s + (p.real_kg ?? 0), 0);

  function mudarSemana(delta: number) {
    const d = new Date(refBase); d.setDate(d.getDate() + delta * 7); setRefBase(d);
  }

  function celula(linhaId: string, turno: TurnoProd, dia: string): Programacao[] {
    return (data?.prog ?? []).filter((p) => p.linha_id === linhaId && p.turno === turno && p.data === dia);
  }

  async function excluir(id: string) {
    try { await excluirProgramacao(id); sucesso('Programação removida.'); setEditando(null); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  return (
    <>
      <PageHeader title="Programação de Produção" subtitle="Quadro semanal — segunda a sábado, linhas × turnos (PCP)" />

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

      {data && (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3 font-medium">Linha / turno</th>
                {dias.map((dia, i) => (
                  <th key={dia} className="px-2 py-3 text-center font-medium">
                    {DIA_LABEL[i]}<br /><span className="font-normal text-slate-300">{dia.slice(8, 10)}/{dia.slice(5, 7)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.linhas.flatMap((linha) =>
                TURNO_PROD.map((turno) => (
                  <tr key={`${linha.id}-${turno}`} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="font-medium text-slate-700">{linha.codigo}</span>
                      <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${turno === '2t' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {TURNO_PROD_LABEL[turno]}
                      </span>
                    </td>
                    {dias.map((dia) => {
                      const itens = celula(linha.id, turno, dia);
                      return (
                        <td key={dia} className="px-1.5 py-1.5">
                          <div className="space-y-1">
                            {itens.map((p) => {
                              const at = p.meta_kg ? (p.real_kg ?? 0) / p.meta_kg : null;
                              return (
                                <button key={p.id} onClick={() => setEditando(p)}
                                  className={`block w-full rounded-md px-2 py-1 text-left text-xs transition hover:ring-2 hover:ring-emerald-200 ${
                                    at != null && at >= 1 ? 'bg-emerald-50 text-emerald-800'
                                    : at != null && at > 0 ? 'bg-amber-50 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                  }`}>
                                  <span className="font-semibold">{rotuloProduto(p, data.produtosMap)}</span>
                                  <span className="block text-[11px] opacity-75">
                                    {formatarQuantidade(p.meta_kg)}{p.real_kg != null ? ` · real ${formatarQuantidade(p.real_kg)}` : ''}
                                  </span>
                                </button>
                              );
                            })}
                            <button
                              onClick={() => setCriando({ data: dia, linhaId: linha.id, turno })}
                              className="block w-full rounded-md border border-dashed border-slate-200 px-2 py-0.5 text-center text-xs text-slate-300 transition hover:border-emerald-300 hover:text-emerald-500">
                              +
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </Card>
      )}

      {(criando || editando) && (
        <ModalProgramacao
          criando={criando}
          editando={editando}
          linhas={data?.linhas ?? []}
          produtos={produtosAcabados}
          onClose={() => { setCriando(null); setEditando(null); }}
          onSaved={() => { setCriando(null); setEditando(null); rec(); }}
          onExcluir={editando ? () => void excluir(editando.id) : undefined}
        />
      )}
    </>
  );
}

function ModalProgramacao({
  criando, editando, linhas, produtos, onClose, onSaved, onExcluir,
}: {
  criando: { data: string; linhaId: string; turno: TurnoProd } | null;
  editando: Programacao | null;
  linhas: Linha[]; produtos: Produto[];
  onClose: () => void; onSaved: () => void; onExcluir?: () => void;
}) {
  const [linhaId, setLinhaId] = useState(editando?.linha_id ?? criando?.linhaId ?? '');
  const [produtoId, setProdutoId] = useState(editando?.produto_id ?? '');
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
    const payload = {
      data: String(f.get('data') ?? ''),
      turno: String(f.get('turno') ?? '1t') as TurnoProd,
      linha_id: linhaId || null,
      produto_id: produtoId || null,
      atividade: String(f.get('atividade') ?? '').trim() || null,
      meta_kg: num('meta_kg') ?? metaSugerida,
      observacao: String(f.get('observacao') ?? '').trim() || null,
    };
    setSalvando(true);
    try {
      if (editando) await atualizarProgramacao(editando.id, payload);
      else await criarProgramacao(payload);
      sucesso(editando ? 'Programação atualizada.' : 'Programação adicionada.');
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={editando ? 'Editar programação' : 'Nova programação'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Data"><TextInput name="data" type="date" defaultValue={editando?.data ?? criando?.data ?? ''} required /></Field>
          <Field label="Turno">
            <Select name="turno" defaultValue={editando?.turno ?? criando?.turno ?? '1t'}>
              {TURNO_PROD.map((t) => <option key={t} value={t}>{TURNO_PROD_LABEL[t]}</option>)}
            </Select>
          </Field>
          <Field label="Linha">
            <Select value={linhaId} onChange={(e) => setLinhaId(e.target.value)}>
              <option value="">—</option>
              {linhas.map((l) => <option key={l.id} value={l.id}>{l.codigo}{l.nome ? ` (${l.nome})` : ''}</option>)}
            </Select>
          </Field>
        </div>
        <ProdutoPicker produtos={produtos} value={produtoId} onChange={setProdutoId} />
        <Field label="Atividade (se não for produção)">
          <TextInput name="atividade" defaultValue={editando?.atividade ?? ''} placeholder="Ex.: Limpeza, Manutenção" />
        </Field>
        <Field label="Meta (kg)">
          <TextInput name="meta_kg" type="number" step="any" min="0" defaultValue={editando?.meta_kg ?? ''} placeholder={metaSugerida != null ? `sugerido: ${metaSugerida}` : '0'} />
        </Field>
        {metaSugerida != null && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Meta sugerida: <span className="font-semibold">{formatarQuantidade(metaSugerida, 'kg')}</span>
            {' '}({linha?.horas_disponiveis}h · {produto?.kg_por_lote} kg/lote · eficiência 80%). Deixe vazio para usar a sugestão.
          </p>
        )}
        <Field label="Observação"><TextInput name="observacao" defaultValue={editando?.observacao ?? ''} placeholder="—" /></Field>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          {onExcluir ? (
            <button type="button" onClick={onExcluir} className="text-sm font-medium text-red-500 hover:text-red-600">Excluir</button>
          ) : <span />}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={salvando}>{editando ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
