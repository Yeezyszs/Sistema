// ERP — Embalagens: material de embalagem (big bag, sacaria, bag) com saldo.
export const MOV_EMBALAGEM = ['entrada', 'saida', 'consumo', 'ajuste'] as const;
export type TipoMovEmbalagem = (typeof MOV_EMBALAGEM)[number];

export const MOV_EMBALAGEM_LABEL: Record<TipoMovEmbalagem, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  consumo: 'Consumo',
  ajuste: 'Ajuste',
};

export interface Embalagem {
  id: string;
  org_id: string;
  nome: string;
  tipo: string | null;
  capacidade_kg: number | null;
  unidade: string;
  saldo: number;
  estoque_minimo: number | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovaEmbalagem {
  nome: string;
  tipo?: string | null;
  capacidade_kg?: number | null;
  unidade?: string;
  estoque_minimo?: number | null;
}

export interface MovimentoEmbalagem {
  id: string;
  org_id: string;
  embalagem_id: string;
  tipo: TipoMovEmbalagem;
  quantidade: number;
  origem: string | null;
  lote_id: string | null;
  data: string;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovoMovimentoEmbalagem {
  embalagem_id: string;
  tipo: TipoMovEmbalagem;
  quantidade: number;
  origem?: string | null;
  data?: string;
  observacao?: string | null;
}

// Verdadeiro quando o saldo furou o mínimo configurado.
export function embalagemAbaixoMinimo(e: Pick<Embalagem, 'saldo' | 'estoque_minimo'>): boolean {
  return e.estoque_minimo != null && e.saldo < e.estoque_minimo;
}
