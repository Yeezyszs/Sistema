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
  // ── FOR PQSA 11 1.2 ──
  nhp: boolean;
  observacao: string | null;
  lider_informado: string | null;
  linha_parada: boolean | null;
  manutencao_informada: boolean | null;
  producao_retida: boolean | null;
  validacao_equipamento: boolean | null;
  responsavel_retencao: string | null;
  os_id: string | null;
  validado_em: string | null;
  validado_por: string | null;
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
  nhp?: boolean;
  observacao?: string | null;
  lider_informado?: string | null;
  linha_parada?: boolean | null;
  manutencao_informada?: boolean | null;
  producao_retida?: boolean | null;
  validacao_equipamento?: boolean | null;
  responsavel_retencao?: string | null;
  os_id?: string | null;
}

// Frequência do formulário: a cada 2 h, com 15 min de tolerância.
export const DM_INTERVALO_MIN = 120;
export const DM_TOLERANCIA_MIN = 15;

/** Situação do detector agora, olhando o último teste do dia.
 *  - sem_teste: nenhum teste hoje (ou só NHP) — nada a cobrar;
 *  - encerrado: último teste foi o de final de produção;
 *  - em_dia / atrasado: produção rodando, prazo = último + 2 h + 15 min. */
export function situacaoDetector(
  ultimo: Pick<VerificacaoDM, 'registrado_em' | 'tipo_teste' | 'nhp'> | null,
  agora: Date = new Date(),
): { situacao: 'sem_teste' | 'encerrado' | 'em_dia' | 'atrasado'; proximoAte: Date | null } {
  if (!ultimo || ultimo.nhp) return { situacao: 'sem_teste', proximoAte: null };
  const ult = new Date(ultimo.registrado_em);
  if (ult.toDateString() !== agora.toDateString()) return { situacao: 'sem_teste', proximoAte: null };
  if (ultimo.tipo_teste === 'final_producao') return { situacao: 'encerrado', proximoAte: null };
  const proximoAte = new Date(ult.getTime() + (DM_INTERVALO_MIN + DM_TOLERANCIA_MIN) * 60_000);
  return { situacao: agora > proximoAte ? 'atrasado' : 'em_dia', proximoAte };
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
  area: string | null;
  ordem: number;
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
  nhp: boolean;
  tem_material: boolean | null;
  validado_em: string | null;
  validado_por: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovaVerificacaoIma {
  ima_id: string;
  peso_g?: number | null;
  material?: string | null;
  acao?: string | null;
  responsavel_id?: string | null;
  nhp?: boolean;
  tem_material?: boolean | null;
}

/** Áreas na ordem do processo (abas do FOR PQSA 09 1.3). */
export const AREAS_IMA = ['Extração', 'Secagem', 'Ensaque 01', 'Ensaque 02'] as const;

/** Ímãs ativos ainda sem verificação (nem NHP) no dia. */
export function imasPendentesNoDia(
  imas: Pick<Ima, 'id' | 'ativo'>[],
  verificacoes: Pick<VerificacaoIma, 'ima_id' | 'registrado_em'>[],
  diaISO: string,
): string[] {
  const feitos = new Set(
    verificacoes.filter((v) => dataLocalISO(new Date(v.registrado_em)) === diaISO).map((v) => v.ima_id),
  );
  return imas.filter((i) => i.ativo && !feitos.has(i.id)).map((i) => i.id);
}

function dataLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
