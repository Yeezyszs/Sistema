// PCM — Planejamento e Controle de Manutenção (portado do app standalone).
// F1: cadastros — colaboradores, equipamentos + componentes, planos LU/PRM/IRM,
// pontos de lubrificação e ferramentas.

// Áreas da fábrica, na ordem do fluxo produtivo (recebimento → expedição) e
// depois as de apoio. É a lista que a manutenção usa para abrir O.S.
//
// Setores de equipamentos já cadastrados que não estejam aqui continuam
// aparecendo na tela — a lista soma, não substitui, para não deixar registro
// antigo com um valor impossível de selecionar.
export const SETORES_PCM = [
  'ADMINISTRATIVO',
  'BALANÇA',
  'DESCARGA',
  'BIOGAS',
  'EXTRAÇÃO',
  'FORNO',
  'CALDEIRA',
  'ENSAQUE 01',
  'ENSAQUE 02',
  'ENSAQUE 03',
  'ARMAZEM 1',
  'ARMAZEM 2',
  'ARMAZEM 3',
  'VESTIARIO',
  'QUALIDADE',
  'LABORATORIO',
  'REFEITORIO',
  'MANUTENÇÃO',
  'DIESEL',
  'ALMOXARIFADO',
  'AREA EXTERNA',
] as const;

export type SetorPcm = (typeof SETORES_PCM)[number];

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

export const STATUS_OS_PCM = ['Em Aberto', 'Aguardando Qualidade', 'Concluído'] as const;
export type StatusOs = (typeof STATUS_OS_PCM)[number];

export const STATUS_OS_PCM_TOM: Record<StatusOs, string> = {
  'Em Aberto': 'bg-amber-100 text-amber-700',
  'Aguardando Qualidade': 'bg-violet-100 text-violet-800',
  Concluído: 'bg-brand-100 text-brand-700',
};

// ── Risco à segurança de alimentos ─────────────────────────────
// Manutenção em equipamento que toca o produto pode deixar parafuso, cavaco,
// graxa ou resto de solda na linha. Nesses casos a O.S. não se fecha na mão da
// manutenção: ela encerra o serviço e a Qualidade inspeciona e libera. A trava
// de verdade mora no banco (trigger); estas funções só fazem a tela concordar
// com ela, para ninguém clicar num botão que vai dar erro.

/** Para onde a O.S. vai quando a manutenção termina o serviço. */
export function statusAoEncerrarServico(risco: boolean): StatusOs {
  return risco ? 'Aguardando Qualidade' : 'Concluído';
}

/** Quem pode dar a O.S. por concluída. */
export function podeConcluirOs(os: { risco_seguranca_alimentos: boolean }, perfis: readonly string[]): boolean {
  return !os.risco_seguranca_alimentos || perfis.includes('qualidade');
}

/** Quem pode retirar o risco de uma O.S. que já o tinha. */
export function podeRetirarRisco(perfis: readonly string[]): boolean {
  return perfis.includes('qualidade');
}

// ── Anexos (fotos e vídeos) ────────────────────────────────────
export const ETAPA_ANEXO_OS = ['abertura', 'fechamento', 'liberacao'] as const;
export type EtapaAnexoOs = (typeof ETAPA_ANEXO_OS)[number];

export const ETAPA_ANEXO_OS_LABEL: Record<EtapaAnexoOs, string> = {
  abertura: 'Abertura',
  fechamento: 'Fechamento',
  liberacao: 'Liberação da Qualidade',
};

export interface OsAnexo {
  id: string;
  org_id: string;
  os_id: string;
  etapa: EtapaAnexoOs;
  caminho: string;
  nome: string | null;
  mime: string | null;
  tamanho: number | null;
  /** O que a foto mostra — a operação feita naquele ponto. */
  descricao: string | null;
  created_at: string;
  created_by: string | null;
}

/** 50 MB — o mesmo limite configurado no bucket. */
export const TAMANHO_MAX_ANEXO = 50 * 1024 * 1024;

/**
 * Motivo para recusar o arquivo, ou null se ele pode subir.
 * Conferir aqui evita mandar 200 MB pela rede para o Storage recusar no fim.
 */
export function problemaNoAnexo(arquivo: { type: string; size: number; name: string }): string | null {
  if (!arquivo.type.startsWith('image/') && !arquivo.type.startsWith('video/')) {
    return `"${arquivo.name}" não é foto nem vídeo.`;
  }
  if (arquivo.size > TAMANHO_MAX_ANEXO) {
    const mb = (arquivo.size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    return `"${arquivo.name}" tem ${mb} MB — o limite é 50 MB. Grave um vídeo mais curto.`;
  }
  return null;
}

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
  risco_seguranca_alimentos: boolean;
  liberado_em: string | null;
  liberado_por: string | null;
  liberacao_obs: string | null;
  created_at: string;
  created_by: string | null;
}

export type NovaOrdemPcm = Partial<Omit<OrdemPcm, 'id' | 'org_id' | 'numero' | 'created_at' | 'created_by' | 'liberado_em' | 'liberado_por'>> & { data: string };

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
  // Como no formulário em papel: F/FE/A marcam o dia em que o colaborador
  // não estava (folga, férias, atestado), não a ferramenta.
  F: 'Folga',
  FE: 'Férias',
  A: 'Atestado',
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
