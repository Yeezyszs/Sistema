import { useState, type FormEvent } from 'react';
import {
  listLotesPendentesLiberacao,
  listPontosControle,
  listLotes,
  listProdutos,
  getMonitoramentosDoLote,
  criarMonitoramento,
  liberarLoteGate,
  atualizarStatusLote,

} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarHora } from '../../lib/format';
import { TIPO_PCC_LABEL, limiteLabel, valorConforme } from '@sistema/domain';
import type { PontoControle } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, Select, TextInput, TextArea } from '../../components/ui';
import { StatusChip } from '../../components/StatusChip';
import { IconShield, IconFlask } from '../../components/icons';
import { useToast } from '../../components/Toast';

export function QualidadePage() {
  const [recarregar, setRecarregar] = useState(0);
  const { sucesso, erro } = useToast();

  const { data, loading, error } = useAsync(async () => {
    const [pendentes, pontosControle, lotes, produtos] = await Promise.all([
      listLotesPendentesLiberacao(),
      listPontosControle(),
      listLotes(),
      listProdutos(),
    ]);
    return {
      pendentes,
      pontosControle,
      lotes,
      produtos: mapBy(produtos, 'id'),
      lotesMap: mapBy(lotes, 'id'),
    };
  }, [recarregar]);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7 text-emerald-600" />
      </div>
    );

  if (error) return <Card className="p-4 text-sm text-red-600">Erro: {error}</Card>;

  return (
    <>
      <PageHeader
        title="Qualidade"
        subtitle="Monitoramentos FSSC 22000 e liberação de lotes"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulário de monitoramento */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Registrar monitoramento
          </h2>
          <MonitoramentoForm
            lotes={data?.lotes ?? []}
            pontosControle={data?.pontosControle ?? []}
            produtos={data?.produtos ?? new Map()}
            onSaved={() => setRecarregar((n) => n + 1)}
          />
        </Card>

        {/* Lotes pendentes de liberação */}
        <div className="lg:col-span-3 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Pendentes de liberação
          </h2>

          {(data?.pendentes ?? []).length === 0 && (
            <EmptyState
              icon={<IconShield width={36} height={36} />}
              title="Nenhum lote aguardando"
              description="Lotes enviados para liberação aparecerão aqui."
            />
          )}

          {(data?.pendentes ?? []).map((lote) => (
            <LotePendente
              key={lote.id}
              loteId={lote.id}
              codigo={lote.codigo}
              produto={data?.produtos.get(lote.produto_id)?.nome ?? '—'}
              pontosControle={data?.pontosControle ?? []}
              onDecisao={() => setRecarregar((n) => n + 1)}
            />
          ))}
        </div>
      </div>

      {/* Catálogo de pontos de controle */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <IconFlask width={18} height={18} className="text-slate-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Pontos de controle (FSSC 22000)
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Código</th>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">Tipo</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">Parâmetro</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">Limite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.pontosControle ?? []).map((pc) => (
              <tr key={pc.codigo} className="hover:bg-slate-50">
                <td className="px-5 py-3 font-mono text-xs text-slate-500">{pc.codigo}</td>
                <td className="px-5 py-3 font-medium text-slate-800">{pc.nome}</td>
                <td className="hidden px-5 py-3 sm:table-cell">
                  <TipoBadge tipo={pc.tipo} />
                </td>
                <td className="hidden px-5 py-3 text-slate-500 md:table-cell">
                  {pc.parametro ?? '—'}
                </td>
                <td className="hidden px-5 py-3 text-slate-500 md:table-cell">
                  {limiteLabel(pc)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

// ── Formulário de monitoramento ────────────────────────────────
function MonitoramentoForm({
  lotes,
  pontosControle,
  produtos,
  onSaved,
}: {
  lotes: { id: string; codigo: string; produto_id: string }[];
  pontosControle: PontoControle[];
  produtos: Map<string, { nome: string }>;
  onSaved: () => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [pcSelecionado, setPcSelecionado] = useState<PontoControle | null>(null);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const lote_id = String(form.get('lote_id') ?? '');
    const ponto_controle_codigo = String(form.get('ponto_controle_codigo') ?? '');
    const valorStr = String(form.get('valor') ?? '').trim();
    const valor = valorStr ? Number(valorStr) : null;
    const observacao = String(form.get('observacao') ?? '').trim() || null;
    const conformeStr = String(form.get('conforme') ?? '');

    if (!lote_id || !ponto_controle_codigo || !conformeStr) return;

    const conforme = conformeStr === 'sim';

    setSalvando(true);
    try {
      await criarMonitoramento({ lote_id, ponto_controle_codigo, valor, conforme, observacao });
      sucesso('Monitoramento registrado.');
      (e.target as HTMLFormElement).reset();
      setPcSelecionado(null);
      onSaved();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao registrar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Lote">
        <Select name="lote_id" defaultValue="" required>
          <option value="" disabled>Selecione…</option>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.codigo} — {produtos.get(l.produto_id)?.nome ?? ''}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ponto de controle">
        <Select
          name="ponto_controle_codigo"
          defaultValue=""
          required
          onChange={(e) =>
            setPcSelecionado(pontosControle.find((p) => p.codigo === e.target.value) ?? null)
          }
        >
          <option value="" disabled>Selecione…</option>
          {pontosControle.map((pc) => (
            <option key={pc.codigo} value={pc.codigo}>
              {pc.codigo} — {pc.nome}
            </option>
          ))}
        </Select>
      </Field>

      {pcSelecionado?.parametro && (
        <Field label={`${pcSelecionado.parametro}${pcSelecionado.unidade ? ` (${pcSelecionado.unidade})` : ''}`}>
          <TextInput name="valor" type="number" step="any" placeholder={limiteLabel(pcSelecionado)} />
        </Field>
      )}

      <Field label="Conforme?">
        <Select name="conforme" defaultValue="" required>
          <option value="" disabled>Selecione…</option>
          <option value="sim">Sim — dentro do limite</option>
          <option value="nao">Não — desvio identificado</option>
        </Select>
      </Field>

      {pcSelecionado?.acao_corretiva && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span className="font-semibold">Ação corretiva:</span> {pcSelecionado.acao_corretiva}
        </p>
      )}

      <Field label="Observação">
        <TextArea name="observacao" placeholder="Observações adicionais…" rows={2} />
      </Field>

      <Button type="submit" loading={salvando} className="w-full">
        Registrar
      </Button>
    </form>
  );
}

// ── Lote pendente de liberação ─────────────────────────────────
function LotePendente({
  loteId,
  codigo,
  produto,
  pontosControle,
  onDecisao,
}: {
  loteId: string;
  codigo: string;
  produto: string;
  pontosControle: PontoControle[];
  onDecisao: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [agindo, setAgindo] = useState(false);
  const { sucesso, erro } = useToast();

  const { data: mons } = useAsync(
    async () => {
      if (!expandido) return null;
      const { getMonitoramentosDoLote } = await import('../../lib/db');
      return getMonitoramentosDoLote(loteId);
    },
    [loteId, expandido],
  );

  const pcMap = mapBy(pontosControle, 'codigo');

  async function liberar() {
    setAgindo(true);
    try {
      await liberarLoteGate(loteId);
      sucesso(`Lote ${codigo} liberado.`);
      onDecisao();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha ao liberar.');
    } finally {
      setAgindo(false);
    }
  }

  async function bloquear() {
    setAgindo(true);
    try {
      await atualizarStatusLote(loteId, 'bloqueado');
      sucesso(`Lote ${codigo} bloqueado.`);
      onDecisao();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setAgindo(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div
        className="flex cursor-pointer items-center justify-between gap-4 p-4 hover:bg-slate-50"
        onClick={() => setExpandido((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <StatusChip status="aguardando_liberacao" />
          <div>
            <p className="font-semibold text-slate-900">{codigo}</p>
            <p className="text-xs text-slate-400">{produto}</p>
          </div>
        </div>
        <span className={`text-slate-400 transition-transform ${expandido ? 'rotate-90' : ''}`}>›</span>
      </div>

      {expandido && (
        <div className="border-t border-slate-100 p-4 space-y-4">
          {/* Monitoramentos */}
          {mons === null || mons === undefined ? (
            <Spinner className="h-5 w-5 text-emerald-600" />
          ) : mons.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum monitoramento registrado para este lote.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {mons.map((m) => {
                const pc = pcMap.get(m.ponto_controle_codigo);
                const isNaoConforme = m.conforme === false;
                return (
                  <li
                    key={m.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      isNaoConforme ? 'bg-red-50' : 'bg-emerald-50'
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${isNaoConforme ? 'text-red-800' : 'text-emerald-800'}`}>
                        {pc?.nome ?? m.ponto_controle_codigo}
                      </p>
                      {m.valor != null && (
                        <p className="text-xs text-slate-500">
                          {m.valor} {pc?.unidade ?? ''} · {formatarHora(m.registrado_em)}
                        </p>
                      )}
                      {m.observacao && <p className="text-xs text-slate-500">{m.observacao}</p>}
                    </div>
                    <span
                      className={`text-xs font-semibold ${isNaoConforme ? 'text-red-600' : 'text-emerald-600'}`}
                    >
                      {m.conforme ? 'Conforme' : 'Não conforme'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <Button
              className="flex-1"
              loading={agindo}
              onClick={() => void liberar()}
            >
              Liberar
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
              loading={agindo}
              onClick={() => void bloquear()}
            >
              Bloquear
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  const colors: Record<string, string> = {
    ccp: 'bg-red-100 text-red-700',
    prp: 'bg-amber-100 text-amber-700',
    prpo: 'bg-sky-100 text-sky-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors[tipo] ?? 'bg-slate-100 text-slate-600'}`}>
      {TIPO_PCC_LABEL[tipo as keyof typeof TIPO_PCC_LABEL] ?? tipo.toUpperCase()}
    </span>
  );
}

function mapBy<T, K extends keyof T>(rows: T[], key: K): Map<T[K], T> {
  return new Map(rows.map((r) => [r[key], r]));
}
