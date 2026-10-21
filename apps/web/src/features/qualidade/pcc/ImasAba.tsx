// Verificação e limpeza dos ímãs (FOR PQSA 09 1.3): 1× ao dia, no início ou
// no fim do turno. Grade por área com todos os pontos do dia — o operador
// percorre a linha e preenche em sequência. Sem produção, NHP. Nenhum ponto
// pode ficar em branco: o que falta aparece como pendente.
import { useState } from 'react';
import { listImas, listVerificacoesImaDesde, criarVerificacoesIma } from '../../../lib/db';
import { useAsync } from '../../../lib/useAsync';
import { formatarData, hojeLocalISO } from '../../../lib/format';
import { AREAS_IMA, imasPendentesNoDia } from '@sistema/domain';
import type { Ima, VerificacaoIma, NovaVerificacaoIma } from '@sistema/domain';
import { Card, Spinner, Button, ErroCarregamento } from '../../../components/ui';
import { useToast } from '../../../components/Toast';
import { BotaoValidar, SeloValidacao, hora } from './comum';

interface Linha { material: boolean | null; peso: string; descricao: string; acao: string }
const VAZIA: Linha = { material: null, peso: '', descricao: '', acao: '' };

export function ImasAba() {
  const [recarregar, setRecarregar] = useState(0);
  const [area, setArea] = useState<string>(AREAS_IMA[0]);
  const rec = () => setRecarregar((n) => n + 1);
  const hoje = hojeLocalISO();
  const { data, loading, error } = useAsync(async () => {
    const desde = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [imas, verifs] = await Promise.all([listImas(), listVerificacoesImaDesde(desde)]);
    return { imas: imas.filter((i) => i.area), verifs };
  }, [recarregar]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-7 w-7 text-brand-600" /></div>;
  if (error) return <ErroCarregamento mensagem={error} />;
  if (!data) return null;

  const pendentesHoje = new Set(imasPendentesNoDia(data.imas, data.verifs, hoje));
  const aValidar = data.verifs.filter((v) => !v.validado_em).map((v) => v.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {AREAS_IMA.map((a) => {
          const pend = data.imas.filter((i) => i.area === a && pendentesHoje.has(i.id)).length;
          return (
            <button key={a} type="button" onClick={() => setArea(a)}
              className={`rounded-full border px-3.5 py-[7px] text-[12.5px] font-semibold transition ${
                area === a ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}>
              {a}
              <span className={`ml-1.5 rounded-full px-1.5 text-[10.5px] ${
                pend === 0 ? 'bg-emerald-500 text-white' : area === a ? 'bg-white/20' : 'bg-amber-100 text-amber-800'
              }`}>{pend === 0 ? '✓' : pend}</span>
            </button>
          );
        })}
        <span className="ml-auto"><BotaoValidar tabela="verificacoes_ima" ids={aValidar} rotulo="Validar pendentes" onFeito={rec} /></span>
      </div>

      <GradeArea key={`${area}-${recarregar}`} area={area} imas={data.imas.filter((i) => i.area === area)}
        verifsHoje={data.verifs.filter((v) => hojeLocalISO(new Date(v.registrado_em)) === hoje)} onSaved={rec} />

      <Historico imas={data.imas} verifs={data.verifs.filter((v) => hojeLocalISO(new Date(v.registrado_em)) !== hoje)} />
    </div>
  );
}

function GradeArea({ area, imas, verifsHoje, onSaved }: {
  area: string; imas: Ima[]; verifsHoje: VerificacaoIma[]; onSaved: () => void;
}) {
  const [linhas, setLinhas] = useState<Record<string, Linha>>({});
  const [salvando, setSalvando] = useState(false);
  const { sucesso, erro } = useToast();
  const feitos = new Map(verifsHoje.map((v) => [v.ima_id, v]));
  const pendentes = imas.filter((i) => !feitos.has(i.id));
  const set = (id: string, patch: Partial<Linha>) =>
    setLinhas((l) => ({ ...l, [id]: { ...(l[id] ?? VAZIA), ...patch } }));

  async function salvar(nhp: boolean) {
    const payload: NovaVerificacaoIma[] = [];
    for (const i of pendentes) {
      if (nhp) { payload.push({ ima_id: i.id, nhp: true }); continue; }
      const l = linhas[i.id];
      if (!l || l.material == null) continue;
      if (l.material && (!l.peso.trim() || !l.acao.trim())) {
        erro(`${i.local}: com material no ímã, informe o peso e a ação corretiva.`); return;
      }
      payload.push({
        ima_id: i.id, tem_material: l.material,
        peso_g: l.peso.trim() ? Number(l.peso.replace(',', '.')) : l.material ? null : 0,
        material: l.descricao.trim() || null, acao: l.acao.trim() || null,
      });
    }
    if (payload.length === 0) { erro('Marque "Material no ímã?" em ao menos um ponto.'); return; }
    setSalvando(true);
    try {
      await criarVerificacoesIma(payload);
      sucesso(nhp ? `NHP registrado em ${payload.length} ponto(s).` : `${payload.length} ponto(s) registrados.`);
      setLinhas({});
      onSaved();
    } catch (e) { erro(e instanceof Error ? e.message : 'Falha.'); }
    finally { setSalvando(false); }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">FOR PQSA 09 1.3 · hoje, {formatarData(hojeLocalISO())}</p>
          <p className="text-base font-semibold text-slate-900">{area}</p>
        </div>
        {pendentes.length > 0 && (
          <Button type="button" variant="outline" disabled={salvando} onClick={() => void salvar(true)}
            title="Não houve produção: marca os pontos pendentes desta área">
            NHP nos pendentes
          </Button>
        )}
      </div>
      <ul className="divide-y divide-slate-100">
        {imas.map((i) => {
          const v = feitos.get(i.id);
          const l = linhas[i.id] ?? VAZIA;
          return (
            <li key={i.id} className="py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-[10rem] flex-1 text-[13px] font-medium text-slate-800">{i.local}</span>
                {v ? (
                  <span className="flex items-center gap-2 text-[12px] text-slate-500">
                    {v.nhp ? 'NHP' : v.tem_material ? <span className="font-semibold text-amber-700">Material: {v.peso_g ?? '—'} g</span> : 'Sem material'}
                    <span>· {hora(v.registrado_em)}</span>
                    <SeloValidacao validadoEm={v.validado_em} />
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="mr-1 text-[11px] text-slate-400">Material no ímã?</span>
                    {([false, true] as const).map((b) => (
                      <button key={String(b)} type="button" aria-pressed={l.material === b} onClick={() => set(i.id, { material: b })}
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                          l.material === b ? (b ? 'border-amber-600 bg-amber-600 text-white' : 'border-emerald-600 bg-emerald-600 text-white')
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}>
                        {b ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </span>
                )}
              </div>
              {!v && l.material && (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input type="number" step="any" min="0" placeholder="Peso (g)" value={l.peso} onChange={(e) => set(i.id, { peso: e.target.value })}
                    className="rounded-[7px] border border-slate-300 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand-500" />
                  <input placeholder="Material (ex.: limalha)" value={l.descricao} onChange={(e) => set(i.id, { descricao: e.target.value })}
                    className="rounded-[7px] border border-slate-300 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand-500" />
                  <input placeholder="Ação corretiva" value={l.acao} onChange={(e) => set(i.id, { acao: e.target.value })}
                    className="rounded-[7px] border border-slate-300 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand-500" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {pendentes.length > 0 ? (
        <Button type="button" loading={salvando} className="mt-3 w-full" onClick={() => void salvar(false)}>
          Registrar verificação
        </Button>
      ) : (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-center text-[12.5px] font-semibold text-emerald-700">
          Todos os pontos desta área verificados hoje.
        </p>
      )}
    </Card>
  );
}

function Historico({ imas, verifs }: { imas: Ima[]; verifs: VerificacaoIma[] }) {
  if (verifs.length === 0) return null;
  const nome = new Map(imas.map((i) => [i.id, `${i.area} · ${i.local}`]));
  const comMaterial = verifs.filter((v) => v.tem_material);
  return (
    <Card className="p-4">
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Últimos 7 dias</p>
      <p className="text-[12.5px] text-slate-600">
        {verifs.length} verificações · {verifs.filter((v) => v.nhp).length} NHP ·{' '}
        <span className={comMaterial.length ? 'font-semibold text-amber-700' : ''}>{comMaterial.length} com material</span> ·{' '}
        {verifs.filter((v) => !v.validado_em).length} a validar
      </p>
      {comMaterial.length > 0 && (
        <ul className="mt-2 space-y-1 text-[12px] text-slate-600">
          {comMaterial.map((v) => (
            <li key={v.id}>
              {formatarData(v.registrado_em)} — {nome.get(v.ima_id) ?? 'ponto antigo'}: {v.peso_g ?? '—'} g
              {v.material ? ` (${v.material})` : ''}{v.acao ? ` · ação: ${v.acao}` : ''}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
