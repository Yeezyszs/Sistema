// PCP — Programação de Produção (grade turno × linha × dia + meta/real).
export const TURNO_PROD = ['1t', '2t'] as const;
export type TurnoProd = (typeof TURNO_PROD)[number];
export const TURNO_PROD_LABEL: Record<TurnoProd, string> = {
  '1t': '1º Turno',
  '2t': '2º Turno',
};

export interface Linha {
  id: string;
  org_id: string;
  codigo: string;
  nome: string | null;
  horas_disponiveis: number;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface Programacao {
  id: string;
  org_id: string;
  data: string;
  turno: TurnoProd;
  linha_id: string | null;
  produto_id: string | null;
  atividade: string | null;
  meta_kg: number | null;
  real_kg: number | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovaProgramacao {
  data: string;
  turno: TurnoProd;
  linha_id?: string | null;
  produto_id?: string | null;
  atividade?: string | null;
  meta_kg?: number | null;
  real_kg?: number | null;
  observacao?: string | null;
}

// ── Regras de negócio (movidas das fórmulas das planilhas) ─────
export const EFICIENCIA_PADRAO = 0.8;
export const CAPACIDADE_CAMINHAO_KG = 20000; // 1 carga = 20 t de raiz

// Meta = (Horas / Tempo_por_lote) * KG_por_lote * Eficiência
export function calcularMeta(
  horasDisponiveis: number,
  tempoPorLoteMin: number | null,
  kgPorLote: number | null,
  eficiencia = EFICIENCIA_PADRAO,
): number | null {
  if (!tempoPorLoteMin || !kgPorLote || tempoPorLoteMin <= 0) return null;
  const lotes = (horasDisponiveis * 60) / tempoPorLoteMin;
  return Math.round(lotes * kgPorLote * eficiencia);
}

export function atingimento(real: number | null, meta: number | null): number | null {
  if (meta == null || meta === 0 || real == null) return null;
  return real / meta;
}

export function gap(meta: number | null, real: number | null): number | null {
  if (meta == null) return null;
  return meta - (real ?? 0);
}

// Raiz necessária = Produção / Rendimento
export function raizNecessaria(producaoKg: number | null, rendimento: number | null): number | null {
  if (!producaoKg || !rendimento || rendimento <= 0) return null;
  return Math.round(producaoKg / rendimento);
}

// Nº de cargas = Raiz / capacidade do caminhão
export function numeroCargas(raizKg: number | null): number | null {
  if (!raizKg) return null;
  return Math.ceil(raizKg / CAPACIDADE_CAMINHAO_KG);
}
