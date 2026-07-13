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

// ── Calibração diária do pHmetro (FOR-PQSA20) ──────────────────
export const PHMETRO_PH4_MIN = 3.8;
export const PHMETRO_PH4_MAX = 4.0;
export const PHMETRO_PH7_MIN = 6.8;
export const PHMETRO_PH7_MAX = 7.0;

export interface CalibracaoPhmetro {
  id: string;
  org_id: string;
  data: string;
  hora: string | null;
  tampao_ph4: number | null;
  tampao_ph7: number | null;
  conforme: boolean;
  responsavel: string | null;
  validado_por: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovaCalibracaoPhmetro {
  data: string;
  hora?: string | null;
  tampao_ph4?: number | null;
  tampao_ph7?: number | null;
  responsavel?: string | null;
  validado_por?: string | null;
  observacao?: string | null;
}

// Mesma regra do trigger, para pré-avaliação no formulário.
export function phmetroConforme(ph4: number | null, ph7: number | null): boolean {
  const ph4Ok = ph4 == null || (ph4 >= PHMETRO_PH4_MIN && ph4 <= PHMETRO_PH4_MAX);
  const ph7Ok = ph7 == null || (ph7 >= PHMETRO_PH7_MIN && ph7 <= PHMETRO_PH7_MAX);
  return ph4Ok && ph7Ok;
}
