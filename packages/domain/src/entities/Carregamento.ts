// ERP — Expedição & Carregamentos. Fecha o ciclo pedido → lote → carga.
// Registrar um carregamento dá baixa no estoque e marca o pedido carregado.
export const STATUS_CARGA = ['carregado', 'cancelado'] as const;
export type StatusCarga = (typeof STATUS_CARGA)[number];

export const STATUS_CARGA_LABEL: Record<StatusCarga, string> = {
  carregado: 'Carregado',
  cancelado: 'Cancelado',
};
export const STATUS_CARGA_TOM: Record<StatusCarga, string> = {
  carregado: 'sucesso',
  cancelado: 'erro',
};

export interface Carregamento {
  id: string;
  org_id: string;
  numero: number;
  pedido_id: string | null;
  lote_id: string | null;
  posicao_id: string | null;
  produto_id: string | null;
  cliente_id: string | null;
  qtd_bags: number | null;
  peso_kg: number | null;
  placa: string | null;
  motorista: string | null;
  transportadora: string | null;
  nota_fiscal: string | null;
  status: StatusCarga;
  data: string;
  observacoes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovoCarregamento {
  pedido_id?: string | null;
  lote_id?: string | null;
  posicao_id?: string | null;
  produto_id?: string | null;
  cliente_id?: string | null;
  qtd_bags?: number | null;
  peso_kg?: number | null;
  placa?: string | null;
  motorista?: string | null;
  transportadora?: string | null;
  nota_fiscal?: string | null;
  data: string;
  observacoes?: string | null;
}
