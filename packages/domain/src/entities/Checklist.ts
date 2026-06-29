// Motor genérico de checklist (coringa) — reusado por PPHO, asseio,
// expedição, food defense, BPF etc. via `contexto`.

export type RespostaChecklist = 'conforme' | 'nao_conforme' | 'na';

export const RESPOSTA_CHECKLIST_LABEL: Record<RespostaChecklist, string> = {
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  na: 'N/A',
};

export interface Checklist {
  id: string;
  org_id: string;
  contexto: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface ChecklistItem {
  id: string;
  org_id: string;
  checklist_id: string;
  item: string;
  ordem: number;
}

export interface ChecklistExecucao {
  id: string;
  org_id: string;
  checklist_id: string;
  contexto: string;
  lote_id: string | null;
  turno: string | null;
  executor_id: string | null;
  validado_por: string | null;
  conforme: boolean;
  observacao: string | null;
  registrado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface ChecklistResposta {
  id: string;
  org_id: string;
  execucao_id: string;
  item: string;
  resposta: RespostaChecklist;
  observacao: string | null;
  ordem: number;
}

export interface NovaExecucaoChecklist {
  checklist_id: string;
  contexto: string;
  lote_id?: string | null;
  turno?: string | null;
  executor_id?: string | null;
  validado_por?: string | null;
  conforme: boolean;
  observacao?: string | null;
}

export interface NovaRespostaChecklist {
  execucao_id: string;
  item: string;
  resposta: RespostaChecklist;
  observacao?: string | null;
  ordem?: number;
}

// Execução é conforme quando nenhuma resposta é 'nao_conforme'.
export function execucaoConforme(respostas: { resposta: RespostaChecklist }[]): boolean {
  return respostas.every((r) => r.resposta !== 'nao_conforme');
}
