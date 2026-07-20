// Value-object: estados possíveis de um lote (espelha o CHECK em producao.lotes).
export const STATUS_LOTE = [
  'em_processo',
  'aguardando_liberacao',
  'liberado',
  'bloqueado',
  'expedido',
  'cancelado',
] as const;

export type StatusLote = (typeof STATUS_LOTE)[number];

export const STATUS_LOTE_LABEL: Record<StatusLote, string> = {
  em_processo: 'Em processo',
  aguardando_liberacao: 'Aguardando liberação',
  liberado: 'Liberado',
  bloqueado: 'Bloqueado',
  expedido: 'Expedido',
  cancelado: 'Cancelado',
};

// "Tom" semântico do status — a camada de UI mapeia para cores.
export type Tom = 'neutro' | 'info' | 'sucesso' | 'alerta' | 'erro';

export const STATUS_LOTE_TOM: Record<StatusLote, Tom> = {
  em_processo: 'info',
  aguardando_liberacao: 'alerta',
  liberado: 'sucesso',
  bloqueado: 'erro',
  expedido: 'neutro',
  cancelado: 'neutro',
};

export function isStatusLote(v: unknown): v is StatusLote {
  return typeof v === 'string' && (STATUS_LOTE as readonly string[]).includes(v);
}
