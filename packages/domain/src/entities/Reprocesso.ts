// Qualidade/Produção — Controle de Retidos (FOR-PQSA18).
// Material retido por desvio: fica "em estoque" até ser reprocessado/descartado.
export const STATUS_REPROCESSO = ['em_estoque', 'concluido'] as const;
export type StatusReprocesso = (typeof STATUS_REPROCESSO)[number];

export const STATUS_REPROCESSO_LABEL: Record<StatusReprocesso, string> = {
  em_estoque: 'Em estoque',
  concluido: 'Concluído',
};
export const STATUS_REPROCESSO_TOM: Record<StatusReprocesso, string> = {
  em_estoque: 'alerta',
  concluido: 'sucesso',
};

// Para onde o retido vai: as três planilhas da Qualidade (retidos, resíduos
// e retido para tipo 2) viram um registro só, separado pelo destino.
export const DESTINO_REPROCESSO = ['reprocesso', 'residuo', 'tipo2'] as const;
export type DestinoReprocesso = (typeof DESTINO_REPROCESSO)[number];

export const DESTINO_REPROCESSO_LABEL: Record<DestinoReprocesso, string> = {
  reprocesso: 'Reprocesso',
  residuo: 'Resíduo',
  tipo2: 'Tipo 2',
};

/** Produtos como a Qualidade anota na planilha de retidos. */
export const PRODUTOS_RETIDO = [
  'Farinha Crua P.10', 'Farinha Crua P10 com fundo', 'Farinha Crua P.16', 'Farinha Crua P20',
  'Farinha 5%', 'Farinha Torrada', 'Farinha Especial', 'Pó Filtrado',
] as const;

export const EMBALAGENS_RETIDO = ['Big Bag', 'Sacaria'] as const;

// Catálogo de desvios (a "Legenda de Desvios").
export interface Desvio {
  id: string;
  org_id: string;
  codigo: string;
  categoria: string | null;
  descricao: string;
  produto_afetado: string | null;
  onde_reprocessar: string | null;
  /** false = não pode voltar ao processo (ex.: RF-MESCL-003). */
  reprocessa: boolean;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovoDesvio {
  codigo: string;
  categoria?: string | null;
  descricao: string;
  produto_afetado?: string | null;
  onde_reprocessar?: string | null;
  reprocessa?: boolean;
}

export interface Reprocesso {
  id: string;
  org_id: string;
  numero: number;
  lote_id: string | null;
  produto_id: string | null;
  lacre: string | null;
  qtd_bags: number | null;
  quantidade_kg: number | null;
  motivo: string;
  desvio_id: string | null;
  onde_reprocessar: string | null;
  descricao_ocorrencia: string | null;
  evidencia_url: string | null;
  origem: string | null;
  nc_id: string | null;
  status: StatusReprocesso;
  destino: DestinoReprocesso | null;
  lote_final: string | null;
  // ── FOR-PQSA 08 1.2 / 1.3 ──
  turno: string | null;
  embalagem: string | null;
  produto_texto: string | null;
  lote_codigo: string | null;
  shelf_life_anos: number;
  validade: string | null;
  colaborador_lab: string | null;
  data_reprocesso: string | null;
  horario_diluicao: string | null;
  turno_reprocesso: string | null;
  colaborador_secagem: string | null;
  lote_final_id: string | null;
  importado: boolean;
  data: string;
  resolvido_em: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovoReprocesso {
  lote_id?: string | null;
  produto_id?: string | null;
  lacre?: string | null;
  qtd_bags?: number | null;
  quantidade_kg?: number | null;
  motivo: string;
  desvio_id?: string | null;
  onde_reprocessar?: string | null;
  descricao_ocorrencia?: string | null;
  evidencia_url?: string | null;
  origem?: string | null;
  nc_id?: string | null;
  destino?: DestinoReprocesso | null;
  lote_final?: string | null;
  data?: string;
  observacao?: string | null;
  turno?: string | null;
  embalagem?: string | null;
  produto_texto?: string | null;
  lote_codigo?: string | null;
  shelf_life_anos?: number;
  validade?: string | null;
  colaborador_lab?: string | null;
  data_reprocesso?: string | null;
  horario_diluicao?: string | null;
  turno_reprocesso?: string | null;
  colaborador_secagem?: string | null;
  lote_final_id?: string | null;
}

/** Validade = data de produção + shelf life (anos). */
export function validadeRetido(dataISO: string, anos = 1): string {
  const [a = 0, m = 1, d = 1] = dataISO.slice(0, 10).split('-').map(Number);
  const meses = Math.round(anos * 12);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, d));
  return alvo.toISOString().slice(0, 10);
}

/** Retido em estoque cuja validade vence em até `dias` (ou já venceu). */
export function retidoVencendo(r: Pick<Reprocesso, 'status' | 'validade'>, hojeISO: string, dias = 30): boolean {
  if (r.status !== 'em_estoque' || !r.validade) return false;
  const limite = new Date(`${hojeISO}T00:00:00Z`).getTime() + dias * 86_400_000;
  return new Date(`${r.validade}T00:00:00Z`).getTime() <= limite;
}

/** Soma de kg por chave, do maior para o menor. */
export function somarKgPor<T extends { quantidade_kg: number | null }>(itens: T[], chave: (i: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const i of itens) m.set(chave(i), (m.get(chave(i)) ?? 0) + (i.quantidade_kg ?? 0));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
