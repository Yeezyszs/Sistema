// ERP/Qualidade — Reprocesso: fluxo de material que precisa retrabalho.
export const STATUS_REPROCESSO = ['pendente', 'resolvido'] as const;
export type StatusReprocesso = (typeof STATUS_REPROCESSO)[number];

export const STATUS_REPROCESSO_LABEL: Record<StatusReprocesso, string> = {
  pendente: 'Pendente',
  resolvido: 'Resolvido',
};
export const STATUS_REPROCESSO_TOM: Record<StatusReprocesso, string> = {
  pendente: 'alerta',
  resolvido: 'sucesso',
};

export const DESTINO_REPROCESSO = ['producao', 'descarte'] as const;
export type DestinoReprocesso = (typeof DESTINO_REPROCESSO)[number];

export const DESTINO_REPROCESSO_LABEL: Record<DestinoReprocesso, string> = {
  producao: 'Volta à produção',
  descarte: 'Descarte',
};

export interface Reprocesso {
  id: string;
  org_id: string;
  numero: number;
  lote_id: string | null;
  produto_id: string | null;
  qtd_bags: number | null;
  quantidade_kg: number | null;
  motivo: string;
  origem: string | null;
  nc_id: string | null;
  status: StatusReprocesso;
  destino: DestinoReprocesso | null;
  data: string;
  resolvido_em: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovoReprocesso {
  lote_id?: string | null;
  produto_id?: string | null;
  qtd_bags?: number | null;
  quantidade_kg?: number | null;
  motivo: string;
  origem?: string | null;
  nc_id?: string | null;
  destino?: DestinoReprocesso | null;
  data?: string;
  observacao?: string | null;
}
