// Verificação do detector de metais (FOR PQSA 11 1.2).
//
// Regras do formulário: testar no início e no fim da produção, a cada 2 h,
// após parada > 8 h, na troca de produto e após manutenção do detector, com
// 15 min de tolerância; sem produção, "NHP". Falha num corpo de prova abre o
// verso de correção: o banco já abre a NC (e bloqueia o lote vinculado), e
// daqui sai a O.S. para a manutenção com risco à segurança de alimentos.
import { useState, type FormEvent } from 'react';
import {
  listDetectoresMetais, listVerificacoesDMDesde, criarVerificacaoDM, listLotes, criarOrdemPcm,
} from '../../../lib/db';
import { useAsync } from '../../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../../lib/format';
import { TIPO_TESTE_DM, TIPO_TESTE_DM_LABEL, SETORES_PCM, dmConforme, situacaoDetector } from '@sistema/domain';
import type { TipoTesteDM, DetectorMetais, VerificacaoDM } from '@sistema/domain';
import { Card, Spinner, Button, Field, TextInput, Select, ErroCarregamento } from '../../../components/ui';
import { useToast } from '../../../components/Toast';
import { BotaoValidar, SeloValidacao, SimNao, hora } from './comum';

// "Ensaque 01" → "ENSAQUE 1", para cair no setor certo da O.S.
function setorDoDetector(linha: string): string {
  const norm = (s: string) => s.toUpperCase().replace(/\b0+(\d)/g, '$1').replace(/\s+/g, ' ').trim();
  return SETORES_PCM.find((s) => norm(s) === norm(linha)) ?? linha.toUpperCase();
}

