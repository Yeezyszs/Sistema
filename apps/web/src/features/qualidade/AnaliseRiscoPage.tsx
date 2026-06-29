import { useState, type FormEvent } from 'react';
import { listAnalisesRisco, criarAnaliseRisco } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarData } from '../../lib/format';
import {
  EIXOS_POR_TIPO, calcularRisco, classificarRisco, CLASSIFICACAO_LABEL, CLASSIFICACAO_TOM,
} from '@sistema/domain';
import type { TipoAnaliseRisco } from '@sistema/domain';
import { PageHeader, Card, Spinner, EmptyState, Button, Field, TextInput, TextArea, Select, Modal } from '../../components/ui';
import { IconPlus, IconShield } from '../../components/icons';
import { useToast } from '../../components/Toast';

const TOM_CLASS: Record<string, string> = {
  sucesso: 'bg-emerald-100 text-emerald-700', alerta: 'bg-amber-100 text-amber-700', erro: 'bg-red-100 text-red-700',
};

export function AnaliseRiscoPage() {
  const [tipo, setTipo] = useState<TipoAnaliseRisco>('food_defense');
  const [recarregar, setRecarregar] = useState(0);
  const [modal, setModal] = useState(false);

  const { data, loading } = useAsync(async () => listAnalisesRisco(tipo), [tipo, recarregar]);

  return (
    <>
      <PageHeader
        title="Análise de risco"
        subtitle="Food Defense e Food Fraud (vulnerabilidade — FSSC 22000 v6)"
        action={<Button onClick={() => setModal(true)}><IconPlus width={16} height={16} />Nova análise</Button>}
      />

      <div className="mb-5 flex gap-2">
        {([['food_defense', 'Food Defense'], ['food_fraud', 'Food Fraud']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTipo(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tipo === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-emerald-600" /></div>}

      {data && data.length === 0 && (
        <EmptyState icon={<IconShield width={36} height={36} />} title="Nenhuma análise" description="Registre a primeira análise de vulnerabilidade." />
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{a.titulo}</span>
                    {a.classificacao && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOM_CLASS[CLASSIFICACAO_TOM[a.classificacao] ?? 'alerta']}`}>
                        {CLASSIFICACAO_LABEL[a.classificacao] ?? a.classificacao}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">risco {a.risco ?? '—'}</span>
                  </div>
                  {a.contexto && <p className="mt-1 text-xs text-slate-400">{a.contexto}</p>}
                  {a.descricao && <p className="mt-2 text-sm text-slate-700">{a.descricao}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {Object.entries(a.eixos).map(([k, v]) => (
                      <span key={k} className="rounded bg-slate-100 px-2 py-0.5">{k}: {v}</span>
                    ))}
                  </div>
                  {a.necessita_mitigacao && a.mitigacao && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <span className="font-semibold">Mitigação:</span> {a.mitigacao}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-slate-400">{formatarData(a.avaliado_em)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ModalAnalise tipo={tipo} open={modal} onClose={() => setModal(false)} onSaved={() => setRecarregar((n) => n + 1)} />
    </>
  );
}

function ModalAnalise({
  tipo, open, onClose, onSaved,
}: {
  tipo: TipoAnaliseRisco; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const eixosDef = EIXOS_POR_TIPO[tipo];
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  const eixos: Record<string, number> = {};
  for (const e of eixosDef) eixos[e.chave] = notas[e.chave] ?? 1;
  const risco = calcularRisco(eixos);
  const classificacao = classificarRisco(tipo, risco);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const titulo = String(f.get('titulo') ?? '').trim();
    if (!titulo) return;
    const mitigacao = String(f.get('mitigacao') ?? '').trim() || null;
    setSalvando(true);
    try {
      await criarAnaliseRisco({
        tipo, titulo,
        contexto: String(f.get('contexto') ?? '').trim() || null,
        descricao: String(f.get('descricao') ?? '').trim() || null,
        eixos, risco, classificacao,
        necessita_mitigacao: Boolean(mitigacao),
        mitigacao,
      });
      sucesso('Análise registrada.');
      setNotas({});
      onSaved(); onClose();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova análise de risco" size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label={tipo === 'food_fraud' ? 'Insumo / produto' : 'Área / origem'}>
            <TextInput name="titulo" required placeholder={tipo === 'food_fraud' ? 'Ex.: Fécula a granel' : 'Ex.: Acesso de visitantes'} />
          </Field>
          <Field label="Contexto"><TextInput name="contexto" placeholder="Detalhe" /></Field>
        </div>
        <Field label="Descrição / ameaça"><TextArea name="descricao" rows={2} placeholder="Descreva a vulnerabilidade…" /></Field>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Eixos (nota 1–3)</p>
          <div className="grid grid-cols-3 gap-3">
            {eixosDef.map((eixo) => (
              <Field key={eixo.chave} label={eixo.rotulo}>
                <Select
                  value={String(notas[eixo.chave] ?? 1)}
                  onChange={(e) => setNotas((p) => ({ ...p, [eixo.chave]: Number(e.target.value) }))}
                >
                  <option value="1">1 — baixo</option>
                  <option value="2">2 — médio</option>
                  <option value="3">3 — alto</option>
                </Select>
              </Field>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
          <span className="text-sm text-slate-600">Risco calculado: <span className="font-semibold text-slate-900">{risco}</span></span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TOM_CLASS[CLASSIFICACAO_TOM[classificacao] ?? 'alerta']}`}>
            {CLASSIFICACAO_LABEL[classificacao] ?? classificacao}
          </span>
        </div>

        <Field label="Medidas de mitigação (se necessário)"><TextArea name="mitigacao" rows={2} placeholder="Controles propostos…" /></Field>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={salvando}>Registrar análise</Button>
        </div>
      </form>
    </Modal>
  );
}
