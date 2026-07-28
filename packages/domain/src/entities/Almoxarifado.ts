// Almoxarifado — estoque de consumíveis (peças de manutenção, limpeza, EPI).
export const CATEGORIA_ALMOX = ['pecas_manutencao', 'limpeza_higiene', 'epi', 'embalagem'] as const;
export type CategoriaAlmox = (typeof CATEGORIA_ALMOX)[number];
export const CATEGORIA_ALMOX_LABEL: Record<CategoriaAlmox, string> = {
  pecas_manutencao: 'Peças de manutenção',
  limpeza_higiene: 'Limpeza & higiene',
  epi: 'EPI',
  embalagem: 'Embalagem',
};

export const UNIDADE_ALMOX = ['un', 'kg', 'L', 'm', 'par', 'cx', 'pct'] as const;

export interface AlmoxItem {
  id: string;
  org_id: string;
  codigo: string | null;
  nome: string;
  categoria: CategoriaAlmox;
  unidade: string;
  estoque_minimo: number;
  localizacao: string | null;
  saldo: number;
  custo_medio: number;
  capacidade_kg: number | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovoAlmoxItem {
  codigo?: string | null;
  nome: string;
  categoria: CategoriaAlmox;
  unidade?: string;
  estoque_minimo?: number;
  localizacao?: string | null;
  capacidade_kg?: number | null;
}
export type AtualizacaoAlmoxItem = Partial<NovoAlmoxItem> & { ativo?: boolean };

export const TIPO_MOV_ALMOX = ['entrada', 'saida', 'ajuste', 'consumo'] as const;
export type TipoMovAlmox = (typeof TIPO_MOV_ALMOX)[number];
// Tipos lançados manualmente na tela (consumo é gerado automaticamente).
export const TIPO_MOV_ALMOX_MANUAL = ['entrada', 'saida', 'ajuste'] as const;
export const TIPO_MOV_ALMOX_LABEL: Record<TipoMovAlmox, string> = {
  entrada: 'Entrada',
  saida: 'Saída (requisição)',
  ajuste: 'Ajuste de inventário',
  consumo: 'Consumo (produção)',
};

export interface AlmoxMovimento {
  id: string;
  org_id: string;
  item_id: string;
  tipo: TipoMovAlmox;
  quantidade: number;
  valor_unitario: number | null;
  setor: string | null;
  solicitante: string | null;
  fornecedor: string | null;
  nota_fiscal: string | null;
  observacao: string | null;
  lote_id: string | null;
  origem: string | null;
  data: string;
  created_at: string;
  created_by: string | null;
}

export interface NovoAlmoxMovimento {
  item_id: string;
  tipo: TipoMovAlmox;
  quantidade: number;
  valor_unitario?: number | null;
  setor?: string | null;
  solicitante?: string | null;
  fornecedor?: string | null;
  nota_fiscal?: string | null;
  observacao?: string | null;
  data: string;
}

// Item abaixo (ou no) estoque mínimo.
export function abaixoDoMinimo(item: Pick<AlmoxItem, 'saldo' | 'estoque_minimo'>): boolean {
  return item.estoque_minimo > 0 && item.saldo <= item.estoque_minimo;
}
