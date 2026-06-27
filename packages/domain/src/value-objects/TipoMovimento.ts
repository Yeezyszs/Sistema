// Value-object: tipos de movimento no ledger de estoque (append-only).
export const TIPO_MOVIMENTO = [
  'entrada',
  'consumo',
  'producao',
  'saida',
  'ajuste',
] as const;

export type TipoMovimento = (typeof TIPO_MOVIMENTO)[number];

export const TIPO_MOVIMENTO_LABEL: Record<TipoMovimento, string> = {
  entrada: 'Entrada',
  consumo: 'Consumo',
  producao: 'Produção',
  saida: 'Saída',
  ajuste: 'Ajuste',
};

// Explicação curta de cada tipo — para o usuário não ver "números soltos".
export const TIPO_MOVIMENTO_DESCRICAO: Record<TipoMovimento, string> = {
  entrada: 'Matéria-prima recebida que entrou no estoque',
  consumo: 'Matéria-prima consumida para produzir este lote',
  producao: 'Produto acabado gerado por este lote',
  saida: 'Produto que saiu do estoque (expedição)',
  ajuste: 'Correção manual de saldo',
};

// Tom semântico para colorir o movimento (entra = positivo, sai = negativo).
export const TIPO_MOVIMENTO_TOM: Record<TipoMovimento, 'positivo' | 'negativo' | 'neutro'> = {
  entrada: 'positivo',
  producao: 'positivo',
  consumo: 'negativo',
  saida: 'negativo',
  ajuste: 'neutro',
};

// Sinal do movimento no saldo (entrada/produção somam; consumo/saída subtraem).
export function sinalMovimento(tipo: TipoMovimento): 1 | -1 | 0 {
  switch (tipo) {
    case 'entrada':
    case 'producao':
      return 1;
    case 'consumo':
    case 'saida':
      return -1;
    case 'ajuste':
      return 0;
  }
}
