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
  tipo: 'rnc' | 'notificacao_ocorrencia';
  origem: OrigemNC;
  reincidencia_de: number | null;
  lote_id: string | null;
  fornecedor_id: string | null;
  cliente_id: string | null;
  ponto_controle_codigo: string | null;
  descricao: string;
  qtd_nao_conforme_kg: number | null;
  disposicao: DisposicaoNC | null;
  causa_raiz: Record<string, unknown> | null;
  status: StatusNC;
  eficacia: 'eficaz' | 'ineficaz' | 'na' | null;
  emitente_id: string | null;
  aberta_em: string;
  encerrada_em: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovaNaoConformidade {
  tipo?: 'rnc' | 'notificacao_ocorrencia';
  origem: OrigemNC;
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
