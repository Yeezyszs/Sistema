// A grade da semana — a tela que substitui a planilha do comprador.
//
// Produtor na linha, dia na coluna, cargas na célula. A diferença para a
// planilha é que a célula mostra **chegou / previsto** e se pinta sozinha:
// ninguém colore à mão, e a semana anterior não se apaga.
//
// A previsão é em CARGAS porque é assim que ele negocia. O peso real vive nas
// chegadas, em quilos — a tonelagem varia por produtor, então não existe
// conversão entre os dois, e forçar uma só criaria número errado.
import { useState, type FormEvent } from 'react';
import {
  listProdutores, listPrevisaoDaSemana, listDiasDaPrevisao, listRecebimentosPeriodo,
  listParametrosSemana, criarLinhaPrevisao, atualizarLinhaPrevisao, excluirLinhaPrevisao,
  definirCargasDoDia, salvarParametrosSemana,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../lib/format';
import {
  FORMA_PAGAMENTO, FORMA_PAGAMENTO_LABEL, VARIEDADES_MANDIOCA, rendaMaxima,
} from '@sistema/domain';
import type { Fornecedor, FormaPagamento, PrevisaoSemana } from '@sistema/domain';
import {
  PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, Select, Modal,
  ErroCarregamento, LINHA_CABECALHO,
} from '../../components/ui';
import { IconPlus } from '../../components/icons';
import { useToast } from '../../components/Toast';

const DIAS_ROTULO = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Segunda-feira da semana que contém a data. */
function segundaDe(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(a!, m! - 1, d!);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return isoLocal(dt);
}

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function somarDias(iso: string, n: number): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const dt = new Date(a!, m! - 1, d!);
  dt.setDate(dt.getDate() + n);
  return isoLocal(dt);
}