export function DetectorAba() {
  const [recarregar, setRecarregar] = useState(0);
  const rec = () => setRecarregar((n) => n + 1);
  // Últimos 7 dias: o bastante para a Qualidade validar a semana.
  const { data, loading, error } = useAsync(async () => {
    const desde = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [detectores, verifs, lotes] = await Promise.all([
      listDetectoresMetais(), listVerificacoesDMDesde(desde), listLotes(),
    ]);
    return {
      detectores, verifs,
      lotes: lotes.filter((l) => l.status === 'em_processo' || l.status === 'aguardando_liberacao'),
      lotesMap: new Map(lotes.map((l) => [l.id, l.codigo])),
    };
  }, [recarregar]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  if (error) return <ErroCarregamento mensagem={error} />;
  if (!data) return null;

  const aValidar = data.verifs.filter((v) => !v.validado_em).map((v) => v.id);
  const porDia = new Map<string, VerificacaoDM[]>();
  for (const v of data.verifs) {
    const d = hojeLocalISO(new Date(v.registrado_em));
    porDia.set(d, [...(porDia.get(d) ?? []), v]);
  }

  return (
    <div className="space-y-5">
      {/* Situação de cada detector agora */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.detectores.map((d) => {
          const ultimo = data.verifs.find((v) => v.detector_id === d.id) ?? null;
          const s = situacaoDetector(ultimo);
          const tom = s.situacao === 'atrasado' ? 'border-red-300 bg-red-50' : s.situacao === 'em_dia' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white';
          return (
            <div key={d.id} className={`rounded-xl border p-4 ${tom}`}>
              <p className="text-sm font-semibold text-slate-900">{d.linha}</p>
              <p className="mt-0.5 text-[12.5px] text-slate-600">
                {s.situacao === 'atrasado' && <span className="font-semibold text-red-700">Teste atrasado — era até {hora(s.proximoAte!.toISOString())}</span>}
                {s.situacao === 'em_dia' && <>Próximo teste até <span className="font-semibold">{hora(s.proximoAte!.toISOString())}</span></>}
                {s.situacao === 'encerrado' && 'Produção encerrada hoje'}
                {s.situacao === 'sem_teste' && 'Sem produção registrada hoje'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Corpos de prova: Fe {d.ferroso_mm} · Não Fe {d.nao_ferroso_mm} · Inox {d.inox_mm} mm
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Registrar teste</h2>
          <FormTeste detectores={data.detectores} lotes={data.lotes} onSaved={rec} />
        </Card>

        <div className="min-w-0 lg:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Últimos 7 dias</h2>
            <BotaoValidar tabela="verificacoes_dm" ids={aValidar} rotulo="Validar pendentes" onFeito={rec} />
          </div>
          {data.verifs.length === 0 ? (
            <Card className="p-4 text-sm text-slate-400">Nenhum teste nos últimos 7 dias.</Card>
          ) : (
            <div className="space-y-3">
              {[...porDia.entries()].map(([dia, vs]) => (
                <Card key={dia} className="overflow-x-auto">
                  <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11.5px] font-bold uppercase tracking-wide text-slate-500">{formatarData(dia)}</p>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {vs.map((v) => (
                        <tr key={v.id} className={!v.conforme ? 'bg-red-50/60' : ''}>
                          <td className="px-4 py-2 text-slate-600">{hora(v.registrado_em)}</td>
                          <td className="px-2 py-2 text-slate-700">{data.detectores.find((d) => d.id === v.detector_id)?.linha ?? '—'}</td>
                          <td className="hidden px-2 py-2 text-slate-500 sm:table-cell">{v.nhp ? '—' : TIPO_TESTE_DM_LABEL[v.tipo_teste]}</td>
                          <td className="px-2 py-2">
                            {v.nhp ? (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">NHP</span>
                            ) : v.conforme ? (
                              <span className="text-xs font-semibold text-emerald-700">Detecta e rejeita</span>
                            ) : (
                              <span className="text-xs font-semibold text-red-700" title={v.acao_corretiva ?? undefined}>
                                Falha{v.producao_retida ? ' · produção retida' : ''}{v.os_id ? ' · O.S. aberta' : ''}
                              </span>
                            )}
                            {v.observacao && <span className="block text-[11px] text-slate-500">{v.observacao}</span>}
                          </td>
                          <td className="px-4 py-2 text-right"><SeloValidacao validadoEm={v.validado_em} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormTeste({ detectores, lotes, onSaved }: {
  detectores: DetectorMetais[]; lotes: { id: string; codigo: string }[]; onSaved: () => void;
}) {
  const [detectorId, setDetectorId] = useState(detectores[0]?.id ?? '');
  const [fe, setFe] = useState(true);
  const [nf, setNf] = useState(true);
  const [inox, setInox] = useState(true);
  const [linhaParada, setLinhaParada] = useState<boolean | null>(null);
  const [manutInformada, setManutInformada] = useState<boolean | null>(null);
  const [retida, setRetida] = useState<boolean | null>(null);
  const [validacaoEquip, setValidacaoEquip] = useState<boolean | null>(null);
  const [abrirOs, setAbrirOs] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [versao, setVersao] = useState(0);
  const { sucesso, erro } = useToast();
  const det = detectores.find((d) => d.id === detectorId);
  const conforme = dmConforme({ resultado_ferroso: fe, resultado_nao_ferroso: nf, resultado_inox: inox });

  function limpar() {
    setFe(true); setNf(true); setInox(true);
    setLinhaParada(null); setManutInformada(null); setRetida(null); setValidacaoEquip(null); setAbrirOs(true);
    setVersao((v) => v + 1);
  }

  async function nhp() {
    if (!detectorId) return;
    setSalvando(true);
    try {
      await criarVerificacaoDM({
        detector_id: detectorId, tipo_teste: 'durante_producao', nhp: true,
        resultado_ferroso: true, resultado_nao_ferroso: true, resultado_inox: true, conforme: true,
      });
      sucesso('NHP registrado — não houve produção.');
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const txt = (k: string) => String(f.get(k) ?? '').trim() || null;
    const tipo_teste = String(f.get('tipo_teste') ?? 'durante_producao') as TipoTesteDM;
    const lote_id = txt('lote_id');
    if (!detectorId) { erro('Selecione o detector.'); return; }
    if (tipo_teste === 'troca_produto' && !txt('observacao')) {
      erro('Troca de produto: anote em Observações o novo produto.'); return;
    }
    if (!conforme) {
      if (!txt('lider_informado') || linhaParada == null || manutInformada == null || retida == null) {
        erro('Falha: preencha o líder informado e responda linha parada, manutenção e produção retida.'); return;
      }
      if (!txt('acao_corretiva')) { erro('Falha: descreva a ação corretiva.'); return; }
    }
    setSalvando(true);
    try {
      let os_id: string | null = null;
      if (!conforme && abrirOs && det) {
        const os = await criarOrdemPcm({
          data: hojeLocalISO(),
          hora: new Date().toTimeString().slice(0, 5),
          setor: setorDoDetector(det.linha),
          tipo: 'Corretiva',
          natureza: 'Elétrica',
          prioridade: 'Urgente',
          status: 'Em Aberto',
          descricao: `Detector de metais ${det.linha} não detectou/rejeitou corpo de prova`
            + ` (${[!fe && 'ferroso', !nf && 'não ferroso', !inox && 'inox'].filter(Boolean).join(', ')}). `
            + (txt('acao_corretiva') ?? ''),
          req: txt('lider_informado'),
          parada_equip: linhaParada === true,
          risco_seguranca_alimentos: true,
        });
        os_id = os.id;
      }
      await criarVerificacaoDM({
        detector_id: detectorId, tipo_teste, lote_id,
        resultado_ferroso: fe, resultado_nao_ferroso: nf, resultado_inox: inox, conforme,
        observacao: txt('observacao'),
        acao_corretiva: conforme ? null : txt('acao_corretiva'),
        lider_informado: conforme ? null : txt('lider_informado'),
        linha_parada: conforme ? null : linhaParada,
        manutencao_informada: conforme ? null : manutInformada,
        producao_retida: conforme ? null : retida,
        validacao_equipamento: conforme ? null : validacaoEquip,
        responsavel_retencao: conforme ? null : txt('responsavel_retencao'),
        os_id,
      });
      if (conforme) sucesso('Teste registrado — detecta, alarma e rejeita.');
      else erro(`Falha registrada. NC aberta${lote_id ? ' e lote bloqueado' : ''}${os_id ? '; O.S. enviada à manutenção' : ''}.`);
      (e.target as HTMLFormElement).reset();
      limpar();
      onSaved();
    } catch (err) { erro(err instanceof Error ? err.message : 'Falha.'); }
    finally { setSalvando(false); }
  }


  return (
    <form key={versao} onSubmit={onSubmit} className="space-y-3">
      <Field label="Detector / linha">
        <Select value={detectorId} onChange={(e) => setDetectorId(e.target.value)} required>
          {detectores.map((d) => <option key={d.id} value={d.id}>{d.linha}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Momento do teste">
          <Select name="tipo_teste" defaultValue="durante_producao">
            {TIPO_TESTE_DM.map((t) => <option key={t} value={t}>{TIPO_TESTE_DM_LABEL[t]}</option>)}
          </Select>
        </Field>
        <Field label="Lote em produção">
          <Select name="lote_id" defaultValue="">
            <option value="">—</option>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.codigo}</option>)}
          </Select>
        </Field>
      </div>
      <div className="space-y-1.5">
        <Corpo label={`Ferroso ${det?.ferroso_mm ?? ''} mm`} v={fe} set={setFe} />
        <Corpo label={`Não ferroso ${det?.nao_ferroso_mm ?? ''} mm`} v={nf} set={setNf} />
        <Corpo label={`Aço inox ${det?.inox_mm ?? ''} mm`} v={inox} set={setInox} />
      </div>
      <Field label="Observações (troca de produto: horário e novo produto)">
        <TextInput name="observacao" />
      </Field>

      {!conforme && (
        <div className="space-y-2.5 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700">Atividade de correção — corpo de prova não detectado/rejeitado</p>
          <Field label="Nome do líder informado"><TextInput name="lider_informado" /></Field>
          <SimNao label="Linha foi parada?" valor={linhaParada} onChange={setLinhaParada} />
          <SimNao label="Manutenção informada?" valor={manutInformada} onChange={setManutInformada} />
          <SimNao label="A produção do período afetado foi retida?" valor={retida} onChange={setRetida} />
          <SimNao label="Houve necessidade de validação do equipamento?" valor={validacaoEquip} onChange={setValidacaoEquip} />
          <Field label="Responsável CQ pela retenção"><TextInput name="responsavel_retencao" /></Field>
          <Field label="Ação corretiva"><TextInput name="acao_corretiva" placeholder="O que foi feito" /></Field>
          <label className="flex items-center gap-2 text-[12.5px] text-slate-700">
            <input type="checkbox" checked={abrirOs} onChange={(e) => setAbrirOs(e.target.checked)} />
            Abrir O.S. para a manutenção (com risco à segurança de alimentos)
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={salvando} className="flex-1">Registrar teste</Button>
        <Button type="button" variant="outline" disabled={salvando} onClick={() => void nhp()}
          title="Não houve produção neste horário">NHP</Button>
      </div>
    </form>
  );
}

// Um corpo de prova: detecta e rejeita, ou não.
function Corpo({ label, v, set }: { label: string; v: boolean; set: (b: boolean) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
      <span className="text-[12.5px] text-slate-700">{label}</span>
      <span className="flex gap-1">
        {([true, false] as const).map((b) => (
          <button key={String(b)} type="button" aria-pressed={v === b} onClick={() => set(b)}
            className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
              v === b ? (b ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-red-600 bg-red-600 text-white')
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}>
            {b ? 'Detecta e rejeita' : 'Não detecta'}
          </button>
        ))}
      </span>
    </div>
  );
}
