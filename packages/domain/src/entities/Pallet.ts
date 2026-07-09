// ERP — Pallets (CHEP + próprios). Saldo por tipo + movimentos.
export const TIPO_PALLET = ['chep', 'pbr', 'proprio'] as const;
export type TipoPallet = (typeof TIPO_PALLET)[number];

export const TIPO_PALLET_LABEL: Record<TipoPallet, string> = {
  chep: 'CHEP',
  pbr: 'PBR',
  proprio: 'Próprio',
};

export const MOV_PALLET = ['recebido', 'devolvido', 'enviado', 'ajuste'] as const;
export type TipoMovPallet = (typeof MOV_PALLET)[number];

export const MOV_PALLET_LABEL: Record<TipoMovPallet, string> = {
  recebido: 'Recebido',
  devolvido: 'Devolvido',
  enviado: 'Enviado c/ carga',
  ajuste: 'Ajuste',
};

export interface Pallet {
  id: string;
  org_id: string;
  tipo: TipoPallet;
  saldo: number;
  created_at: string;
  created_by: string | null;
}

export interface MovimentoPallet {
  id: string;
  org_id: string;
  pallet_id: string;
  tipo_mov: TipoMovPallet;
  quantidade: number;
  parceiro: string | null;
  carregamento_id: string | null;
  data: string;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovoMovimentoPallet {
  pallet_id: string;
  tipo_mov: TipoMovPallet;
  quantidade: number;
  parceiro?: string | null;
  carregamento_id?: string | null;
  data?: string;
  observacao?: string | null;
}

// Em poder de terceiros = Σ enviado − Σ devolvido (relevante p/ reconciliar CHEP).
export function palletsEmTerceiros(movs: Pick<MovimentoPallet, 'tipo_mov' | 'quantidade'>[]): number {
  return movs.reduce((acc, m) => {
    if (m.tipo_mov === 'enviado') return acc + m.quantidade;
    if (m.tipo_mov === 'devolvido') return acc - m.quantidade;
    return acc;
  }, 0);
}
