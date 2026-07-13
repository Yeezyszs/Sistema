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
  cliente_id: string | null;
  lote_id: string | null;
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
  cliente_id?: string | null;
  lote_id?: string | null;
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
