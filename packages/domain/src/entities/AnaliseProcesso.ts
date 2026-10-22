// Qualidade — Acompanhamento de Processo: análise por bag contra a
// especificação vigente do cliente/produto.
export const TURNO_ANALISE = ['1t', '2t'] as const;
export type TurnoAnalise = (typeof TURNO_ANALISE)[number];
export const TURNO_ANALISE_LABEL: Record<TurnoAnalise, string> = {
  '1t': '1º Turno',
  '2t': '2º Turno',
};

export interface AnaliseProcesso {
  id: string;
  org_id: string;
  numero: number;
  data: string;
  horario: string | null;
  turno: string | null;
  produto_id: string | null;
  tipo_farinha: string | null;
  cliente_id: string | null;
  lote_id: string | null;
  lote_codigo: string | null; // código como veio da planilha/lote (nem sempre existe no sistema)
  origem: string | null; // 'Planilha FOR-CQ-00x' quando importado
  especificacao_id: string | null;
  numero_bag: string | null;
  cor: string | null;
  odor: string | null;
  aparencia: string | null;
  conforme: boolean;
  motivo: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface AnaliseProcessoValor {
  id: string;
  org_id: string;
  analise_id: string;
  ensaio: string;
  valor: number | null;
  unidade: string | null;
  limite_min: number | null;
  limite_max: number | null;
  conforme: boolean | null;
  ordem: number;
}

export interface NovaAnaliseProcesso {
  data: string;
  horario?: string | null;
  turno?: string | null;
  produto_id?: string | null;
  tipo_farinha?: string | null;
  cliente_id?: string | null;
  lote_id?: string | null;
  lote_codigo?: string | null;
  especificacao_id?: string | null;
  numero_bag?: string | null;
  cor?: string | null;
  odor?: string | null;
  aparencia?: string | null;
  conforme?: boolean;
  motivo?: string | null;
  observacao?: string | null;
}

export interface NovoAnaliseValor {
  ensaio: string;
  valor: number | null;
  unidade?: string | null;
  limite_min?: number | null;
  limite_max?: number | null;
  conforme?: boolean | null;
  ordem?: number;
}

// Conformidade de um valor contra limites min/max (ambos opcionais).
export function valorDentroDoLimite(
  limiteMin: number | null,
  limiteMax: number | null,
  valor: number | null,
): boolean | null {
  if (valor == null) return null;
  if (limiteMin != null && valor < limiteMin) return false;
  if (limiteMax != null && valor > limiteMax) return false;
  return true;
}

// ── Tipo de farinha (FOR-CQ-001 General Mills / FOR-CQ-002 Pódium) ──
// As planilhas de controle por cliente separam por tipo de farinha, não por
// SKU: a mesma especificação vale para o bag de 750 kg e o de 1.000 kg.
export const TIPO_FARINHA = ['crua', 'cinco', 'torrada', 'panificavel'] as const;
export type TipoFarinha = (typeof TIPO_FARINHA)[number];
export const TIPO_FARINHA_LABEL: Record<TipoFarinha, string> = {
  crua: 'Farinha crua',
  cinco: 'Farinha 5%',
  torrada: 'Farinha torrada',
  panificavel: 'Especial panificável',
};
// Cor esperada de cada tipo (sugestão no formulário).
export const COR_ESPERADA: Record<TipoFarinha, string> = {
  crua: 'Creme', cinco: 'Branco', torrada: 'Dourada', panificavel: 'Branca',
};

/** Deduz o tipo de farinha pelo nome do produto. "P/ torrar" ainda é crua. */
export function tipoFarinhaDoProduto(nome: string): TipoFarinha | null {
  const n = nome.toUpperCase();
  if (n.includes('PANIFIC')) return 'panificavel';
  if (n.includes('5%')) return 'cinco';
  if (n.includes('TORRADA')) return 'torrada';
  if (n.includes('CRUA') || n.includes('TORRAR') || n.includes('PENEIRA') || n.includes('P.')) return 'crua';
  return null;
}

export interface ResumoEnsaio {
  ensaio: string;
  n: number;
  min: number | null;
  max: number | null;
  media: number | null;
  foraDoLimite: number;
}

/**
 * Fechamento do lote: junta as análises de bag de um lote e resume cada
 * ensaio (mín/máx/média e quantas leituras saíram do limite).
 */
export function fechamentoDoLote(
  analises: Pick<AnaliseProcesso, 'id' | 'conforme'>[],
  valores: Pick<AnaliseProcessoValor, 'analise_id' | 'ensaio' | 'valor' | 'conforme' | 'ordem'>[],
): { analises: number; reprovadas: number; ensaios: ResumoEnsaio[]; aprovado: boolean } {
  const ids = new Set(analises.map((a) => a.id));
  const porEnsaio = new Map<string, { ordem: number; vals: number[]; fora: number }>();
  for (const v of valores) {
    if (!ids.has(v.analise_id)) continue;
    const e = porEnsaio.get(v.ensaio) ?? { ordem: v.ordem, vals: [], fora: 0 };
    if (v.valor != null) e.vals.push(Number(v.valor));
    if (v.conforme === false) e.fora++;
    porEnsaio.set(v.ensaio, e);
  }
  const ensaios = [...porEnsaio.entries()]
    .sort((a, b) => a[1].ordem - b[1].ordem)
    .map(([ensaio, e]) => ({
      ensaio,
      n: e.vals.length,
      min: e.vals.length ? Math.min(...e.vals) : null,
      max: e.vals.length ? Math.max(...e.vals) : null,
      media: e.vals.length ? e.vals.reduce((s, x) => s + x, 0) / e.vals.length : null,
      foraDoLimite: e.fora,
    }));
  const reprovadas = analises.filter((a) => !a.conforme).length;
  return { analises: analises.length, reprovadas, ensaios, aprovado: analises.length > 0 && reprovadas === 0 };
}
