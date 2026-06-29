// Ficha PPHO (Procedimento Padrão de Higiene Operacional) — especializa um
// checklist com os dados de higienização do equipamento/área.
export const FREQUENCIA_PPHO = ['DIÁRIO', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL'] as const;
export type FrequenciaPpho = (typeof FREQUENCIA_PPHO)[number];

export interface Ppho {
  id: string;
  org_id: string;
  checklist_id: string;
  codigo: string;
  nome: string;
  equipamento_id: string | null;
  setor_id: string | null;
  frequencia: string | null;
  quimico: string | null;
  concentracao: string | null;
  observacao: string | null;
  versao: number;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovaPpho {
  checklist_id: string;
  codigo: string;
  nome: string;
  equipamento_id?: string | null;
  setor_id?: string | null;
  frequencia?: string | null;
  quimico?: string | null;
  concentracao?: string | null;
  observacao?: string | null;
}
