// Monitoramento ambiental & pragas (FSSC 22000 — zonas de higiene).
export const MATRIZ_AMBIENTAL = ['superficie', 'ar', 'agua'] as const;
export type MatrizAmbiental = (typeof MATRIZ_AMBIENTAL)[number];
export const MATRIZ_AMBIENTAL_LABEL: Record<MatrizAmbiental, string> = {
  superficie: 'Superfície (swab)',
  ar: 'Ar',
  agua: 'Água',
};

export interface PontoAmostragem {
  id: string;
  org_id: string;
  patogeno: string | null;
  area: string;
  ponto_numero: string | null;
  zona: string | null;
  metodo_limpeza: string | null;
  frequencia: string | null;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface MonitoramentoAmbiental {
  id: string;
  org_id: string;
  ponto_id: string;
  matriz: MatrizAmbiental;
  ensaio: string | null;
  enviado_em: string;
  proxima_em: string | null;
  resultado: string | null;
  limite: string | null;
  conforme: boolean;
  responsavel_id: string | null;
  registrado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovoPontoAmostragem {
  patogeno?: string | null;
  area: string;
  ponto_numero?: string | null;
  zona?: string | null;
  metodo_limpeza?: string | null;
  frequencia?: string | null;
  descricao?: string | null;
}

export interface NovoMonitoramentoAmbiental {
  ponto_id: string;
  matriz?: MatrizAmbiental;
  ensaio?: string | null;
  enviado_em?: string;
  proxima_em?: string | null;
  resultado?: string | null;
  limite?: string | null;
  conforme: boolean;
}

// Situação de envio com base na próxima data programada.
export type SituacaoEnvio = 'em_dia' | 'a_vencer' | 'em_atraso' | 'sem_previsao';
export function situacaoEnvio(proximaEm: string | null, hoje = new Date()): SituacaoEnvio {
  if (!proximaEm) return 'sem_previsao';
  const p = new Date(proximaEm);
  if (Number.isNaN(p.getTime())) return 'sem_previsao';
  const dias = Math.floor((p.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return 'em_atraso';
  if (dias <= 15) return 'a_vencer';
  return 'em_dia';
}
export const SITUACAO_ENVIO_LABEL: Record<SituacaoEnvio, string> = {
  em_dia: 'Em dia',
  a_vencer: 'A vencer',
  em_atraso: 'Em atraso',
  sem_previsao: 'Sem previsão',
};
