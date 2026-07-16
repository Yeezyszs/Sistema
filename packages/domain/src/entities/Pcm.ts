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

// ── F2: Ordens de Serviço ──────────────────────────────────────
export const TIPO_OS_PCM = ['Corretiva', 'Corretiva Programada', 'Preventiva', 'Inspeção de Rota', 'melhoria'] as const;
export type TipoOs = (typeof TIPO_OS_PCM)[number];

export const NATUREZA_OS = ['Predial', 'Elétrica', 'Mecânica'] as const; // exibido como "Demanda"
export type NaturezaOs = (typeof NATUREZA_OS)[number];

export const PRIORIDADE_OS_PCM = ['Baixa', 'Normal', 'Urgente', 'Emergente'] as const;
export type PrioridadeOs = (typeof PRIORIDADE_OS_PCM)[number];
export const PRIORIDADE_OS_PCM_TOM: Record<PrioridadeOs, string> = {
  Baixa: 'bg-slate-100 text-slate-600',
  Normal: 'bg-sky-100 text-sky-700',
  Urgente: 'bg-amber-100 text-amber-700',
  Emergente: 'bg-red-100 text-red-700',
};

export type StatusOs = 'Em Aberto' | 'Concluído';

export interface OrdemPcm {
  id: string;
  org_id: string;
  numero: number;
  data: string;
  hora: string | null;
  req: string | null;
  setor: string | null;
  tipo: TipoOs | null;
  natureza: NaturezaOs | null;
  descricao: string | null;
  prioridade: PrioridadeOs | null;
  data_prog: string | null;
  data_concl: string | null;
  realizado: string | null;
  exec: string | null;
  status: StatusOs;
  parada_equip: boolean;
  parada_equip_ini: string | null;
  parada_equip_ini_h: string | null;
  parada_equip_ret: string | null;
  parada_equip_ret_h: string | null;
  parada_prod: boolean;
  parada_prod_ini: string | null;
  parada_prod_ini_h: string | null;
  parada_prod_ret: string | null;
  parada_prod_ret_h: string | null;
  created_at: string;
  created_by: string | null;
}

export type NovaOrdemPcm = Partial<Omit<OrdemPcm, 'id' | 'org_id' | 'numero' | 'created_at' | 'created_by'>> & { data: string };

export interface OsExecucao {
  id: string;
  org_id: string;
  os_id: string;
  mantenedor: string | null;
  data_exec: string | null;
  hora_ini: string | null;
  data_fim: string | null;
  hora_fim: string | null;
  data_fech: string | null;
  assinatura: string | null;
  created_at: string;
}

export type NovaOsExecucao = Partial<Omit<OsExecucao, 'id' | 'org_id' | 'os_id' | 'created_at'>>;

// ── F3: Preventiva + execuções de lubrificação ─────────────────
export const TRIMESTRE_PCM = ['1º', '2º', '3º', '4º'] as const;
export type TrimestrePcm = (typeof TRIMESTRE_PCM)[number];

export interface PreventivaPcm {
  id: string;
  org_id: string;
  equip: string;
  comp: string;
  trimestre: TrimestrePcm | null;
  planejada: string | null;
  realizada: string | null;
  exec: string | null;
  created_at: string;
  created_by: string | null;
}

export type NovaPreventivaPcm = Partial<Omit<PreventivaPcm, 'id' | 'org_id' | 'created_at' | 'created_by'>> & {
  equip: string;
  comp: string;
};

export interface LuExecucao {
  id: string;
  org_id: string;
  setor: string | null;
  equip: string | null;
  item: string | null;
  data: string;
  exec: string | null;
  obs: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovaLuExecucao {
  setor?: string | null;
  equip?: string | null;
  item?: string | null;
  data: string;
  exec?: string | null;
  obs?: string | null;
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
