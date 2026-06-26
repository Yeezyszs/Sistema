// Dados-mestre de produto (core.produtos).
export const TIPO_PRODUTO = [
  'materia_prima',
  'embalagem',
  'insumo',
  'produto_acabado',
] as const;

export type TipoProduto = (typeof TIPO_PRODUTO)[number];

export const TIPO_PRODUTO_LABEL: Record<TipoProduto, string> = {
  materia_prima: 'Matéria-prima',
  embalagem: 'Embalagem',
  insumo: 'Insumo',
  produto_acabado: 'Produto acabado',
};

export interface Produto {
  id: string;
  org_id: string;
  nome: string;
  tipo: TipoProduto;
  unidade: string;
  created_at: string;
  created_by: string | null;
}
