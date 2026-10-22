// Monitoramento do forno (FOR PQSA 8): uma folha por lote, uma linha por
// leitura. Fora do limite do PCC a leitura fica vermelha e pede ação
// corretiva na hora; a Qualidade valida a folha no fim.
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  listFornoRegistros, listLeiturasForno, criarFornoRegistro, criarLeituraForno, excluirLeituraForno,
  atualizarFornoRegistro, listPontosControle, listLotes,
} from '../../../lib/db';
import { useAsync } from '../../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../../lib/format';
import { desviosLeituraForno } from '@sistema/domain';
import type { FornoRegistro, FornoLeitura, LimitesForno } from '@sistema/domain';
import { Card, Spinner, Button, Field, TextInput, Select, ErroCarregamento } from '../../../components/ui';
import { useToast } from '../../../components/Toast';
import { BotaoValidar, SeloValidacao, hora } from './comum';

const FORNOS = ['Forno 1', 'Forno 2'];

export function FornoAba() {
  const [recarregar, setRecarregar] = useState(0);
  const [selId, setSelId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();
  const rec = () => setRecarregar((n) => n + 1);

  const { data, loading, error } = useAsync(async () => {
    const [registros, pontos, lotes] = await Promise.all([listFornoRegistros(), listPontosControle(), listLotes()]);
    const leituras = await listLeiturasForno(registros.map((r) => r.id));
    const ccp1 = pontos.find((p) => p.codigo === 'CCP-01');
    const ccp2 = pontos.find((p) => p.codigo === 'CCP-02');
    const limites: LimitesForno = {
      tempSaidaMin: ccp1?.limite_min ?? null,
      tempSaidaMax: ccp1?.limite_max ?? null,
      umidadeMax: ccp2?.limite_max ?? null,
    };
    return {
      registros, leituras, limites,
      lotes: lotes.filter((l) => l.status === 'em_processo' || l.status === 'aguardando_liberacao'),
      lotesMap: new Map(lotes.map((l) => [l.id, l.codigo])),
    };
  }, [recarregar]);

  async function abrirFolha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    setSalvando(true);
    try {
      const novo = await criarFornoRegistro({
        data: txt('data') ?? hojeLocalISO(), forno: txt('forno'), lote_id: txt('lote_id'),
        produto: txt('produto'), peneira: txt('peneira'), cliente: txt('cliente'), embalagem: txt('embalagem'),
      });
      (e.target as HTMLFormElement).reset();
      setSelId(novo.id);
      sucesso('Folha do forno aberta.');
      rec();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  if (error) return <ErroCarregamento mensagem={error} />;
  if (!data) return null;

  const sel = data.registros.find((r) => r.id === selId) ?? data.registros[0] ?? null;
  const { limites } = data;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="min-w-0 space-y-4 lg:col-span-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Abrir folha do forno</h2>
          <form onSubmit={abrirFolha} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data"><TextInput name="data" type="date" defaultValue={hojeLocalISO()} /></Field>
              <Field label="Forno">
                <Select name="forno" defaultValue={FORNOS[0]}>
                  {FORNOS.map((f) => <option key={f}>{f}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Lote">
              <Select name="lote_id" defaultValue="">
                <option value="">— sem lote —</option>
                {data.lotes.map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Produto"><TextInput name="produto" placeholder="Farinha crua 5%" /></Field>
              <Field label="Peneira"><TextInput name="peneira" placeholder="P.16" /></Field>
              <Field label="Cliente"><TextInput name="cliente" /></Field>
              <Field label="Embalagem"><TextInput name="embalagem" placeholder="Big bag" /></Field>
            </div>
            <Button type="submit" loading={salvando} className="w-full">Abrir folha</Button>
          </form>
        </Card>

        <Card className="divide-y divide-slate-100">
          {data.registros.length === 0 && <p className="p-4 text-sm text-slate-400">Nenhuma folha aberta.</p>}
          {data.registros.map((r) => {
            const lt = data.leituras.filter((l) => l.registro_id === r.id);
            const nc = lt.filter((l) => !l.conforme).length;
            return (
              <button key={r.id} type="button" onClick={() => setSelId(r.id)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[12.5px] transition hover:bg-slate-50 ${
                  sel?.id === r.id ? 'bg-brand-50' : ''
                }`}>
                <span className="min-w-0">
                  <span className="font-semibold text-slate-800">{formatarData(r.data)} · {r.forno ?? '—'}</span>
                  <span className="block truncate text-slate-500">
                    {r.lote_id ? `Lote ${data.lotesMap.get(r.lote_id) ?? '—'}` : 'Sem lote'}{r.produto ? ` · ${r.produto}` : ''} · {lt.length} leitura(s)
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {nc > 0 && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-red-700">{nc} fora</span>}
                  <SeloValidacao validadoEm={r.validado_em} />
                </span>
              </button>
            );
          })}
        </Card>
      </div>

      <div className="min-w-0 lg:col-span-3">
        {sel ? (
          <Folha key={sel.id} registro={sel} leituras={data.leituras.filter((l) => l.registro_id === sel.id)}
            limites={limites} lote={sel.lote_id ? data.lotesMap.get(sel.lote_id) ?? null : null} onSaved={rec} />
        ) : (
          <Card className="p-6 text-sm text-slate-400">Abra uma folha para registrar as leituras.</Card>
        )}
      </div>
    </div>
  );
}

function textoLimites(l: LimitesForno): string {
  const t = l.tempSaidaMin != null ? `saída ≥ ${l.tempSaidaMin} °C` : 'saída sem limite';
  const u = l.umidadeMax != null ? `umidade ≤ ${l.umidadeMax} %` : 'umidade sem limite';
  return `${t} · ${u}`;
}

function Folha({ registro, leituras, limites, lote, onSaved }: {
  registro: FornoRegistro; leituras: FornoLeitura[]; limites: LimitesForno; lote: string | null; onSaved: () => void;
}) {
  const [temp, setTemp] = useState('');
  const [umid, setUmid] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();
  const n = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : null);
  const desvios = desviosLeituraForno({ temp_saida: n(temp), umidade: n(umid) }, limites);
  const fechada = registro.validado_em != null;

  async function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const num = (k: string) => n(String(f.get(k) ?? ''));
    const acao = String(f.get('acao_corretiva') ?? '').trim() || null;
    if (n(temp) == null && n(umid) == null) { erro('Informe ao menos a temperatura de saída ou a umidade.'); return; }
    if (desvios.length > 0 && !acao) { erro('Fora do limite do PCC: descreva a ação corretiva.'); return; }
    const hh = String(f.get('hora') ?? '');
    const quando = hh ? new Date(`${registro.data}T${hh}:00`) : new Date();
    setSalvando(true);
    try {
      await criarLeituraForno({
        registro_id: registro.id,
        registrado_em: quando.toISOString(),
        temp_saida: n(temp), temp_entrada: num('temp_entrada'), hz_dosadeira: num('hz_dosadeira'),
        umidade: n(umid), n_embalagem: String(f.get('n_embalagem') ?? '').trim() || null,
        conforme: desvios.length === 0, acao_corretiva: acao,
      });
      (e.target as HTMLFormElement).reset();
      setTemp(''); setUmid('');
      if (desvios.length > 0) erro(`Leitura fora do PCC registrada: ${desvios.join('; ')}.`);
      else sucesso('Leitura registrada.');
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function salvarObs(obs: string) {
    if (obs === (registro.observacao ?? '')) return;
    try { await atualizarFornoRegistro(registro.id, { observacao: obs || null }); onSaved(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  async function excluir(id: string) {
    try { await excluirLeituraForno(id); onSaved(); }
    catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
  }

  const agoraHH = new Date().toTimeString().slice(0, 5);

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">FOR PQSA 8 · Registro de monitoramento do forno</p>
          <p className="text-base font-semibold text-slate-900">
            {registro.forno ?? 'Forno'} · {formatarData(registro.data)}{lote ? ` · Lote ${lote}` : ''}
          </p>
          <p className="text-xs text-slate-500">
            {[registro.produto, registro.peneira && `Peneira ${registro.peneira}`, registro.cliente, registro.embalagem].filter(Boolean).join(' · ') || '—'}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Limites do PCC: {textoLimites(limites)} (cadastro CCP-01 / CCP-02)</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/imprimir/forno/${registro.id}`} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Imprimir</Link>
          <SeloValidacao validadoEm={registro.validado_em} />
          {!fechada && <BotaoValidar tabela="forno_registros" ids={[registro.id]} rotulo="Validar folha" onFeito={onSaved} />}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-2 py-2">Hora</th>
              <th className="px-2 py-2 text-right">T. saída °C</th>
              <th className="px-2 py-2 text-right">T. entrada °C</th>
              <th className="px-2 py-2 text-right">Dosadeira Hz</th>
              <th className="px-2 py-2 text-right">Umidade %</th>
              <th className="px-2 py-2">Nº emb.</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leituras.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-3 text-center text-xs text-slate-400">Nenhuma leitura ainda.</td></tr>
            )}
            {leituras.map((l) => {
              const dv = desviosLeituraForno(l, limites);
              const tFora = dv.some((d) => d.startsWith('Temperatura'));
              const uFora = dv.some((d) => d.startsWith('Umidade'));
              return (
                <tr key={l.id} className={l.conforme ? '' : 'bg-red-50/60'}>
                  <td className="px-2 py-1.5 text-slate-600">{hora(l.registrado_em)}</td>
                  <td className={`px-2 py-1.5 text-right ${tFora ? 'font-semibold text-red-700' : 'text-slate-700'}`}>{l.temp_saida ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">{l.temp_entrada ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">{l.hz_dosadeira ?? '—'}</td>
                  <td className={`px-2 py-1.5 text-right ${uFora ? 'font-semibold text-red-700' : 'text-slate-700'}`}>{l.umidade ?? '—'}</td>
                  <td className="px-2 py-1.5 text-slate-600">
                    {l.n_embalagem ?? '—'}
                    {l.acao_corretiva && <span className="block text-[11px] text-red-700">Ação: {l.acao_corretiva}</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {!fechada && (
                      <button type="button" onClick={() => void excluir(l.id)} aria-label="Excluir leitura"
                        className="text-xs text-slate-400 hover:text-red-600">×</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!fechada && (
        <form onSubmit={registrar} className="mt-4 space-y-3 rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <Field label="Hora"><TextInput name="hora" type="time" defaultValue={agoraHH} /></Field>
            <Field label="T. saída °C">
              <TextInput type="number" step="any" value={temp} onChange={(e) => setTemp(e.target.value)} />
            </Field>
            <Field label="T. entrada °C"><TextInput name="temp_entrada" type="number" step="any" /></Field>
            <Field label="Dosadeira Hz"><TextInput name="hz_dosadeira" type="number" step="any" /></Field>
            <Field label="Umidade %">
              <TextInput type="number" step="any" value={umid} onChange={(e) => setUmid(e.target.value)} />
            </Field>
            <Field label="Nº emb."><TextInput name="n_embalagem" /></Field>
          </div>
          {desvios.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="mb-2 text-xs font-semibold text-red-700">{desvios.join(' · ')} — desvio de PCC.</p>
              <TextInput name="acao_corretiva" placeholder="Ação corretiva (ex.: ajustada a temperatura, produto segregado)" />
            </div>
          )}
          <Button type="submit" loading={salvando} className="w-full">Registrar leitura</Button>
        </form>
      )}

      <div className="mt-4">
        <Field label="Ocorrências durante o processo">
          <textarea defaultValue={registro.observacao ?? ''} rows={2} disabled={fechada}
            onBlur={(e) => void salvarObs(e.target.value.trim())}
            className="w-full rounded-[7px] border border-slate-300 px-3 py-2 text-[12.5px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50" />
        </Field>
      </div>
    </Card>
  );
}