export function SemanaPage() {
  const [semana, setSemana] = useState(() => segundaDe(hojeLocalISO()));
  const [recarregar, setRecarregar] = useState(0);
  const [adicionando, setAdicionando] = useState(false);
  const [editandoLinha, setEditandoLinha] = useState<PrevisaoSemana | null>(null);
  const [editandoParam, setEditandoParam] = useState(false);
  const { sucesso, erro } = useToast();

  const dias = Array.from({ length: 6 }, (_, i) => somarDias(semana, i));
  const hoje = hojeLocalISO();

  const { data, loading, error } = useAsync(async () => {
    const [produtores, linhas, parametros] = await Promise.all([
      listProdutores(), listPrevisaoDaSemana(semana), listParametrosSemana(),
    ]);
    const [diasPrev, cargas] = await Promise.all([
      listDiasDaPrevisao(linhas.map((l) => l.id)),
      listRecebimentosPeriodo(semana, somarDias(semana, 5)),
    ]);
    return { produtores, linhas, diasPrev, cargas, parametros };
  }, [semana, recarregar]);

  const rec = () => setRecarregar((n) => n + 1);

  if (error) {
    return (
      <>
        <PageHeader grupo="Suprimentos" title="Previsão da semana" />
        <ErroCarregamento mensagem={error} />
      </>
    );
  }
  if (loading || !data) {
    return (
      <>
        <PageHeader grupo="Suprimentos" title="Previsão da semana" />
        <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>
      </>
    );
  }

  const produtorPorId = new Map(data.produtores.map((p) => [p.id, p]));
  const param = data.parametros.find((p) => p.semana_inicio === semana) ?? null;
  const limiteRenda = param ? rendaMaxima(param.preco_renda, param.preco_farinha, param.teto_pct) : null;

  // Previsto por (linha, dia).
  const previsto = new Map<string, number>();
  for (const d of data.diasPrev) previsto.set(`${d.previsao_id}|${d.data}`, d.cargas);

  // Chegou por (fornecedor, dia). O vínculo com a linha da previsão é o ideal,
  // mas a carga pode chegar sem previsão — então caímos para fornecedor + data.
  const chegou = new Map<string, number>();
  for (const c of data.cargas) {
    if (!c.fornecedor_id) continue;
    const k = `${c.fornecedor_id}|${c.recebido_em.slice(0, 10)}`;
    chegou.set(k, (chegou.get(k) ?? 0) + 1);
  }

  const linhas = [...data.linhas].sort((a, b) =>
    (produtorPorId.get(a.fornecedor_id)?.razao_social ?? '')
      .localeCompare(produtorPorId.get(b.fornecedor_id)?.razao_social ?? ''),
  );

  const totalPrevisto = (dia: string) =>
    linhas.reduce((s, l) => s + (previsto.get(`${l.id}|${dia}`) ?? 0), 0);
  const totalChegou = (dia: string) =>
    linhas.reduce((s, l) => s + (chegou.get(`${l.fornecedor_id}|${dia}`) ?? 0), 0);

  const semanaPrevista = dias.reduce((s, d) => s + totalPrevisto(d), 0);
  const semanaChegou = dias.reduce((s, d) => s + totalChegou(d), 0);
  // Aderência conta só os dias que já passaram: cobrar o que ainda não venceu
  // faria todo mundo parecer atrasado na segunda-feira.
  const diasVencidos = dias.filter((d) => d <= hoje);
  const previstoAteHoje = diasVencidos.reduce((s, d) => s + totalPrevisto(d), 0);
  const chegouAteHoje = diasVencidos.reduce((s, d) => s + totalChegou(d), 0);
  const aderencia = previstoAteHoje > 0 ? Math.round((chegouAteHoje / previstoAteHoje) * 100) : null;

  async function mudarCargas(linhaId: string, dia: string, valor: string) {
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0) return;
    try { await definirCargasDoDia(linhaId, dia, Math.trunc(n)); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function alternarConfirmado(l: PrevisaoSemana) {
    try { await atualizarLinhaPrevisao(l.id, { confirmado: !l.confirmado }); rec(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function removerLinha(l: PrevisaoSemana) {
    try {
      await excluirLinhaPrevisao(l.id);
      sucesso('Produtor removido da semana.');
      rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  const naSemana = new Set(linhas.map((l) => l.fornecedor_id));
  const disponiveis = data.produtores.filter((p) => p.ativo && !naSemana.has(p.id));

  return (
    <>
      <PageHeader
        grupo="Suprimentos"
        title="Previsão da semana"
        subtitle="Cargas combinadas por produtor e por dia — a célula mostra o que chegou"
        action={
          <Button onClick={() => setAdicionando(true)} disabled={disponiveis.length === 0}>
            <IconPlus width={16} height={16} />Adicionar produtor
          </Button>
        }
      />

      {/* Semana e parâmetros */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setSemana(somarDias(semana, -7))}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-50"
            aria-label="Semana anterior">←</button>
          <span className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[13px] font-semibold tabular-nums text-slate-800">
            {formatarData(semana)} a {formatarData(somarDias(semana, 5))}
          </span>
          <button onClick={() => setSemana(somarDias(semana, 7))}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-50"
            aria-label="Próxima semana">→</button>
          {semana !== segundaDe(hoje) && (
            <button onClick={() => setSemana(segundaDe(hoje))}
              className="ml-1 text-xs font-semibold text-brand-700 hover:underline">Semana atual</button>
          )}
        </div>

        <button onClick={() => setEditandoParam(true)}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[12.5px] text-slate-700 hover:bg-slate-50">
          {param ? (
            <>
              Renda <strong className="font-semibold tabular-nums">R$ {param.preco_renda.toFixed(2)}</strong>
              {' · '}Farinha <strong className="font-semibold tabular-nums">R$ {param.preco_farinha.toFixed(0)}</strong>
              {limiteRenda != null && (
                <>
                  {' · '}máx <strong className="font-semibold tabular-nums text-brand-700">{limiteRenda.toFixed(0)} g</strong>
                </>
              )}
            </>
          ) : (
            <span className="font-semibold text-amber-700">Definir preço da semana</span>
          )}
        </button>
      </div>

      {linhas.length === 0 ? (
        <EmptyState
          title="Semana sem previsão"
          description={disponiveis.length > 0
            ? 'Adicione os produtores que combinaram carga para esta semana.'
            : 'Nenhum produtor na lista de trabalho. Cadastre ou traga alguém de "só contato".'} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={LINHA_CABECALHO}>
                <th className="px-4 py-[11px]">Produtor</th>
                <th className="hidden px-3 py-[11px] lg:table-cell">Variedade</th>
                {dias.map((d, i) => (
                  <th key={d} className={`px-2 py-[11px] text-center ${d === hoje ? 'text-brand-700' : ''}`}>
                    {DIAS_ROTULO[i]}
                    <span className="block text-[10px] font-medium tabular-nums opacity-70">
                      {d.slice(8, 10)}/{d.slice(5, 7)}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-[11px] text-center">Total</th>
                <th className="px-3 py-[11px]" />
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const p = produtorPorId.get(l.fornecedor_id);
                const prevTotal = dias.reduce((s, d) => s + (previsto.get(`${l.id}|${d}`) ?? 0), 0);
                const chegTotal = dias.reduce((s, d) => s + (chegou.get(`${l.fornecedor_id}|${d}`) ?? 0), 0);
                return (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2">
                      <span className="font-semibold text-slate-900">{p?.razao_social ?? '—'}</span>
                      <span className="block text-[11px] text-slate-400">
                        {[p?.cidade, l.pagamento ? FORMA_PAGAMENTO_LABEL[l.pagamento] : null]
                          .filter(Boolean).join(' · ') || '—'}
                      </span>
                      <button onClick={() => void alternarConfirmado(l)}
                        className={`mt-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold transition ${
                          l.confirmado
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}>
                        {l.confirmado ? 'Confirmado' : 'A confirmar'}
                      </button>
                    </td>
                    <td className="hidden px-3 py-2 text-slate-600 lg:table-cell">{l.variedade ?? '—'}</td>
                    {dias.map((d) => (
                      <td key={d} className="px-1 py-2 text-center">
                        <Celula
                          previsto={previsto.get(`${l.id}|${d}`) ?? 0}
                          chegou={chegou.get(`${l.fornecedor_id}|${d}`) ?? 0}
                          passou={d <= hoje}
                          onChange={(v) => void mudarCargas(l.id, d, v)}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center tabular-nums">
                      <span className="font-semibold text-slate-900">{chegTotal}</span>
                      <span className="text-slate-400"> / {prevTotal}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button onClick={() => setEditandoLinha(l)}
                        className="mr-3 text-xs font-medium text-slate-500 hover:text-brand-600">Editar</button>
                      <button onClick={() => void removerLinha(l)}
                        className="text-xs font-medium text-slate-400 hover:text-red-600">Remover</button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-2.5 text-slate-800">Total</td>
                <td className="hidden lg:table-cell" />
                {dias.map((d) => (
                  <td key={d} className="px-1 py-2.5 text-center tabular-nums">
                    <span className="text-slate-900">{d <= hoje ? totalChegou(d) : '—'}</span>
                    <span className="text-slate-400"> / {totalPrevisto(d)}</span>
                  </td>
                ))}
                <td className="px-3 py-2.5 text-center tabular-nums">
                  <span className="text-slate-900">{semanaChegou}</span>
                  <span className="text-slate-400"> / {semanaPrevista}</span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  {aderencia != null && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      aderencia >= 90 ? 'bg-emerald-100 text-emerald-700'
                        : aderencia >= 70 ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {aderencia}%
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}

      {linhas.length > 0 && (
        <p className="mt-3 rounded-[10px] border border-dashed border-slate-300 bg-white px-4 py-3 text-xs leading-relaxed text-slate-600">
          A célula traz <strong className="font-semibold text-slate-800">chegou / previsto</strong> e o
          número editável é o previsto. Verde completou, amarelo veio parcial, vermelho não veio, cinza
          é dia que ainda não chegou. A aderência de {aderencia ?? 0}% conta só os dias já vencidos.
        </p>
      )}

      {adicionando && (
        <ModalAdicionar
          semana={semana}
          produtores={disponiveis}
          onClose={() => setAdicionando(false)}
          onSaved={rec}
        />
      )}

      {editandoLinha && (
        <ModalLinha
          linha={editandoLinha}
          nome={produtorPorId.get(editandoLinha.fornecedor_id)?.razao_social ?? ''}
          onClose={() => setEditandoLinha(null)}
          onSaved={rec}
        />
      )}

      {editandoParam && (
        <ModalParametros
          semana={semana}
          atual={param}
          anterior={data.parametros.find((p) => p.semana_inicio < semana) ?? null}
          onClose={() => setEditandoParam(false)}
          onSaved={rec}
        />
      )}
    </>
  );
}

// ── Célula da grade ────────────────────────────────────────────
// O campo edita o previsto; o "chegou" fica ao lado, só leitura. Assim a
// mesma célula serve para planejar e para acompanhar, como na planilha.
function Celula({ previsto, chegou, passou, onChange }: {
  previsto: number; chegou: number; passou: boolean; onChange: (v: string) => void;
}) {
  const tom = !passou || previsto === 0 ? 'border-slate-200 bg-white'
    : chegou >= previsto ? 'border-emerald-300 bg-emerald-50'
    : chegou > 0 ? 'border-amber-300 bg-amber-50'
    : 'border-red-300 bg-red-50';

  return (
    <span className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 ${tom}`}>
      <input
        type="number" min="0" max="99"
        value={previsto === 0 ? '' : previsto}
        onChange={(e) => onChange(e.target.value || '0')}
        placeholder="—"
        aria-label="Cargas previstas"
        className="w-9 border-0 bg-transparent p-0 text-center text-[13px] font-semibold tabular-nums text-slate-900 outline-none [appearance:textfield] placeholder:font-normal placeholder:text-slate-300 focus:ring-0 [&::-webkit-inner-spin-button]:appearance-none"
      />
      {passou && previsto > 0 && (
        <span className="text-[11px] font-semibold tabular-nums text-slate-500">{chegou}</span>
      )}
    </span>
  );
}

// ── Adicionar produtor à semana ────────────────────────────────
function ModalAdicionar({ semana, produtores, onClose, onSaved }: {
  semana: string; produtores: Fornecedor[]; onClose: () => void; onSaved: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const fornecedor_id = String(f.get('fornecedor_id') ?? '');
    if (!fornecedor_id) return;
    const escolhido = produtores.find((p) => p.id === fornecedor_id);
    setSalvando(true);
    try {
      await criarLinhaPrevisao({
        semana_inicio: semana,
        fornecedor_id,
        variedade: String(f.get('variedade') ?? '').trim() || null,
        // Herda o padrão do cadastro; a linha da semana pode divergir.
        pagamento: (String(f.get('pagamento') ?? '') as FormaPagamento) || escolhido?.pagamento_padrao || null,
      });
      sucesso('Produtor adicionado à semana.');
      onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title="Adicionar produtor à semana">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Produtor">
          <Select name="fornecedor_id" defaultValue="" required autoFocus>
            <option value="" disabled>Selecione…</option>
            {produtores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.razao_social}{p.cidade ? ` — ${p.cidade}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Variedade">
          <Select name="variedade" defaultValue="">
            <option value="">—</option>
            {VARIEDADES_MANDIOCA.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Forma de pagamento">
          <Select name="pagamento" defaultValue="">
            <option value="">Usar o padrão do cadastro</option>
            {FORMA_PAGAMENTO.map((p) => (
              <option key={p} value={p}>{FORMA_PAGAMENTO_LABEL[p]}</option>
            ))}
          </Select>
        </Field>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Só aparecem aqui os produtores da lista de trabalho que ainda não estão nesta semana.
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Adicionar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Editar a linha da semana ───────────────────────────────────
function ModalLinha({ linha, nome, onClose, onSaved }: {
  linha: PrevisaoSemana; nome: string; onClose: () => void; onSaved: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSalvando(true);
    try {
      await atualizarLinhaPrevisao(linha.id, {
        variedade: String(f.get('variedade') ?? '').trim() || null,
        pagamento: (String(f.get('pagamento') ?? '') as FormaPagamento) || null,
        observacao: String(f.get('observacao') ?? '').trim() || null,
      });
      sucesso('Linha atualizada.');
      onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={nome}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Variedade">
          <Select name="variedade" defaultValue={linha.variedade ?? ''}>
            <option value="">—</option>
            {[...new Set([...VARIEDADES_MANDIOCA, ...(linha.variedade ? [linha.variedade] : [])])].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </Select>
        </Field>
        <Field label="Forma de pagamento">
          <Select name="pagamento" defaultValue={linha.pagamento ?? ''}>
            <option value="">—</option>
            {FORMA_PAGAMENTO.map((p) => (
              <option key={p} value={p}>{FORMA_PAGAMENTO_LABEL[p]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Observação">
          <TextInput name="observacao" defaultValue={linha.observacao ?? ''}
            placeholder="Combinado da semana, restrição…" />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Preço da semana ────────────────────────────────────────────
function ModalParametros({ semana, atual, anterior, onClose, onSaved }: {
  semana: string;
  atual: { preco_renda: number; preco_farinha: number; teto_pct: number } | null;
  anterior: { preco_renda: number; preco_farinha: number; teto_pct: number } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const base = atual ?? anterior;
  const [precoRenda, setPrecoRenda] = useState(String(base?.preco_renda ?? '0.85'));
  const [precoFarinha, setPrecoFarinha] = useState(String(base?.preco_farinha ?? '3020'));
  const [teto, setTeto] = useState(String(base?.teto_pct ?? '58'));
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const limite = rendaMaxima(Number(precoRenda), Number(precoFarinha), Number(teto));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    try {
      await salvarParametrosSemana({
        semana_inicio: semana,
        preco_renda: Number(precoRenda),
        preco_farinha: Number(precoFarinha),
        teto_pct: Number(teto),
      });
      sucesso('Preço da semana salvo.');
      onSaved(); onClose();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Preço da semana de ${formatarData(semana)}`}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Preço da renda">
            <TextInput type="number" step="0.01" min="0.01" value={precoRenda}
              onChange={(e) => setPrecoRenda(e.target.value)} required autoFocus />
          </Field>
          <Field label="Preço da farinha">
            <TextInput type="number" step="1" min="1" value={precoFarinha}
              onChange={(e) => setPrecoFarinha(e.target.value)} required />
          </Field>
          <Field label="Teto (%)">
            <TextInput type="number" step="1" min="1" max="100" value={teto}
              onChange={(e) => setTeto(e.target.value)} required />
          </Field>
        </div>

        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            Renda máxima a este preço
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-800">
            {limite != null ? `${limite.toFixed(0)} g` : 'sem limite'}
          </p>
          <p className="mt-1 text-xs text-brand-900/70">
            {limite != null
              ? 'Acima disso a raiz estoura o teto de custo da farinha.'
              : 'A este preço da renda o custo nunca alcança o teto.'}
          </p>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">
          O preço da renda é em reais por grama de renda, por tonelada de raiz. Cada carga lançada
          guarda o preço do seu dia — mudar aqui não reescreve o custo das cargas já registradas.
          {anterior && !atual && (
            <> Os valores vieram da última semana cadastrada.</>
          )}
        </p>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}
