// Entrada de matéria-prima (etapa Descarga) — producao.recebimentos.
// Espelha o "CONTROLE DE CARGAS": nº carga, turno, ticket, produtor, peso,
// renda (rendimento), cancha (local de descarga) e variedade.
export const TURNO = ['diurno', 'noturno'] as const;
export type Turno = (typeof TURNO)[number];
export const TURNO_LABEL: Record<Turno, string> = {
  diurno: 'Diurno',
  noturno: 'Noturno',
};

export interface Recebimento {
  id: string;
  org_id: string;
  numero: number | null; // nº da carga (sequencial por org)
  fornecedor_id: string | null; // vínculo opcional com core.fornecedores
  produtor: string | null; // produtor (texto livre, como no Controle de Cargas)
  produto_id: string;
  lote_mp: string | null;
  variedade: string | null;
  quantidade: number | null; // peso (kg)
  renda: number | null; // rendimento
  cancha: string | null; // local de descarga (1/2)
  turno: Turno | null;
  ticket: string | null;
  hora_inicio: string | null; // início da descarga (HH:MM)
  hora_fim: string | null; // fim da descarga (HH:MM)
  recebido_em: string; // ISO timestamp
  created_at: string;
  created_by: string | null;
}

// Payload para registrar um recebimento (sem colunas gerenciadas pelo banco).
export interface NovoRecebimento {
  fornecedor_id: string | null;
  produtor: string | null;
  produto_id: string;
  variedade: string | null;
  quantidade: number | null;
  renda: number | null;
  cancha: string | null;
  turno: Turno | null;
  ticket: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  recebido_em: string;
}
