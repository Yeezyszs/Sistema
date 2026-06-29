// Instrumentos e calibrações (schema qualidade) — afetam medições/PCC.
export const TIPO_CALIBRACAO = ['calibracao', 'verificacao', 'phmetro'] as const;
export type TipoCalibracao = (typeof TIPO_CALIBRACAO)[number];
export const TIPO_CALIBRACAO_LABEL: Record<TipoCalibracao, string> = {
  calibracao: 'Calibração (externa)',
  verificacao: 'Verificação interna',
  phmetro: 'Calibração de pHmetro',
};

export interface Instrumento {
  id: string;
  org_id: string;
  codigo: string;
  nome: string;
  equipamento_id: string | null;
  faixa: string | null;
  criterio_aceitacao: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface Calibracao {
  id: string;
  org_id: string;
  instrumento_id: string;
  tipo: TipoCalibracao;
  calibrado_em: string;
  valido_ate: string | null;
  empresa: string | null;
  certificado_numero: string | null;
  incerteza: string | null;
  conforme: boolean;
  observacao: string | null;
  anexo_url: string | null;
  registrado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovoInstrumento {
  codigo: string;
  nome: string;
  equipamento_id?: string | null;
  faixa?: string | null;
  criterio_aceitacao?: string | null;
}

export interface NovaCalibracao {
  instrumento_id: string;
  tipo?: TipoCalibracao;
  calibrado_em: string;
  valido_ate?: string | null;
  empresa?: string | null;
  certificado_numero?: string | null;
  incerteza?: string | null;
  conforme: boolean;
  observacao?: string | null;
}

// Situação da validade da calibração mais recente.
export type SituacaoCalibracao = 'vigente' | 'a_vencer' | 'vencida' | 'sem_registro';

export function situacaoCalibracao(validoAte: string | null, hoje = new Date()): SituacaoCalibracao {
  if (!validoAte) return 'sem_registro';
  const v = new Date(validoAte);
  if (Number.isNaN(v.getTime())) return 'sem_registro';
  const dias = Math.floor((v.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return 'vencida';
  if (dias <= 30) return 'a_vencer';
  return 'vigente';
}

export const SITUACAO_CALIBRACAO_LABEL: Record<SituacaoCalibracao, string> = {
  vigente: 'Vigente',
  a_vencer: 'A vencer (≤30d)',
  vencida: 'Vencida',
  sem_registro: 'Sem calibração',
};
