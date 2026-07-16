// PCM — Planejamento e Controle de Manutenção (portado do app standalone).
// F1: cadastros — colaboradores, equipamentos + componentes, planos LU/PRM/IRM,
// pontos de lubrificação e ferramentas.

export interface ColaboradorPcm {
  id: string;
  org_id: string;
  nome: string;
  funcao: string | null;
  setor: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface EquipamentoPcm {
  id: string;
  org_id: string;
  setor: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface ComponenteEquipamento {
  id: string;
  org_id: string;
  equipamento_id: string;
  qty: string | null;
  nome: string;
  created_at: string;
}

export const TIPO_PLANO_PCM = ['LU', 'PRM', 'IRM'] as const;
export type TipoPlanoPcm = (typeof TIPO_PLANO_PCM)[number];
export const TIPO_PLANO_PCM_LABEL: Record<TipoPlanoPcm, string> = {
  LU: 'Lubrificação',
  PRM: 'Preventiva (troca)',
  IRM: 'Inspeção de rota',
};

export interface PlanoPcm {
  id: string;
  org_id: string;
  setor: string | null;
  equip: string | null;
  plano: TipoPlanoPcm | null;
  item: string | null;
  period: string | null;
  qty: number | null;
  created_at: string;
  created_by: string | null;
}

export interface LubrificacaoPcm {
  id: string;
  org_id: string;
  setor: string | null;
  equip: string | null;
  item: string | null;
  lubrificante: string | null;
  bombadas: string | null;
  frequencia: string | null;
  created_at: string;
  created_by: string | null;
}

export interface FerramentaPcm {
  id: string;
  org_id: string;
  tipo: 'eletrica' | 'mecanica' | null;
  caixa: string | null; // null = checklist | 'VERDE'/'VERMELHA' = inventário de caixa
  nome: string;
  qty: number | null;
  area: string | null;
  created_at: string;
  created_by: string | null;
}
