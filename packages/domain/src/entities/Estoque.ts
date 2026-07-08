// ERP — Estoque & Inventário: localização física + posição por lote.
export interface LocalEstoque {
  id: string;
  org_id: string;
  barracao: string;
  rua: string;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export type StatusPosicao = 'ocupado' | 'reprocesso';

export interface PosicaoEstoque {
  id: string;
  org_id: string;
  local_id: string;
  lote_id: string | null;
  produto_id: string | null;
  cliente_id: string | null;
  qtd_bags: number | null;
  status: StatusPosicao;
  alocado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovaPosicao {
  local_id: string;
  lote_id?: string | null;
  produto_id?: string | null;
  cliente_id?: string | null;
  qtd_bags?: number | null;
  status?: StatusPosicao;
}

// Rótulo da posição física (ex.: "B.1 - R.1").
export function posicaoLabel(local: Pick<LocalEstoque, 'barracao' | 'rua'>): string {
  return `${local.barracao} - ${local.rua}`;
}

// Peso em kg = qtd de bags × peso unitário (do cadastro do produto).
export function pesoEstoque(qtdBags: number | null, pesoUnitario: number | null): number | null {
  if (!qtdBags || !pesoUnitario) return null;
  return qtdBags * pesoUnitario;
}
