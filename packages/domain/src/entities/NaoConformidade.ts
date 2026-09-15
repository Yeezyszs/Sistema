// Não Conformidade (RNC / Notificação de Ocorrência) — workflow.
export const ORIGEM_NC = [
  'ocorrencia_interna',
  'fornecedor',
  'sac',
  'auditoria_interna',
  'auditoria_externa',
  'cliente',
  'analise_risco',
  'desvio_pcc',
  'outras',
] as const;
export type OrigemNC = (typeof ORIGEM_NC)[number];

export const ORIGEM_NC_LABEL: Record<OrigemNC, string> = {
  ocorrencia_interna: 'Ocorrência interna',
  fornecedor: 'Fornecedor',
  sac: 'SAC',
  auditoria_interna: 'Auditoria interna',
  auditoria_externa: 'Auditoria externa',
  cliente: 'Cliente',
  analise_risco: 'Análise de risco',
  desvio_pcc: 'Desvio de PCC',
  outras: 'Outras',
};

export const TIPO_NC = ['rnc', 'notificacao_ocorrencia'] as const;
export type TipoNC = (typeof TIPO_NC)[number];

export const TIPO_NC_LABEL: Record<TipoNC, string> = {
  rnc: 'RNC — Relatório de não conformidade',
  notificacao_ocorrencia: 'Notificação de ocorrência',
};

export const TIPO_NC_CURTO: Record<TipoNC, string> = {
  rnc: 'RNC',
  notificacao_ocorrencia: 'Notificação',
};

export const EFICACIA_NC = ['eficaz', 'ineficaz', 'na'] as const;
export type EficaciaNC = (typeof EFICACIA_NC)[number];

export const EFICACIA_NC_LABEL: Record<EficaciaNC, string> = {
  eficaz: 'Eficaz',
  ineficaz: 'Não eficaz',
  na: 'Não aplicável',
};

// Causa raiz pelos 5 porquês — o `jsonb` guarda as respostas em ordem.
export interface CausaRaiz {
  porques: string[];
  conclusao?: string;
}

/** Só as respostas preenchidas, sem buracos no meio. */
export function porquesPreenchidos(causa: CausaRaiz | null | undefined): string[] {
  return (causa?.porques ?? []).map((p) => p.trim()).filter(Boolean);
}

export const STATUS_NC = ['aberta', 'em_andamento', 'concluida', 'eficacia_pendente'] as const;
export type StatusNC = (typeof STATUS_NC)[number];

export const STATUS_NC_LABEL: Record<StatusNC, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  eficacia_pendente: 'Eficácia pendente',
};

export const STATUS_NC_TOM: Record<StatusNC, string> = {
  aberta: 'erro',
  em_andamento: 'alerta',
  concluida: 'sucesso',
  eficacia_pendente: 'info',
};

export const DISPOSICAO_NC = ['liberar', 'retrabalhar', 'segregar', 'devolver', 'descartar'] as const;
export type DisposicaoNC = (typeof DISPOSICAO_NC)[number];

export const DISPOSICAO_NC_LABEL: Record<DisposicaoNC, string> = {
  liberar: 'Liberar',
  retrabalhar: 'Retrabalhar / torrar',
  segregar: 'Segregar',
  devolver: 'Devolver ao fornecedor',
  descartar: 'Descartar',
};

export interface NaoConformidade {
  id: string;
  org_id: string;
  numero: number;
  tipo: TipoNC;
  origem: OrigemNC;
  reincidencia_de: number | null;
  lote_id: string | null;
  fornecedor_id: string | null;
  cliente_id: string | null;
  ponto_controle_codigo: string | null;
  descricao: string;
  qtd_nao_conforme_kg: number | null;
  disposicao: DisposicaoNC | null;
  causa_raiz: CausaRaiz | null;
  status: StatusNC;
  eficacia: EficaciaNC | null;
  emitente_id: string | null;
  aberta_em: string;
  encerrada_em: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovaNaoConformidade {
  tipo?: TipoNC;
  origem: OrigemNC;
  reincidencia_de?: number | null;
  lote_id?: string | null;
  fornecedor_id?: string | null;
  cliente_id?: string | null;
  ponto_controle_codigo?: string | null;
  descricao: string;
  qtd_nao_conforme_kg?: number | null;
  disposicao?: DisposicaoNC | null;
  emitente_id?: string | null;
}

export interface NcCorrecao {
  id: string;
  org_id: string;
  nc_id: string;
  descricao: string;
  responsavel_id: string | null;
  data_implementacao: string | null;
  status: 'pendente' | 'em_andamento' | 'concluida';
  created_at: string;
  created_by: string | null;
}

export function ncEstaAberta(nc: Pick<NaoConformidade, 'status'>): boolean {
  return nc.status !== 'concluida';
}
