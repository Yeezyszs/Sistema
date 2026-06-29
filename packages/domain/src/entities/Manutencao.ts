// Manutenção (schema manutencao) — Ordens de Serviço + plano preventivo.
export const TIPO_OS = ['corretiva', 'preventiva', 'solicitacao'] as const;
export type TipoOS = (typeof TIPO_OS)[number];
export const TIPO_OS_LABEL: Record<TipoOS, string> = {
  corretiva: 'Corretiva',
  preventiva: 'Preventiva',
  solicitacao: 'Solicitação',
};

export const STATUS_OS = ['aberta', 'em_execucao', 'concluida'] as const;
export type StatusOS = (typeof STATUS_OS)[number];
export const STATUS_OS_LABEL: Record<StatusOS, string> = {
  aberta: 'Aberta',
  em_execucao: 'Em execução',
  concluida: 'Concluída',
};
export const STATUS_OS_TOM: Record<StatusOS, string> = {
  aberta: 'erro',
  em_execucao: 'alerta',
  concluida: 'sucesso',
};

export const PRIORIDADE_OS = ['baixa', 'media', 'alta'] as const;
export type PrioridadeOS = (typeof PRIORIDADE_OS)[number];
export const PRIORIDADE_OS_LABEL: Record<PrioridadeOS, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export interface OrdemServico {
  id: string;
  org_id: string;
  numero: number;
  equipamento_id: string | null;
  setor_id: string | null;
  solicitante_id: string | null;
  executor_id: string | null;
  tipo: TipoOS;
  prioridade: PrioridadeOS;
  descricao_solicitada: string;
  descricao_realizada: string | null;
  status: StatusOS;
  aberta_em: string;
  concluida_em: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovaOrdemServico {
  equipamento_id?: string | null;
  setor_id?: string | null;
  solicitante_id?: string | null;
  tipo?: TipoOS;
  prioridade?: PrioridadeOS;
  descricao_solicitada: string;
}

export interface PlanoPreventivo {
  id: string;
  org_id: string;
  equipamento_id: string | null;
  componente: string;
  periodicidade: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface ExecucaoPreventiva {
  id: string;
  org_id: string;
  plano_item_id: string;
  realizada_em: string;
  executor_id: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}
