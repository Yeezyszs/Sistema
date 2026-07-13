// Qualidade/Produção — Controle de Retidos (FOR-PQSA18).
// Material retido por desvio: fica "em estoque" até ser reprocessado/descartado.
export const STATUS_REPROCESSO = ['em_estoque', 'concluido'] as const;
export type StatusReprocesso = (typeof STATUS_REPROCESSO)[number];

export const STATUS_REPROCESSO_LABEL: Record<StatusReprocesso, string> = {
  em_estoque: 'Em estoque',
  concluido: 'Concluído',
};
export const STATUS_REPROCESSO_TOM: Record<StatusReprocesso, string> = {
  em_estoque: 'alerta',
  concluido: 'sucesso',
};

export const DESTINO_REPROCESSO = ['producao', 'descarte'] as const;
export type DestinoReprocesso = (typeof DESTINO_REPROCESSO)[number];

export const DESTINO_REPROCESSO_LABEL: Record<DestinoReprocesso, string> = {
  producao: 'Volta à produção',
  descarte: 'Descarte',
};

// Catálogo de desvios (a "Legenda de Desvios").
export interface Desvio {
  id: string;
  org_id: string;
  codigo: string;
  categoria: string | null;
  descricao: string;
  produto_afetado: string | null;
  onde_reprocessar: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovoDesvio {
  codigo: string;
  categoria?: string | null;
  descricao: string;
  produto_afetado?: string | null;
  onde_reprocessar?: string | null;
}

export interface Reprocesso {
  id: string;
  org_id: string;
  numero: number;
  lote_id: string | null;
  produto_id: string | null;
  lacre: string | null;
  qtd_bags: number | null;
  quantidade_kg: number | null;
  motivo: string;
  desvio_id: string | null;
  onde_reprocessar: string | null;
  descricao_ocorrencia: string | null;
  evidencia_url: string | null;
  origem: string | null;
  nc_id: string | null;
  status: StatusReprocesso;
  destino: DestinoReprocesso | null;
  lote_final: string | null;
  data: string;
  resolvido_em: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovoReprocesso {
  lote_id?: string | null;
  produto_id?: string | null;
  lacre?: string | null;
  qtd_bags?: number | null;
  quantidade_kg?: number | null;
  motivo: string;
  desvio_id?: string | null;
  onde_reprocessar?: string | null;
  descricao_ocorrencia?: string | null;
  evidencia_url?: string | null;
  origem?: string | null;
  nc_id?: string | null;
  destino?: DestinoReprocesso | null;
  lote_final?: string | null;
  data?: string;
  observacao?: string | null;
}
