// Inspeção de recebimento e homologação de fornecedores (Fase 3).
export const TIPO_INSPECAO = ['mp', 'pallets', 'embalagem'] as const;
export type TipoInspecao = (typeof TIPO_INSPECAO)[number];
export const TIPO_INSPECAO_LABEL: Record<TipoInspecao, string> = {
  mp: 'Matéria-prima',
  pallets: 'Pallets',
  embalagem: 'Embalagem',
};

// Itens padrão por tipo de inspeção (semeiam o checklist na 1ª vez).
export const ITENS_INSPECAO: Record<TipoInspecao, string[]> = {
  mp: [
    'Carga coberta / protegida',
    'Ausência de corpos estranhos',
    'Ausência de impurezas visíveis',
    'Ausência de mandioca podre ou fermentada',
    'Veículo limpo e sem odor estranho',
    'Documentação / ticket conferido',
  ],
  pallets: [
    'Pallets íntegros (sem lascas/pregos expostos)',
    'Ausência de mofo ou umidade',
    'Ausência de pragas',
    'Dimensões e padrão conforme especificação',
  ],
  embalagem: [
    'Embalagem íntegra (sem furos/rasgos)',
    'Identificação / lote legível',
    'Ausência de sujidade ou contaminação',
    'Dentro do padrão de amostragem (AQL)',
  ],
};

export interface InspecaoRecebimento {
  id: string;
  org_id: string;
  tipo: TipoInspecao;
  recebimento_id: string | null;
  fornecedor_id: string | null;
  execucao_id: string | null;
  placa: string | null;
  ticket: string | null;
  variedade: string | null;
  conforme: boolean;
  observacao: string | null;
  inspecionado_em: string;
  created_at: string;
  created_by: string | null;
}

// ── Homologação de fornecedor ──────────────────────────────────
export const STATUS_HOMOLOGACAO = ['em_analise', 'qualificado', 'desqualificado'] as const;
export type StatusHomologacao = (typeof STATUS_HOMOLOGACAO)[number];
export const STATUS_HOMOLOGACAO_LABEL: Record<StatusHomologacao, string> = {
  em_analise: 'Em análise',
  qualificado: 'Qualificado',
  desqualificado: 'Desqualificado',
};
export const STATUS_HOMOLOGACAO_TOM: Record<StatusHomologacao, string> = {
  em_analise: 'alerta',
  qualificado: 'sucesso',
  desqualificado: 'erro',
};

export interface Homologacao {
  id: string;
  org_id: string;
  fornecedor_id: string;
  status: StatusHomologacao;
  pontuacao: number | null;
  classificacao: string | null;
  validade: string | null;
  observacao: string | null;
  avaliado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovaHomologacao {
  fornecedor_id: string;
  status: StatusHomologacao;
  pontuacao?: number | null;
  classificacao?: string | null;
  validade?: string | null;
  observacao?: string | null;
}

// Classificação A/B/C/D a partir da nota (índice de qualidade do fornecedor).
export function classificarFornecedor(nota: number): { letra: string; status: StatusHomologacao } {
  if (nota > 90) return { letra: 'A', status: 'qualificado' };
  if (nota >= 80) return { letra: 'B', status: 'qualificado' };
  if (nota >= 70) return { letra: 'C', status: 'qualificado' };
  return { letra: 'D', status: 'desqualificado' };
}
