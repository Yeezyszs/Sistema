// Ordem de Produção (producao.ordens_producao) — espelha a planilha DB_OP.
export const STATUS_OP = ['aberta', 'em_processo', 'concluida'] as const;
export type StatusOP = (typeof STATUS_OP)[number];

export const STATUS_OP_LABEL: Record<StatusOP, string> = {
  aberta: 'Aberta',
  em_processo: 'Em processo',
  concluida: 'Concluída',
};

export const STATUS_OP_TOM: Record<StatusOP, string> = {
  aberta: 'info',
  em_processo: 'alerta',
  concluida: 'sucesso',
};

export interface OrdemProducao {
  id: string;
  org_id: string;
  numero: number;
  pedido: string | null;
  cliente_id: string | null;
  produto_id: string;
  data: string;
  quantidade: number | null;
  embalagem: string | null;
  qtd_embalagem: number | null;
  peso_min: number | null;
  peso_max: number | null;
  observacao: string | null;
  reprocessar: boolean;
  status: StatusOP;
  created_at: string;
  created_by: string | null;
}

export interface NovaOrdemProducao {
  pedido?: string | null;
  cliente_id?: string | null;
  produto_id: string;
  data: string;
  quantidade?: number | null;
  embalagem?: string | null;
  qtd_embalagem?: number | null;
  peso_min?: number | null;
  peso_max?: number | null;
  observacao?: string | null;
  reprocessar?: boolean;
}

export function isStatusOP(v: string): v is StatusOP {
  return (STATUS_OP as readonly string[]).includes(v);
}
