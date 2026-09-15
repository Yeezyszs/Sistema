// Avaliação de desempenho de fornecedor — FOR-POP 07 1.2 Ver 02.
//
// A planilha é semestral (janeiro e julho) e não sabe quem está pendente.
// Aqui a lista mostra o período vigente e destaca quem ainda não foi avaliado;
// a ficha reproduz o formulário e o histórico repete a grade por ano — só que
// coluna sem avaliação fica vazia, em vez de exibir "Aceitável" com zero.
import { useMemo, useState } from 'react';
import {
  listFornecedores, listAvaliacoesFornecedor, listNaoConformidades,
  salvarAvaliacaoFornecedor, mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { useAbaUrl } from '../../lib/useAbaUrl';
import {
  CRITERIO_AVALIACAO, CRITERIO_LABEL, CRITERIO_NOTAS,
  CLASSIFICACAO_FORNECEDOR_LABEL, CLASSIFICACAO_FORNECEDOR_TOM,
  pontuacaoAvaliacao, classificacaoAvaliacao, notaPorNumeroDeNCs,
  periodoVigente, rotuloPeriodo, intervaloDoPeriodo,
} from '@sistema/domain';
import type {
  AvaliacaoFornecedor, CriterioAvaliacao, CriteriosAvaliacao, NotaCriterio, Fornecedor,
} from '@sistema/domain';
import {
  Card, Spinner, EmptyState, Button, Field, TextInput, TextArea, Select, Modal,
} from '../../components/ui';
import { useToast } from '../../components/Toast';
import { ErroCard } from './comum';

const ANO_INICIAL = 2022;

export function AvaliacoesFornecedor() {
  const [recarregar, setRecarregar] = useState(0);
  const [periodo, setPeriodo] = useAbaUrl('periodo', periodosDisponiveis(), periodoVigente());
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Fornecedor | null>(null);
  const [historico, setHistorico] = useState<Fornecedor | null>(null);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [fornecedores, avaliacoes, ncs] = await Promise.all([
      listFornecedores(),
      listAvaliacoesFornecedor(),
      listNaoConformidades(),
    ]);
    return { fornecedores: fornecedores.filter((f) => f.ativo !== false), avaliacoes, ncs };
  }, [recarregar]);

  // Chave fornecedor+período — é assim que a ficha e a grade procuram.
  const porChave = useMemo(
    () => new Map((data?.avaliacoes ?? []).map((a) => [`${a.fornecedor_id}|${a.periodo}`, a])),
    [data],
  );

  // NCs de origem 'fornecedor' abertas dentro do semestre, por fornecedor.
  const ncsDoPeriodo = useMemo(() => {
    const [inicio, fim] = intervaloDoPeriodo(periodo);
    const conta = new Map<string, number>();
    for (const nc of data?.ncs ?? []) {
      if (nc.origem !== 'fornecedor' || !nc.fornecedor_id) continue;
      const dia = (nc.aberta_em ?? '').slice(0, 10);
      if (dia < inicio || dia > fim) continue;
      conta.set(nc.fornecedor_id, (conta.get(nc.fornecedor_id) ?? 0) + 1);
    }
    return conta;
  }, [data, periodo]);

  const visiveis = (data?.fornecedores ?? []).filter((f) =>
    f.razao_social.toLowerCase().includes(busca.trim().toLowerCase()),
  );
  const pendentes = visiveis.filter((f) => !porChave.has(`${f.id}|${periodo}`)).length;

  async function salvar(fornecedor: Fornecedor, criterios: CriteriosAvaliacao, responsavel: string, observacao: string) {
    const pontuacao = pontuacaoAvaliacao(criterios);
    await salvarAvaliacaoFornecedor({
      fornecedor_id: fornecedor.id,
      periodo,
      criterios,
      pontuacao,
      classificacao: classificacaoAvaliacao(pontuacao),
      responsavel: responsavel.trim() || null,
      observacao: observacao.trim() || null,
    });
    sucesso(`Avaliação de ${fornecedor.razao_social} registrada.`);
    setEditando(null);
    setRecarregar((n) => n + 1);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Semestre avaliado">
            <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="!w-44">
              {periodosDisponiveis().map((p) => (
                <option key={p} value={p}>{rotuloPeriodo(p)}</option>
              ))}
            </Select>
          </Field>
          <Field label="Buscar fornecedor">
            <TextInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Razão social…" />
          </Field>
          <p className="pb-2 text-xs text-slate-500">
            {pendentes === 0
              ? 'Todos os fornecedores ativos avaliados neste semestre.'
              : `${pendentes} fornecedor(es) sem avaliação neste semestre.`}
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          FOR-POP 07 1.2 Ver 02 — frequência semestral (janeiro e julho). Pontuação é a média dos
          quatro critérios; classificação sai da média na escala 1 a 3.
        </p>
      </Card>

      {error && <ErroCard mensagem={error} />}
      {loading && <div className="flex justify-center py-16"><Spinner className="h-7 w-7 text-brand-600" /></div>}
      {data && visiveis.length === 0 && <EmptyState title="Nenhum fornecedor" description="Cadastre fornecedores para avaliá-los." />}

      {data && visiveis.length > 0 && (
        <div className="space-y-2.5">
          {visiveis.map((f) => {
            const av = porChave.get(`${f.id}|${periodo}`);
            const ncs = ncsDoPeriodo.get(f.id) ?? 0;
            return (
              <Card key={f.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{f.razao_social}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {av ? (
                        <>
                          <span className={`rounded-full px-2 py-0.5 font-semibold ${CLASSIFICACAO_FORNECEDOR_TOM[av.classificacao ?? 'aceitavel']}`}>
                            {CLASSIFICACAO_FORNECEDOR_LABEL[av.classificacao ?? 'aceitavel']}
                          </span>
                          <span>Pontuação {formatarNota(av.pontuacao)}</span>
                          {av.responsavel && <span>Avaliador: {av.responsavel}</span>}
                        </>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                          Sem avaliação em {rotuloPeriodo(periodo)}
                        </span>
                      )}
                      <span>{ncs} NC(s) no semestre</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => setHistorico(f)}>Histórico</Button>
                    <Button className="px-3 py-1.5 text-xs" onClick={() => setEditando(f)}>
                      {av ? 'Editar' : 'Avaliar'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {editando && (
        <ModalAvaliacao
          fornecedor={editando}
          periodo={periodo}
          atual={porChave.get(`${editando.id}|${periodo}`) ?? null}
          ncsNoPeriodo={ncsDoPeriodo.get(editando.id) ?? 0}
          onFechar={() => setEditando(null)}
          onSalvar={(c, r, o) => salvar(editando, c, r, o).catch((e) => erro(e instanceof Error ? e.message : 'Falha ao salvar.'))}
        />
      )}

      {historico && data && (
        <ModalHistorico
          fornecedor={historico}
          avaliacoes={data.avaliacoes.filter((a) => a.fornecedor_id === historico.id)}
          onFechar={() => setHistorico(null)}
        />
      )}
    </div>
  );
}

// ── Ficha: o formulário do POP ────────────────────────────────
function ModalAvaliacao({
  fornecedor, periodo, atual, ncsNoPeriodo, onFechar, onSalvar,
}: {
  fornecedor: Fornecedor;
  periodo: string;
  atual: AvaliacaoFornecedor | null;
  ncsNoPeriodo: number;
  onFechar: () => void;
  onSalvar: (c: CriteriosAvaliacao, responsavel: string, observacao: string) => void;
}) {
  // O 4º critério chega calculado pelas NCs do semestre; o avaliador pode
  // sobrescrever, porque pode haver NC registrada fora do sistema.
  const [criterios, setCriterios] = useState<CriteriosAvaliacao>(() => atual?.criterios ?? {
    cotacao: 1, prazo_entrega: 1, atendimento: 1,
    nao_conformidades: notaPorNumeroDeNCs(ncsNoPeriodo),
  });
  const [responsavel, setResponsavel] = useState(atual?.responsavel ?? '');
  const [observacao, setObservacao] = useState(atual?.observacao ?? '');
  const [salvando, setSalvando] = useState(false);

  const pontuacao = pontuacaoAvaliacao(criterios);
  const classificacao = classificacaoAvaliacao(pontuacao);
  const sugerida = notaPorNumeroDeNCs(ncsNoPeriodo);

  return (
    <Modal open onClose={onFechar} title={`Avaliação — ${rotuloPeriodo(periodo)}`} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs text-slate-400">Fornecedor</p>
            <p className="font-semibold text-slate-900">{fornecedor.razao_social}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${CLASSIFICACAO_FORNECEDOR_TOM[classificacao]}`}>
            {CLASSIFICACAO_FORNECEDOR_LABEL[classificacao]}
          </span>
        </div>

        <Field label="Responsável pela avaliação">
          <TextInput value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome de quem avalia" />
        </Field>

        <div className="space-y-3">
          {CRITERIO_AVALIACAO.map((c) => (
            <div key={c} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{CRITERIO_LABEL[c]}</p>
                {c === 'nao_conformidades' && (
                  <p className="text-xs text-slate-500">
                    {ncsNoPeriodo} NC(s) no semestre → nota sugerida {sugerida}
                  </p>
                )}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {([1, 2, 3] as NotaCriterio[]).map((n) => (
                  <button key={n} type="button"
                    onClick={() => setCriterios((p) => ({ ...p, [c]: n } as CriteriosAvaliacao))}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      criterios[c] === n
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}>
                    <span className="block text-sm font-bold">{n}</span>
                    {CRITERIO_NOTAS[c][n]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Field label="Observação">
          <TextArea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <p className="text-sm text-slate-600">
            Pontuação <span className="text-lg font-bold text-slate-900">{formatarNota(pontuacao)}</span>
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button loading={salvando} onClick={() => { setSalvando(true); onSalvar(criterios, responsavel, observacao); }}>
              Salvar avaliação
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Histórico: a grade da planilha + a evolução ───────────────
function ModalHistorico({
  fornecedor, avaliacoes, onFechar,
}: { fornecedor: Fornecedor; avaliacoes: AvaliacaoFornecedor[]; onFechar: () => void }) {
  const porPeriodo = mapBy(avaliacoes, 'periodo');
  // A planilha carrega 2022–2027 e na prática mostra doze colunas vazias, o
  // que empurra o preenchido para fora da tela. Aqui a grade cobre só os anos
  // que têm avaliação mais o ano corrente, da esquerda para a direita.
  const anos = [...new Set([
    ...avaliacoes.map((a) => Number(a.periodo.slice(0, 4))),
    Number(periodoVigente().slice(0, 4)),
  ])].sort();
  const periodos = anos.flatMap((ano) => ['01', '07'].map((m) => `${ano}-${m}`))
    .filter((p) => p <= periodoVigente());
  const comNota = periodos.filter((p) => porPeriodo.has(p));

  return (
    <Modal open onClose={onFechar} title={`Histórico — ${fornecedor.razao_social}`} size="lg">
      {comNota.length === 0 ? (
        <EmptyState title="Sem avaliações" description="Nenhum semestre avaliado ainda." />
      ) : (
        <div className="space-y-5">
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="py-2 text-left font-medium">Critério</th>
                  {periodos.map((p) => (
                    <th key={p} className="whitespace-nowrap px-2 py-2 text-center font-medium">{rotuloPeriodo(p)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRITERIO_AVALIACAO.map((c) => (
                  <tr key={c} className="border-b border-slate-100">
                    <td className="py-2 text-slate-700">{CRITERIO_LABEL[c]}</td>
                    {periodos.map((p) => (
                      <td key={p} className="px-2 py-2 text-center text-slate-800">
                        {porPeriodo.get(p)?.criterios?.[c as CriterioAvaliacao] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-slate-100 font-semibold">
                  <td className="py-2 text-slate-700">Pontuação</td>
                  {periodos.map((p) => (
                    <td key={p} className="px-2 py-2 text-center text-slate-900">
                      {porPeriodo.has(p) ? formatarNota(porPeriodo.get(p)?.pontuacao ?? null) : ''}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 text-slate-700">Classificação</td>
                  {periodos.map((p) => {
                    const a = porPeriodo.get(p);
                    return (
                      <td key={p} className="px-2 py-2 text-center">
                        {a?.classificacao ? (
                          <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${CLASSIFICACAO_FORNECEDOR_TOM[a.classificacao]}`}>
                            {CLASSIFICACAO_FORNECEDOR_LABEL[a.classificacao]}
                          </span>
                        ) : ''}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Acompanhamento da evolução</p>
            <GraficoEvolucao pontos={comNota.map((p) => ({ periodo: p, valor: porPeriodo.get(p)?.pontuacao ?? 0 }))} />
            <p className="mt-1 text-xs text-slate-400">Escala 1 (melhor) a 3 (pior).</p>
          </div>
        </div>
      )}
    </Modal>
  );
}

// Linha simples em SVG — a escala é fixa (1 a 3), então não há eixo a calcular.
function GraficoEvolucao({ pontos }: { pontos: { periodo: string; valor: number }[] }) {
  const L = 34, R = 8, T = 8, B = 20, W = 520, H = 150;
  const x = (i: number) => pontos.length < 2 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (pontos.length - 1);
  const y = (v: number) => T + ((v - 1) / 2) * (H - T - B);
  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.valor)}`).join(' ');

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full min-w-[420px]" role="img" aria-label="Evolução da pontuação">
        {[1, 2, 3].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{v}</text>
          </g>
        ))}
        <path d={linha} fill="none" stroke="#0f766e" strokeWidth="2" />
        {pontos.map((p, i) => (
          <g key={p.periodo}>
            <circle cx={x(i)} cy={y(p.valor)} r="4" fill="#0f766e" />
            <text x={x(i)} y={H - 5} textAnchor="middle" fontSize="10" fill="#94a3b8">{rotuloPeriodo(p.periodo)}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// Do ano inicial do formulário até o semestre vigente, mais recente primeiro.
function periodosDisponiveis(): string[] {
  const vigente = periodoVigente();
  const lista: string[] = [];
  for (let ano = ANO_INICIAL; ano <= Number(vigente.slice(0, 4)); ano++) {
    for (const mes of ['01', '07']) {
      const p = `${ano}-${mes}`;
      if (p <= vigente) lista.push(p);
    }
  }
  return lista.reverse();
}

function formatarNota(n: number | null): string {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
