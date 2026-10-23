// Painel da Qualidade: indicadores do período a partir dos registros que já
// existem — análises de bag por cliente e PCC do processo (forno, detector, ímãs).
import type { AnaliseProcesso, AnaliseProcessoValor } from './AnaliseProcesso';
import type { FornoLeitura, LimitesForno } from './Forno';
import { desviosLeituraForno } from './Forno';
import type { VerificacaoDM, VerificacaoIma } from './PccFisico';
import { DM_INTERVALO_MIN } from './PccFisico';

export interface EnsaioResumo { ensaio: string; media: number | null; fora: number; n: number }

export interface GrupoCliente {
  cliente_id: string | null;
  tipo_farinha: string | null;
  analises: number;
  aprovadas: number;
  lotes: number;
  ensaios: EnsaioResumo[];
}

const pct = (a: number, b: number) => (b === 0 ? null : (a / b) * 100);
export const percentual = pct;

/** Análises do período agrupadas por cliente × tipo de farinha. */
export function indicadoresPorCliente(
  analises: Pick<AnaliseProcesso, 'id' | 'cliente_id' | 'tipo_farinha' | 'conforme' | 'lote_codigo' | 'lote_id'>[],
  valores: Pick<AnaliseProcessoValor, 'analise_id' | 'ensaio' | 'valor' | 'conforme' | 'ordem'>[],
): GrupoCliente[] {
  const grupoDe = new Map<string, string>();
  const grupos = new Map<string, GrupoCliente & { _lotes: Set<string>; _e: Map<string, { s: number; n: number; fora: number; ordem: number }> }>();
  for (const a of analises) {
    const k = `${a.cliente_id ?? ''}|${a.tipo_farinha ?? ''}`;
    grupoDe.set(a.id, k);
    const g = grupos.get(k) ?? { cliente_id: a.cliente_id, tipo_farinha: a.tipo_farinha, analises: 0, aprovadas: 0, lotes: 0, ensaios: [], _lotes: new Set(), _e: new Map() };
    g.analises++;
    if (a.conforme) g.aprovadas++;
    const lote = a.lote_codigo ?? a.lote_id;
    if (lote) g._lotes.add(lote);
    grupos.set(k, g);
  }
  for (const v of valores) {
    const g = grupos.get(grupoDe.get(v.analise_id) ?? '');
    if (!g) continue;
    const e = g._e.get(v.ensaio) ?? { s: 0, n: 0, fora: 0, ordem: v.ordem };
    if (v.valor != null) { e.s += Number(v.valor); e.n++; }
    if (v.conforme === false) e.fora++;
    g._e.set(v.ensaio, e);
  }
  return [...grupos.values()]
    .map(({ _lotes, _e, ...g }) => ({
      ...g,
      lotes: _lotes.size,
      ensaios: [..._e.entries()].sort((a, b) => a[1].ordem - b[1].ordem)
        .map(([ensaio, e]) => ({ ensaio, media: e.n ? e.s / e.n : null, fora: e.fora, n: e.n })),
    }))
    .sort((a, b) => b.analises - a.analises);
}

/** % de análises aprovadas por dia (dias sem análise ficam de fora). */
export function aprovacaoPorDia(analises: Pick<AnaliseProcesso, 'data' | 'conforme'>[]): { dia: string; n: number; aprovadas: number }[] {
  const m = new Map<string, { n: number; aprovadas: number }>();
  for (const a of analises) {
    const d = m.get(a.data) ?? { n: 0, aprovadas: 0 };
    d.n++;
    if (a.conforme) d.aprovadas++;
    m.set(a.data, d);
  }
  return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, d]) => ({ dia, ...d }));
}

export interface IndicadoresPcc {
  forno: { leituras: number; desvios: number; temSaida: number | null; umidade: number | null };
  detector: { testes: number; falhas: number; nhp: number; atrasos: number };
  imas: { verificacoes: number; comMaterial: number; gramas: number };
}

/**
 * PCC do período. Atraso do detector: intervalo entre dois testes seguidos do
 * mesmo detector, no mesmo dia, acima de 2 h + 15 min de tolerância.
 */
export function indicadoresPcc(
  leituras: Pick<FornoLeitura, 'temp_saida' | 'umidade'>[],
  limites: LimitesForno,
  dm: Pick<VerificacaoDM, 'detector_id' | 'registrado_em' | 'conforme' | 'nhp'>[],
  imas: Pick<VerificacaoIma, 'tem_material' | 'peso_g' | 'nhp'>[],
): IndicadoresPcc {
  const media = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const testes = dm.filter((v) => !v.nhp);
  let atrasos = 0;
  const porDet = new Map<string, number[]>();
  for (const v of testes) {
    const k = `${v.detector_id}|${v.registrado_em.slice(0, 10)}`;
    porDet.set(k, [...(porDet.get(k) ?? []), new Date(v.registrado_em).getTime()]);
  }
  for (const ts of porDet.values()) {
    ts.sort((a, b) => a - b);
    for (let i = 1; i < ts.length; i++) if (ts[i]! - ts[i - 1]! > (DM_INTERVALO_MIN + 15) * 60_000) atrasos++;
  }
  const imasOk = imas.filter((v) => !v.nhp);
  return {
    forno: {
      leituras: leituras.length,
      desvios: leituras.filter((l) => desviosLeituraForno(l, limites).length > 0).length,
      temSaida: media(leituras.map((l) => l.temp_saida)),
      umidade: media(leituras.map((l) => l.umidade)),
    },
    detector: { testes: testes.length, falhas: testes.filter((v) => !v.conforme).length, nhp: dm.length - testes.length, atrasos },
    imas: {
      verificacoes: imasOk.length,
      comMaterial: imasOk.filter((v) => v.tem_material).length,
      gramas: imasOk.reduce((s, v) => s + (v.peso_g ?? 0), 0),
    },
  };
}
