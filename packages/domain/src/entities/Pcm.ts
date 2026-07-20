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

// ── F4: Indicadores (paradas, produção, custos) ────────────────
export const TIPO_PARADA = ['Manutenção / Quebra', 'Queda de Energia', 'Falta de Matéria Prima', 'Outro'] as const;
export type TipoParada = (typeof TIPO_PARADA)[number];
export const TURNO_PARADA = ['1º', '2º', 'Revezamento'] as const;

export interface Parada {
  id: string;
  org_id: string;
  data: string;
  tipo: TipoParada;
  setor: string | null;
  turno: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  horas: number;
  motivo: string | null;
  os_id: string | null;
  created_at: string;
  created_by: string | null;
}
export interface NovaParada {
  data: string;
  tipo: TipoParada;
  setor?: string | null;
  turno?: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  horas: number;
  motivo?: string | null;
  os_id?: string | null;
}

export interface ProducaoHoras {
  id: string;
  org_id: string;
  mes: number;
  ano: number;
  horas: number;
  created_at: string;
  created_by: string | null;
}
export interface NovaProducaoHoras { mes: number; ano: number; horas: number }

export interface CustoManut {
  id: string;
  org_id: string;
  data: string;
  categoria: string | null;
  descricao: string | null;
  valor: number;
  created_at: string;
  created_by: string | null;
}
export interface NovoCustoManut {
  data: string;
  categoria?: string | null;
  descricao?: string | null;
  valor: number;
}

// Duração em horas entre "HH:MM" início e fim (vira dia seguinte se fim < início).
export function horasEntre(inicio: string | null, fim: string | null): number {
  if (!inicio || !fim) return 0;
  const [hi, mi] = inicio.split(':').map(Number);
  const [hf, mf] = fim.split(':').map(Number);
  if ([hi, mi, hf, mf].some((n) => n === undefined || Number.isNaN(n))) return 0;
  let min = (hf! * 60 + mf!) - (hi! * 60 + mi!);
  if (min < 0) min += 24 * 60;
  return Math.round((min / 60) * 100) / 100;
}

export interface IndicadoresManut {
  horasPlanejadas: number;
  horasParadas: number;
  horasOperacao: number;
  horasManutencao: number;
  nFalhas: number;
  disponibilidade: number | null; // %
  mttr: number | null;            // horas
  mtbf: number | null;            // horas
}

// KPIs do período (mesma regra do PCM: só "Manutenção / Quebra" gera MTTR/MTBF).
export function calcularIndicadores(
  paradas: Pick<Parada, 'tipo' | 'horas'>[],
  horasPlanejadas: number,
): IndicadoresManut {
  const horasParadas = paradas.reduce((s, p) => s + (p.horas ?? 0), 0);
  const manut = paradas.filter((p) => p.tipo === 'Manutenção / Quebra');
  const horasManutencao = manut.reduce((s, p) => s + (p.horas ?? 0), 0);
  const nFalhas = manut.length;
  const horasOperacao = Math.max(0, horasPlanejadas - horasParadas);
  return {
    horasPlanejadas,
    horasParadas,
    horasOperacao,
    horasManutencao,
    nFalhas,
    disponibilidade: horasPlanejadas > 0 ? (horasOperacao / horasPlanejadas) * 100 : null,
    mttr: nFalhas > 0 ? horasManutencao / nFalhas : null,
    mtbf: nFalhas > 0 ? horasOperacao / nFalhas : null,
  };
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

// ── F5: Checklist diário de ferramentas ────────────────────────
export const ESTADO_CHECKLIST = ['C', 'NC', 'F', 'FE', 'A'] as const;
export type EstadoChecklist = (typeof ESTADO_CHECKLIST)[number];
export const ESTADO_CHECKLIST_LABEL: Record<EstadoChecklist, string> = {
  C: 'Conforme',
  NC: 'Não conforme',
  F: 'Faltando',
  FE: 'Ferramenta emprestada',
  A: 'Ausente',
};
// Classe de fundo/tom por estado (a UI aplica).
export const ESTADO_CHECKLIST_TOM: Record<EstadoChecklist, string> = {
  C: 'bg-emerald-100 text-emerald-700',
  NC: 'bg-red-100 text-red-700',
  F: 'bg-amber-100 text-amber-700',
  FE: 'bg-sky-100 text-sky-700',
  A: 'bg-slate-200 text-slate-600',
};

export interface EstadoChecklistFerramenta {
  id: string;
  org_id: string;
  colaborador_id: string;
  ferramenta_id: string;
  ano: number;
  mes: number;
  dia: number;
  estado: EstadoChecklist;
  created_at: string;
  created_by: string | null;
}

// Próximo estado no ciclo (clique avança; depois do último volta a vazio/null).
export function proximoEstadoChecklist(atual: EstadoChecklist | null): EstadoChecklist | null {
  if (atual === null) return 'C';
  const i = ESTADO_CHECKLIST.indexOf(atual);
  return i === ESTADO_CHECKLIST.length - 1 ? null : ESTADO_CHECKLIST[i + 1]!;
}

// Nº de dias do mês (mes 1-12).
export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}
