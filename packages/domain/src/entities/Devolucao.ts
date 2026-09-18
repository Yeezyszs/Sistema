// Devolução de cliente — producao.devolucoes.
//
// Na planilha de faturamento a devolução era uma linha de valor negativo
// misturada às vendas. Aqui ela é registro próprio: o sinal deixa de ser regra
// de negócio e o motivo passa a existir, porque avaria no transporte e desvio
// de qualidade pedem ações diferentes — uma é conversa com a transportadora, a
// outra abre não conformidade.

export const MOTIVO_DEVOLUCAO = [
  'qualidade', 'avaria_transporte', 'erro_pedido', 'recusa_cliente', 'outro',
] as const;
export type MotivoDevolucao = (typeof MOTIVO_DEVOLUCAO)[number];

export const MOTIVO_DEVOLUCAO_LABEL: Record<MotivoDevolucao, string> = {
  qualidade: 'Desvio de qualidade',
  avaria_transporte: 'Avaria no transporte',
  erro_pedido: 'Erro no pedido',
  recusa_cliente: 'Recusa do cliente',
  outro: 'Outro',
};

export const MOTIVO_DEVOLUCAO_TOM: Record<MotivoDevolucao, string> = {
  qualidade: 'bg-red-100 text-red-700',
  avaria_transporte: 'bg-amber-100 text-amber-800',
  erro_pedido: 'bg-sky-100 text-sky-800',
  recusa_cliente: 'bg-violet-100 text-violet-800',
  outro: 'bg-slate-100 text-slate-600',
};

export interface Devolucao {
  id: string;
  org_id: string;
  numero: number | null;
  data: string;
  cliente_id: string | null;
  produto_id: string | null;
  /** Carga de origem, quando conhecida. Nem toda devolução tem: carga anterior
   *  ao sistema volta do mesmo jeito, e recusar o registro por falta de vínculo
   *  seria perder o dado que interessa. */
  carregamento_id: string | null;
  lote_id: string | null;
  peso_kg: number | null;
  /** Preço por quilo praticado na venda. */
  valor_rs: number | null;
  /** peso × valor, calculado no banco. */
  valor_total_rs: number | null;
  motivo: MotivoDevolucao;
  nota_fiscal: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovaDevolucao {
  data: string;
  cliente_id?: string | null;
  produto_id?: string | null;
  carregamento_id?: string | null;
  lote_id?: string | null;
  peso_kg?: number | null;
  valor_rs?: number | null;
  motivo?: MotivoDevolucao;
  nota_fiscal?: string | null;
  observacao?: string | null;
}

/**
 * Venda líquida do período: o que saiu menos o que voltou.
 * O percentual devolvido só existe quando houve venda — dividir por zero para
 * mostrar "0%" esconderia que não houve venda nenhuma.
 */
export function resumoVendas(vendido: number, devolvido: number): {
  liquido: number;
  percentualDevolvido: number | null;
} {
  return {
    liquido: vendido - devolvido,
    percentualDevolvido: vendido > 0 ? (devolvido / vendido) * 100 : null,
  };
}
