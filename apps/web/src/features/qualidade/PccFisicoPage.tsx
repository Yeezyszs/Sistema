import { useState, type FormEvent } from 'react';
import {
  listDetectoresMetais,
  listVerificacoesDM,
  criarVerificacaoDM,
  listImas,
  listVerificacoesIma,
  criarVerificacaoIma,
  listQuebrasVidro,
  criarQuebraVidro,
  listLotes,
  mapBy,
} from '../../lib/db';
import { useAsync } from '../../lib/useAsync';
import { formatarDataHora } from '../../lib/format';
import { TIPO_TESTE_DM, TIPO_TESTE_DM_LABEL, dmConforme } from '@sistema/domain';
import type { TipoTesteDM } from '@sistema/domain';
import { PageHeader, Card, Spinner, Button, Field, TextInput, Select } from '../../components/ui';
import { useToast } from '../../components/Toast';

type Aba = 'detector' | 'imas' | 'vidros';

export function PccFisicoPage() {
  const [aba, setAba] = useState<Aba>('detector');
  const [recarregar, setRecarregar] = useState(0);

  const { data, loading } = useAsync(async () => {
    const [detectores, verifsDM, imas, verifsIma, vidros, lotes] = await Promise.all([
      listDetectoresMetais(),
      listVerificacoesDM(),
      listImas(),
      listVerificacoesIma(),
      listQuebrasVidro(),
      listLotes(),
    ]);
    return {
      detectores,
      detectoresMap: mapBy(detectores, 'id'),
      verifsDM,
      imas,
      imasMap: mapBy(imas, 'id'),
      verifsIma,
      vidros,
      lotes: lotes.filter((l) => l.status === 'em_processo' || l.status === 'aguardando_liberacao'),
    };
  }, [recarregar]);

  const recarregarTudo = () => setRecarregar((n) => n + 1);

  return (
    <>
      <PageHeader title="PCC Físico" subtitle="Detector de metais, imãs e quebra de vidros (FSSC 22000)" />

      <div className="mb-5 flex gap-2">
        {([['detector', 'Detector de metais'], ['imas', 'Imãs'], ['vidros', 'Quebra de vidros']] as const).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                aba === id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <Spinner className="h-7 w-7 text-emerald-600" />
        </div>
      )}

      {data && aba === 'detector' && (
        <DetectorAba data={data} onSaved={recarregarTudo} />
      )}
      {data && aba === 'imas' && <ImasAba data={data} onSaved={recarregarTudo} />}
      {data && aba === 'vidros' && <VidrosAba vidros={data.vidros} onSaved={recarregarTudo} />}
    </>
  );
}

