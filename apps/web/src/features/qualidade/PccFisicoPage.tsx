import { useState, type FormEvent } from 'react';
import { listQuebrasVidro, criarQuebraVidro } from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarDataHora } from '../../lib/format';
import { PageHeader, Card, Spinner, Button, Field, TextInput, ErroCarregamento } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { useAbaUrl } from '../../lib/useAbaUrl';
import { FornoAba } from './pcc/FornoAba';
import { DetectorAba } from './pcc/DetectorAba';
import { ImasAba } from './pcc/ImasAba';

const ABAS = ['forno', 'detector', 'imas', 'vidros'] as const;

// Monitoramentos de PCC e PPRO preenchidos pela linha e validados pela
// Qualidade: forno (FOR PQSA 8), detector de metais (FOR PQSA 11 1.2),
// ímãs (FOR PQSA 09 1.3) e quebra de vidros.
export function PccFisicoPage() {
  const [aba, setAba] = useAbaUrl('aba', ABAS, 'forno');
  return (
    <>
      <PageHeader grupo="Qualidade" title="Monitoramento de PCC"
        subtitle="Forno, detector de metais, ímãs e quebra de vidros — FSSC 22000" />

      <div className="mb-5 flex flex-wrap gap-2">
        {([['forno', 'Forno'], ['detector', 'Detector de metais'], ['imas', 'Ímãs'], ['vidros', 'Quebra de vidros']] as const).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${
                aba === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {aba === 'forno' && <FornoAba />}
      {aba === 'detector' && <DetectorAba />}
      {aba === 'imas' && <ImasAba />}
      {aba === 'vidros' && <VidrosCarregados />}
    </>
  );
}

function VidrosCarregados() {
  const [recarregar, setRecarregar] = useState(0);
  const { data, loading, error } = useAsync(() => listQuebrasVidro(), [recarregar]);
  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  if (error) return <ErroCarregamento mensagem={error} />;
  return <VidrosAba vidros={data ?? []} onSaved={() => setRecarregar((n) => n + 1)} />;
}

// ── Quebra de vidros ───────────────────────────────────────────
function VidrosAba({ vidros, onSaved }: { vidros: any[]; onSaved: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const local = String(form.get('local') ?? '').trim();
    if (!local) return;
    setSalvando(true);
    try {
      await criarQuebraVidro({
        local,
        tipo_vidro: String(form.get('tipo_vidro') ?? '').trim() || null,
        quantidade: String(form.get('quantidade') ?? '').trim() || null,
        causa: String(form.get('causa') ?? '').trim() || null,
        acao_imediata: String(form.get('acao_imediata') ?? '').trim() || null,
        acao_preventiva: String(form.get('acao_preventiva') ?? '').trim() || null,
      });
      sucesso('Quebra de vidro registrada.');
      (e.target as HTMLFormElement).reset();
      onSaved();
    } catch (err) {
      erro(err instanceof Error ? err.message : 'Falha.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Registrar quebra (a cada evento)</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Local da ocorrência">
            <TextInput name="local" required placeholder="Ex.: Sala de ensaque" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de vidro"><TextInput name="tipo_vidro" placeholder="Luminária…" /></Field>
            <Field label="Quantidade"><TextInput name="quantidade" placeholder="Ex.: 1 unid." /></Field>
          </div>
          <Field label="Causa"><TextInput name="causa" placeholder="—" /></Field>
          <Field label="Ação imediata"><TextInput name="acao_imediata" placeholder="Isolamento, varredura…" /></Field>
          <Field label="Ação preventiva"><TextInput name="acao_preventiva" placeholder="—" /></Field>
          <Button type="submit" loading={salvando} className="w-full">Registrar quebra</Button>
        </form>
      </Card>

      <div className="lg:col-span-3">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Histórico</h2>
        {vidros.length === 0 ? (
          <Card className="p-4 text-sm text-slate-400">Nenhuma quebra registrada.</Card>
        ) : (
          <div className="space-y-3">
            {vidros.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-800">{v.local}</p>
                  <span className="text-xs text-slate-400">{formatarDataHora(v.registrado_em)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-slate-500">
                  {v.tipo_vidro && <span>{v.tipo_vidro}</span>}
                  {v.quantidade && <span>{v.quantidade}</span>}
                  {v.causa && <span>Causa: {v.causa}</span>}
                </div>
                {v.acao_imediata && <p className="mt-1 text-xs text-slate-500">Ação: {v.acao_imediata}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

