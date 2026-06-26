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