// ── Detector de metais ─────────────────────────────────────────
function DetectorAba({ data, onSaved }: { data: any; onSaved: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const [fe, setFe] = useState(true);
  const [nf, setNf] = useState(true);
  const [inox, setInox] = useState(true);
  const { sucesso, erro } = useToast();
  const conforme = dmConforme({ resultado_ferroso: fe, resultado_nao_ferroso: nf, resultado_inox: inox });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const detector_id = String(form.get('detector_id') ?? '');
    const tipo_teste = String(form.get('tipo_teste') ?? '') as TipoTesteDM;
    const lote_id = String(form.get('lote_id') ?? '') || null;
    if (!detector_id || !tipo_teste) return;
    setSalvando(true);
    try {
      await criarVerificacaoDM({
        detector_id,
        tipo_teste,
        lote_id,
        resultado_ferroso: fe,
        resultado_nao_ferroso: nf,
        resultado_inox: inox,
        conforme,
        acao_corretiva: conforme ? null : String(form.get('acao_corretiva') ?? '').trim() || null,
      });
      if (conforme) {
        sucesso('Verificação registrada (conforme).');
      } else {
        erro(
          lote_id
            ? 'Reprovada! NC aberta automaticamente — o lote ficará bloqueado para liberação.'
            : 'Reprovada! NC aberta automaticamente. Segregue a produção do período.',
        );
      }
      setFe(true); setNf(true); setInox(true);
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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Registrar verificação (a cada 2h)</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Detector / linha">
            <Select name="detector_id" defaultValue="" required>
              <option value="" disabled>Selecione…</option>
              {data.detectores.map((d: any) => (
                <option key={d.id} value={d.id}>{d.linha}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo de teste">
            <Select name="tipo_teste" defaultValue="durante_producao" required>
              {TIPO_TESTE_DM.map((t) => (
                <option key={t} value={t}>{TIPO_TESTE_DM_LABEL[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Lote em produção (para bloqueio em caso de falha)">
            <Select name="lote_id" defaultValue="">
              <option value="">— não vincular —</option>
              {data.lotes.map((l: any) => (
                <option key={l.id} value={l.id}>{l.codigo}</option>
              ))}
            </Select>
          </Field>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">Corpos de prova (detecta, alarma e rejeita?)</p>
            <Toggle label="Ferroso 1,2 mm" valor={fe} onChange={setFe} />
            <Toggle label="Não ferroso 1,2 mm" valor={nf} onChange={setNf} />
            <Toggle label="Aço inox 1,5 mm" valor={inox} onChange={setInox} />
          </div>
          {!conforme && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="mb-2 text-xs font-medium text-red-700">
                Falha: segregue a produção do período, pare a linha e acione a manutenção.
              </p>
              <TextInput name="acao_corretiva" placeholder="Ação corretiva tomada" />
            </div>
          )}
          <Button type="submit" loading={salvando} className="w-full">
            Registrar verificação
          </Button>
        </form>
      </Card>

      <div className="lg:col-span-3">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Últimas verificações</h2>
        {data.verifsDM.length === 0 ? (
          <Card className="p-4 text-sm text-slate-400">Nenhuma verificação registrada.</Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Linha</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Teste</th>
                  <th className="px-5 py-3 font-medium">Quando</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.verifsDM.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">{data.detectoresMap.get(v.detector_id)?.linha ?? '—'}</td>
                    <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">{TIPO_TESTE_DM_LABEL[v.tipo_teste as TipoTesteDM]}</td>
                    <td className="px-5 py-3 text-slate-500">{formatarDataHora(v.registrado_em)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${v.conforme ? 'text-emerald-600' : 'text-red-600'}`}>
                        {v.conforme ? 'Conforme' : 'Reprovado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Imãs ───────────────────────────────────────────────────────
function ImasAba({ data, onSaved }: { data: any; onSaved: () => void }) {
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const ima_id = String(form.get('ima_id') ?? '');
    if (!ima_id) return;
    const peso = String(form.get('peso_g') ?? '').trim();
    setSalvando(true);
    try {
      await criarVerificacaoIma({
        ima_id,
        peso_g: peso ? Number(peso) : null,
        material: String(form.get('material') ?? '').trim() || null,
        acao: String(form.get('acao') ?? '').trim() || null,
      });
      sucesso('Verificação de imã registrada.');
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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Registrar verificação (1x/dia)</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Imã / ponto">
            <Select name="ima_id" defaultValue="" required>
              <option value="" disabled>Selecione…</option>
              {data.imas.map((i: any) => (
                <option key={i.id} value={i.id}>{i.local}</option>
              ))}
            </Select>
          </Field>
          <Field label="Peso capturado (g)">
            <TextInput name="peso_g" type="number" step="any" min="0" placeholder="0" />
          </Field>
          <Field label="Material encontrado">
            <TextInput name="material" placeholder="Ex.: partículas ferrosas" />
          </Field>
          <Field label="Ação corretiva (se houver)">
            <TextInput name="acao" placeholder="—" />
          </Field>
          <Button type="submit" loading={salvando} className="w-full">Registrar</Button>
        </form>
      </Card>

      <div className="lg:col-span-3">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Últimas verificações</h2>
        {data.verifsIma.length === 0 ? (
          <Card className="p-4 text-sm text-slate-400">Nenhuma verificação registrada.</Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Ponto</th>
                  <th className="px-5 py-3 font-medium">Peso</th>
                  <th className="hidden px-5 py-3 font-medium sm:table-cell">Material</th>
                  <th className="px-5 py-3 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.verifsIma.map((v: any) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-700">{data.imasMap.get(v.ima_id)?.local ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{v.peso_g != null ? `${v.peso_g} g` : '—'}</td>
                    <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">{v.material ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{formatarDataHora(v.registrado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
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

function Toggle({ label, valor, onChange }: { label: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!valor)}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
          valor ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
        }`}
      >
        {valor ? 'Detecta/rejeita' : 'Não detecta'}
      </button>
    </div>
  );
}
