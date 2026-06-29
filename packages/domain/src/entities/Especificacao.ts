// Especificação de produto × cliente (limites de referência dos ensaios).
export interface Especificacao {
  id: string;
  org_id: string;
  produto_id: string;
  cliente_id: string | null;
  nome: string | null;
  shelf_life_dias: number | null;
  versao: number;
  vigente: boolean;
  created_at: string;
  created_by: string | null;
}

export interface EspecificacaoParametro {
  id: string;
  org_id: string;
  especificacao_id: string;
  ensaio: string;
  limite_min: number | null;
  limite_max: number | null;
  unidade: string | null;
  metodologia: string | null;
  ordem: number;
}

export interface NovaEspecificacao {
  produto_id: string;
  cliente_id?: string | null;
  nome?: string | null;
  shelf_life_dias?: number | null;
}

export interface NovoParametro {
  especificacao_id: string;
  ensaio: string;
  limite_min?: number | null;
  limite_max?: number | null;
  unidade?: string | null;
  metodologia?: string | null;
  ordem?: number;
}

// Verdadeiro se o valor está dentro dos limites do parâmetro.
export function parametroConforme(
  p: Pick<EspecificacaoParametro, 'limite_min' | 'limite_max'>,
  valor: number,
): boolean {
  if (p.limite_min != null && valor < p.limite_min) return false;
  if (p.limite_max != null && valor > p.limite_max) return false;
  return true;
}

export function limiteTexto(
  p: Pick<EspecificacaoParametro, 'limite_min' | 'limite_max' | 'unidade'>,
): string {
  const u = p.unidade ?? '';
  if (p.limite_min != null && p.limite_max != null) return `${p.limite_min} – ${p.limite_max} ${u}`.trim();
  if (p.limite_max != null) return `≤ ${p.limite_max} ${u}`.trim();
  if (p.limite_min != null) return `≥ ${p.limite_min} ${u}`.trim();
  return '—';
}
