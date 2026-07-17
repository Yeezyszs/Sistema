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
  codigo: string | null; // código curto de PCP (P.10, P.16...)
  nome_curto: string | null; // apelido para exibição compacta (ex.: "P16 5%")
  tipo: TipoProduto;
  unidade: string;
  // Parâmetros de PCP (planejamento) — opcionais
  variacao_acabamento: string | null;
  kg_por_lote: number | null;
  tempo_por_lote_min: number | null;
  rendimento: number | null; // raiz→produto (~0,27)
  peso_unitario: number | null; // kg por bag/saca
  ativo: boolean;
  cliente_rotulo: string | null; // cliente da planilha de códigos
  umidade_faixa: string | null; // ex.: "10% A 11,5%"
  created_at: string;
  created_by: string | null;
}

// Localiza um produto pelo código digitado (comparação exata, sem espaços).
export function produtoPorCodigo<T extends Pick<Produto, 'codigo'>>(
  produtos: T[],
  codigo: string,
): T | null {
  const c = codigo.trim();
  if (!c) return null;
  return produtos.find((p) => p.codigo != null && p.codigo.trim() === c) ?? null;
}
