// PCC Físico — detector de metais, imãs e quebra de vidros (FSSC 22000).

// ── Detector de metais ─────────────────────────────────────────
export const TIPO_TESTE_DM = [
  'inicio_producao',
  'apos_parada',
  'apos_manutencao',
  'troca_produto',
  'durante_producao',
  'final_producao',
] as const;
export type TipoTesteDM = (typeof TIPO_TESTE_DM)[number];

export const TIPO_TESTE_DM_LABEL: Record<TipoTesteDM, string> = {
  inicio_producao: 'Início de produção',
  apos_parada: 'Após parada',
  apos_manutencao: 'Após manutenção do DM',
  troca_produto: 'Troca de produto',
  durante_producao: 'Durante a produção',
  final_producao: 'Final de produção',
};

export interface DetectorMetais {
  id: string;
  org_id: string;
  equipamento_id: string | null;
  linha: string;
  ferroso_mm: number;
  nao_ferroso_mm: number;
  inox_mm: number;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface VerificacaoDM {
  id: string;
  org_id: string;
  detector_id: string;
  lote_id: string | null;
  tipo_teste: TipoTesteDM;
  resultado_ferroso: boolean;
  resultado_nao_ferroso: boolean;
  resultado_inox: boolean;
  conforme: boolean;
  acao_corretiva: string | null;
  operador_id: string | null;
  registrado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovaVerificacaoDM {
  detector_id: string;
  lote_id?: string | null;
  tipo_teste: TipoTesteDM;
  resultado_ferroso: boolean;
  resultado_nao_ferroso: boolean;
  resultado_inox: boolean;
  conforme: boolean;
  acao_corretiva?: string | null;
  operador_id?: string | null;
}

// Conforme quando os três corpos de prova são detectados/rejeitados.
export function dmConforme(
  r: Pick<NovaVerificacaoDM, 'resultado_ferroso' | 'resultado_nao_ferroso' | 'resultado_inox'>,
): boolean {
  return r.resultado_ferroso && r.resultado_nao_ferroso && r.resultado_inox;
}

// ── Imãs ───────────────────────────────────────────────────────
export interface Ima {
  id: string;
  org_id: string;
  setor_id: string | null;
  local: string;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface VerificacaoIma {
  id: string;
  org_id: string;
  ima_id: string;
  peso_g: number | null;
  material: string | null;
  acao: string | null;
  responsavel_id: string | null;
  registrado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovaVerificacaoIma {
  ima_id: string;
  peso_g?: number | null;
  material?: string | null;
  acao?: string | null;
  responsavel_id?: string | null;
}

// ── Quebra de vidros ───────────────────────────────────────────
export interface QuebraVidro {
  id: string;
  org_id: string;
  local: string;
  tipo_vidro: string | null;
  quantidade: string | null;
  causa: string | null;
  acao_imediata: string | null;
  acao_preventiva: string | null;
  responsavel_id: string | null;
  registrado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovaQuebraVidro {
  local: string;
  tipo_vidro?: string | null;
  quantidade?: string | null;
  causa?: string | null;
  acao_imediata?: string | null;
  acao_preventiva?: string | null;
  responsavel_id?: string | null;
}
