// ERP — Pedidos (Clientes). Cada linha é um item de pedido (a "carga").
// Substitui a planilha com 1 aba por cliente → 1 tabela com cliente como FK.

// Estado 1: aprovação
export const STATUS_PEDIDO = ['pendente', 'aprovado', 'cancelado'] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];
export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  cancelado: 'Cancelado',
};
export const STATUS_PEDIDO_TOM: Record<StatusPedido, string> = {
  pendente: 'alerta',
  aprovado: 'sucesso',
  cancelado: 'erro',
};

// Estado 2: atendimento
export const SITUACAO_PEDIDO = ['pendente', 'parcial', 'completo', 'carregado'] as const;
export type SituacaoPedido = (typeof SITUACAO_PEDIDO)[number];
export const SITUACAO_PEDIDO_LABEL: Record<SituacaoPedido, string> = {
  pendente: 'Pendente',
  parcial: 'Parcial',
  completo: 'Completo',
  carregado: 'Carregado',
};
export const SITUACAO_PEDIDO_TOM: Record<SituacaoPedido, string> = {
  pendente: 'neutro',
  parcial: 'alerta',
  completo: 'info',
  carregado: 'sucesso',
};

export interface Pedido {
  id: string;
  org_id: string;
  numero: number;
  cliente_id: string | null;
  produto_id: string | null;
  lote_id: string | null;
  status: StatusPedido;
  situacao: SituacaoPedido;
  data: string;
  destino: string | null;
  observacoes: string | null;
  valor_rs: number | null; // preço por kg
  peso_carga_kg: number | null;
  valor_total_rs: number | null; // = valor_rs * peso_carga_kg (gerado no banco)
  created_at: string;
  created_by: string | null;
}

export interface NovoPedido {
  cliente_id?: string | null;
  produto_id?: string | null;
  lote_id?: string | null;
  status?: StatusPedido;
  situacao?: SituacaoPedido;
  data: string;
  destino?: string | null;
  observacoes?: string | null;
  valor_rs?: number | null;
  peso_carga_kg?: number | null;
}

export function valorTotalPedido(valorRs: number | null, pesoKg: number | null): number | null {
  if (valorRs == null || pesoKg == null) return null;
  return valorRs * pesoKg;
}
