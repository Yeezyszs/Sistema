// Auditoria interna (FSSC 22000) + verificação de PPR.
export const STATUS_AUDITORIA = ['planejada', 'em_andamento', 'concluida'] as const;
export type StatusAuditoria = (typeof STATUS_AUDITORIA)[number];
export const STATUS_AUDITORIA_LABEL: Record<StatusAuditoria, string> = {
  planejada: 'Planejada',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};
export const STATUS_AUDITORIA_TOM: Record<StatusAuditoria, string> = {
  planejada: 'info',
  em_andamento: 'alerta',
  concluida: 'sucesso',
};

export const CLASSIFICACAO_ITEM = ['conforme', 'nc_critica', 'nc_maior', 'nc_menor', 'na'] as const;
export type ClassificacaoItem = (typeof CLASSIFICACAO_ITEM)[number];
export const CLASSIFICACAO_ITEM_LABEL: Record<ClassificacaoItem, string> = {
  conforme: 'Conforme',
  nc_critica: 'NC Crítica',
  nc_maior: 'NC Maior',
  nc_menor: 'NC Menor',
  na: 'N/A',
};
export function itemEhNaoConforme(c: ClassificacaoItem): boolean {
  return c === 'nc_critica' || c === 'nc_maior' || c === 'nc_menor';
}

export interface Auditoria {
  id: string;
  org_id: string;
  numero: number;
  norma: string | null;
  escopo: string | null;
  unidade: string | null;
  data: string;
  auditor_id: string | null;
  status: StatusAuditoria;
  resultado: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface AuditoriaItem {
  id: string;
  org_id: string;
  auditoria_id: string;
  clausula: string | null;
  requisito: string;
  classificacao: ClassificacaoItem;
  evidencia: string | null;
  nc_gerada: boolean;
  ordem: number;
}

export interface NovaAuditoria {
  norma?: string | null;
  escopo?: string | null;
  unidade?: string | null;
  data: string;
  auditor_id?: string | null;
}

export interface NovoItemAuditoria {
  auditoria_id: string;
  clausula?: string | null;
  requisito: string;
  classificacao: ClassificacaoItem;
  evidencia?: string | null;
}

export interface VerificacaoPpr {
  id: string;
  org_id: string;
  programa: string;
  registro_codigo: string | null;
  frequencia: string | null;
  conforme: boolean;
  acao: string | null;
  responsavel_id: string | null;
  verificado_em: string;
  created_at: string;
  created_by: string | null;
}
