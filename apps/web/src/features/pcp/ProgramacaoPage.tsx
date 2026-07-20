import { useState, type FormEvent } from 'react';
import {
  listProgramacao, listLinhas, listProdutos, listApontamentos,
  criarProgramacao, atualizarProgramacao, excluirProgramacao, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, formatarQuantidade } from '../../lib/format';
import { TURNO_PROD, TURNO_PROD_LABEL, calcularMeta } from '@sistema/domain';
import type { TurnoProd, Linha, Produto, Programacao, Apontamento } from '@sistema/domain';
import { PageHeader, Card, Spinner, Button, Field, TextInput, Select, Modal } from '../../components/ui';
import { IconArrowLeft, IconChevronRight, IconX } from '../../components/icons';
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
    if (prod) return prod.nome_curto || prod.codigo || prod.nome;
  }
  return p.atividade ?? '—';
}

export function ProgramacaoPage() {
  const [refBase, setRefBase] = useState(new Date());
  const [recarregar, setRecarregar] = useState(0);
  // Célula sendo criada (data+linha+turno) ou programação sendo editada.
  const [criando, setCriando] = useState<{ data: string; linhaId: string; turno: TurnoProd } | null>(null);
  const [editando, setEditando] = useState<Programacao | null>(null);
  const [copiando, setCopiando] = useState(false);
  const { dias, de, ate } = semanaDe(refBase);
  const { sucesso, erro } = useToast();

  const { data, loading } = useAsync(async () => {
    const [prog, linhas, produtos, apont] = await Promise.all([
      listProgramacao(de, ate), listLinhas(), listProdutos(), listApontamentos(de, ate),
    ]);
    return { prog, linhas, produtos, apont, produtosMap: mapBy(produtos, 'id') };
  }, [de, ate, recarregar]);
  const rec = () => setRecarregar((n) => n + 1);

  const produtosAcabados = data?.produtos.filter((p) => p.tipo === 'produto_acabado') ?? [];

  // Real derivado dos apontamentos: card casa por data+turno+linha+produto;
  // os totais de turno/semana somam toda a produção do período (mesmo sem programação).
  const chaveReal = (data: string, turno: string, linha: string | null, produto: string | null) =>
    `${data}|${turno}|${linha ?? ''}|${produto ?? ''}`;
  const realPorChave = new Map<string, number>();
  for (const a of data?.apont ?? []) {
    const k = chaveReal(a.data, a.turno, a.linha_id, a.produto_id);
    realPorChave.set(k, (realPorChave.get(k) ?? 0) + (a.quantidade_kg ?? 0));
  }
  const realDe = (p: Programacao) => realPorChave.get(chaveReal(p.data, p.turno, p.linha_id, p.produto_id)) ?? 0;

  const totMeta = (data?.prog ?? []).reduce((s, p) => s + (p.meta_kg ?? 0), 0);
  const totReal = (data?.apont ?? []).reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);

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

  // Copia todas as programações de um dia para os dias de destino (real zerado).
  async function copiarDia(origem: string, destinos: string[]) {
    const doOrigem = (data?.prog ?? []).filter((p) => p.data === origem);
    if (doOrigem.length === 0) { erro('O dia de origem não tem programação.'); return; }
    try {
      for (const destino of destinos) {
        for (const p of doOrigem) {
          await criarProgramacao({
            data: destino,
            turno: p.turno,
            linha_id: p.linha_id,
            produto_id: p.produto_id,
            atividade: p.atividade,
            meta_kg: p.meta_kg,
            observacao: p.observacao,
          });
        }
      }
      sucesso(`Programação copiada para ${destinos.length} dia(s).`);
      setCopiando(false); rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
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
          <button onClick={() => setCopiando(true)} className="ml-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Copiar dia</button>
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
                <th className="px-3 py-3 font-medium">Linha</th>
                {dias.map((dia, i) => (
                  <th key={dia} className="px-2 py-3 text-center font-medium">
                    {DIA_LABEL[i]}<br /><span className="font-normal text-slate-300">{dia.slice(8, 10)}/{dia.slice(5, 7)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            {TURNO_PROD.map((turno) => {
              // Totais do turno na semana (meta e real de todas as células).
              const doTurno = (data.prog ?? []).filter((p) => p.turno === turno);
              const metaTurno = doTurno.reduce((s, p) => s + (p.meta_kg ?? 0), 0);
              const realTurno = (data.apont ?? []).filter((a) => a.turno === turno).reduce((s, a) => s + (a.quantidade_kg ?? 0), 0);
              return (
                <tbody key={turno} className="divide-y divide-slate-100 border-b-4 border-slate-100">
                  {/* Faixa do turno */}
                  <tr className={turno === '2t' ? 'bg-indigo-50/60' : 'bg-amber-50/60'}>
                    <td colSpan={dias.length + 1} className="px-3 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${turno === '2t' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                        {TURNO_PROD_LABEL[turno]}
                      </span>
                    </td>
                  </tr>
                  {/* Uma linha por linha de produção */}
                  {data.linhas.map((linha) => (
                    <tr key={`${turno}-${linha.id}`} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2.5 pl-6">
                        <span className="font-medium text-slate-700">{linha.codigo}</span>
                        {linha.nome && <span className="ml-1 text-xs text-slate-400">{linha.nome}</span>}
                      </td>
                      {dias.map((dia) => {
                        const itens = celula(linha.id, turno, dia);
                        return (
                          <td key={dia} className="px-1.5 py-1.5">
                            <div className="space-y-1">
                              {itens.map((p) => {
                                const real = realDe(p);
                                const at = p.meta_kg ? real / p.meta_kg : null;
                                return (
                                  <button key={p.id} onClick={() => setEditando(p)}
                                    className={`block w-full rounded-md px-2 py-1 text-left text-xs transition hover:ring-2 hover:ring-emerald-200 ${
                                      at != null && at >= 1 ? 'bg-emerald-50 text-emerald-800'
                                      : at != null && at > 0 ? 'bg-amber-50 text-amber-800'
                                      : 'bg-slate-100 text-slate-700'
                                    }`}>
                                    <span className="font-semibold">{rotuloProduto(p, data.produtosMap)}</span>
                                    <span className="block text-[11px] opacity-75">
                                      {formatarQuantidade(p.meta_kg)}{real > 0 ? ` · real ${formatarQuantidade(real)}` : ''}
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
                  ))}
                  {/* Total do turno */}
                  <tr className="bg-slate-50 font-medium">
                    <td className="px-3 py-2 pl-6 text-sm text-slate-600">Total {TURNO_PROD_LABEL[turno]}</td>
                    <td colSpan={dias.length} className="px-3 py-2 text-sm text-slate-600">
                      Meta <span className="font-semibold text-slate-800">{formatarQuantidade(metaTurno, 'kg')}</span>
                      <span className="mx-2 text-slate-300">·</span>
                      Real <span className="font-semibold text-slate-800">{formatarQuantidade(realTurno, 'kg')}</span>
                      {metaTurno > 0 && (
                        <span className={`ml-2 font-semibold ${realTurno / metaTurno >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {(realTurno / metaTurno * 100).toFixed(0)}%
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              );
            })}
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

      {copiando && (
        <ModalCopiarDia
          dias={dias}
          contarDia={(dia) => (data?.prog ?? []).filter((p) => p.data === dia).length}
          onClose={() => setCopiando(false)}
          onCopiar={copiarDia}
        />
      )}
    </>
  );
}

// Copia a programação de um dia para outros dias da semana.
function ModalCopiarDia({ dias, contarDia, onClose, onCopiar }: {
  dias: string[];
  contarDia: (dia: string) => number;
  onClose: () => void;
  onCopiar: (origem: string, destinos: string[]) => Promise<void>;
}) {
  const primeiroComProg = dias.find((d) => contarDia(d) > 0) ?? dias[0] ?? '';
  const [origem, setOrigem] = useState(primeiroComProg);
  const [destinos, setDestinos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);

  const nomeDia = (dia: string) => {
    const i = dias.indexOf(dia);
    return `${DIA_LABEL[i] ?? ''} ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
  };

  function toggle(dia: string) {
    setDestinos((arr) => (arr.includes(dia) ? arr.filter((d) => d !== dia) : [...arr, dia]));
  }

  async function confirmar() {
    if (destinos.length === 0) return;
    setSalvando(true);
    await onCopiar(origem, destinos);
    setSalvando(false);
  }

  return (
    <Modal open onClose={onClose} title="Copiar programação de um dia" size="lg">
      <div className="space-y-4">
        <Field label="Copiar do dia">
          <Select value={origem} onChange={(e) => { setOrigem(e.target.value); setDestinos((arr) => arr.filter((d) => d !== e.target.value)); }}>
            {dias.map((d) => (
              <option key={d} value={d}>{nomeDia(d)} · {contarDia(d)} item(ns)</option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-600">Para os dias:</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {dias.filter((d) => d !== origem).map((d) => (
              <label key={d} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${destinos.includes(d) ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <input type="checkbox" checked={destinos.includes(d)} onChange={() => toggle(d)} className="accent-emerald-600" />
                {nomeDia(d)}
                {contarDia(d) > 0 && <span className="ml-auto text-xs text-slate-400">{contarDia(d)}</span>}
              </label>
            ))}
          </div>
          <button type="button" onClick={() => setDestinos(dias.filter((d) => d !== origem))}
            className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700">Selecionar todos</button>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Os itens do dia de origem são <span className="font-medium">adicionados</span> aos dias marcados (o real fica zerado). Não apaga o que já existe.
        </p>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" loading={salvando} disabled={destinos.length === 0} onClick={() => void confirmar()}>
            Copiar para {destinos.length || ''} dia(s)
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Uma linha de produto no modo criação (vários produtos de uma vez).
interface ItemProduto { produtoId: string; atividade: string; meta: string }

function ModalProgramacao({
  criando, editando, linhas, produtos, onClose, onSaved, onExcluir,
}: {
  criando: { data: string; linhaId: string; turno: TurnoProd } | null;
  editando: Programacao | null;
  linhas: Linha[]; produtos: Produto[];
  onClose: () => void; onSaved: () => void; onExcluir?: () => void;
}) {
  const [data, setData] = useState(editando?.data ?? criando?.data ?? '');
  const [turno, setTurno] = useState<TurnoProd>(editando?.turno ?? criando?.turno ?? '1t');
  const [linhaId, setLinhaId] = useState(editando?.linha_id ?? criando?.linhaId ?? '');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const linha = linhas.find((l) => l.id === linhaId);

  // Modo edição: campos únicos. Modo criação: lista de produtos.
  const [prodEdit, setProdEdit] = useState(editando?.produto_id ?? '');
  const [atividadeEdit, setAtividadeEdit] = useState(editando?.atividade ?? '');
  const [metaEdit, setMetaEdit] = useState(editando?.meta_kg != null ? String(editando.meta_kg) : '');

  const [itens, setItens] = useState<ItemProduto[]>([{ produtoId: '', atividade: '', meta: '' }]);
  const [observacao, setObservacao] = useState(editando?.observacao ?? '');

  function metaSugerida(produtoId: string): number | null {
    const p = produtos.find((x) => x.id === produtoId);
    if (!linha || !p) return null;
    return calcularMeta(linha.horas_disponiveis, p.tempo_por_lote_min, p.kg_por_lote);
  }

  function mudarItem(i: number, campo: keyof ItemProduto, v: string) {
    setItens((arr) => arr.map((it, x) => (x === i ? { ...it, [campo]: v } : it)));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) { erro('Informe a data.'); return; }
    setSalvando(true);
    try {
      if (editando) {
        await atualizarProgramacao(editando.id, {
          data, turno, linha_id: linhaId || null,
          produto_id: prodEdit || null,
          atividade: atividadeEdit.trim() || null,
          meta_kg: metaEdit ? Number(metaEdit) : metaSugerida(prodEdit),
          observacao: observacao.trim() || null,
        });
        sucesso('Programação atualizada.');
      } else {
        // Cada item vira uma programação; ignora linhas totalmente vazias.
        const validos = itens.filter((it) => it.produtoId || it.atividade.trim() || it.meta);
        if (validos.length === 0) { erro('Adicione ao menos um produto ou atividade.'); setSalvando(false); return; }
        for (const it of validos) {
          await criarProgramacao({
            data, turno, linha_id: linhaId || null,
            produto_id: it.produtoId || null,
            atividade: it.atividade.trim() || null,
            meta_kg: it.meta ? Number(it.meta) : metaSugerida(it.produtoId),
            observacao: observacao.trim() || null,
          });
        }
        sucesso(validos.length > 1 ? `${validos.length} programações adicionadas.` : 'Programação adicionada.');
      }
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={editando ? 'Editar programação' : 'Nova programação'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Data"><TextInput type="date" value={data} onChange={(e) => setData(e.target.value)} required /></Field>
          <Field label="Turno">
            <Select value={turno} onChange={(e) => setTurno(e.target.value as TurnoProd)}>
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

        {editando ? (
          <>
            <ProdutoPicker produtos={produtos} value={prodEdit} onChange={setProdEdit} />
            <Field label="Atividade (se não for produção)">
              <TextInput value={atividadeEdit} onChange={(e) => setAtividadeEdit(e.target.value)} placeholder="Ex.: Limpeza, Manutenção" />
            </Field>
            <Field label="Meta (kg)">
              <TextInput type="number" step="any" min="0" value={metaEdit} onChange={(e) => setMetaEdit(e.target.value)}
                placeholder={metaSugerida(prodEdit) != null ? `sugerido: ${metaSugerida(prodEdit)}` : '0'} />
            </Field>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Produtos / atividades</p>
            {itens.map((it, i) => {
              const sug = metaSugerida(it.produtoId);
              return (
                <div key={i} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <ProdutoPicker produtos={produtos} value={it.produtoId} onChange={(v) => mudarItem(i, 'produtoId', v)} />
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Atividade (opcional)">
                          <TextInput value={it.atividade} onChange={(e) => mudarItem(i, 'atividade', e.target.value)} placeholder="Limpeza…" />
                        </Field>
                        <Field label="Meta (kg)">
                          <TextInput type="number" step="any" min="0" value={it.meta} onChange={(e) => mudarItem(i, 'meta', e.target.value)}
                            placeholder={sug != null ? `sugerido: ${sug}` : '0'} />
                        </Field>
                      </div>
                    </div>
                    {itens.length > 1 && (
                      <button type="button" onClick={() => setItens((arr) => arr.filter((_, x) => x !== i))}
                        className="mt-6 shrink-0 text-slate-300 hover:text-red-600" aria-label="Remover produto">
                        <IconX width={16} height={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => setItens((arr) => [...arr, { produtoId: '', atividade: '', meta: '' }])}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700">
              + Adicionar produto
            </button>
          </div>
        )}

        <Field label="Observação"><TextInput value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="—" /></Field>
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
