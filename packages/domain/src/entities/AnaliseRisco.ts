// Análise de risco (coringa) — Food Defense, Food Fraud e APPCC.
// Cada tipo usa eixos próprios de nota (1–3) que se combinam num risco.
export const TIPO_ANALISE_RISCO = ['food_defense', 'food_fraud', 'appcc'] as const;
export type TipoAnaliseRisco = (typeof TIPO_ANALISE_RISCO)[number];

export const TIPO_ANALISE_RISCO_LABEL: Record<TipoAnaliseRisco, string> = {
  food_defense: 'Food Defense (ataque intencional)',
  food_fraud: 'Food Fraud (fraude/adulteração)',
  appcc: 'APPCC (análise de perigos)',
};

export interface AnaliseRisco {
  id: string;
  org_id: string;
  tipo: TipoAnaliseRisco;
  titulo: string;
  contexto: string | null;
  descricao: string | null;
  eixos: Record<string, number>;
  risco: number | null;
  classificacao: string | null;
  necessita_mitigacao: boolean;
  mitigacao: string | null;
  avaliado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovaAnaliseRisco {
  tipo: TipoAnaliseRisco;
  titulo: string;
  contexto?: string | null;
  descricao?: string | null;
  eixos: Record<string, number>;
  risco: number | null;
  classificacao: string | null;
  necessita_mitigacao: boolean;
  mitigacao?: string | null;
}

// Definição dos eixos por tipo (rótulo + chave).
export const EIXOS_POR_TIPO: Record<TipoAnaliseRisco, { chave: string; rotulo: string }[]> = {
  food_defense: [
    { chave: 'acessibilidade', rotulo: 'Acessibilidade' },
    { chave: 'deteccao', rotulo: 'Dificuldade de detecção' },
    { chave: 'reconhecibilidade', rotulo: 'Reconhecibilidade' },
  ],
  food_fraud: [
    { chave: 'oportunidade', rotulo: 'Oportunidade' },
    { chave: 'motivacao', rotulo: 'Motivação' },
  ],
  appcc: [
    { chave: 'severidade', rotulo: 'Severidade' },
    { chave: 'probabilidade', rotulo: 'Probabilidade' },
  ],
};

// Risco = produto das notas dos eixos.
export function calcularRisco(eixos: Record<string, number>): number {
  const vals = Object.values(eixos);
  if (vals.length === 0) return 0;
  return vals.reduce((acc, n) => acc * (n || 1), 1);
}

// Classificação por tipo a partir do risco.
export function classificarRisco(tipo: TipoAnaliseRisco, risco: number): string {
  if (tipo === 'food_defense') {
    if (risco < 3) return 'toleravel';
    if (risco <= 8) return 'moderado';
    return 'nao_toleravel';
  }
  if (tipo === 'appcc') {
    if (risco <= 2) return 'baixo';
    if (risco <= 4) return 'moderado';
    return 'significativo';
  }
  // food_fraud
  return risco >= 5 ? 'significativo' : 'nao_significativo';
}

export const CLASSIFICACAO_LABEL: Record<string, string> = {
  toleravel: 'Tolerável',
  moderado: 'Moderado',
  nao_toleravel: 'Não tolerável',
  significativo: 'Significativo',
  nao_significativo: 'Não significativo',
  baixo: 'Baixo',
};

export const CLASSIFICACAO_TOM: Record<string, string> = {
  toleravel: 'sucesso',
  baixo: 'sucesso',
  nao_significativo: 'sucesso',
  moderado: 'alerta',
  nao_toleravel: 'erro',
  significativo: 'erro',
};
