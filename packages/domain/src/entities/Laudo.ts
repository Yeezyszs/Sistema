// Laudo interno físico-químico por lote (registro append-only).
export interface LaudoInterno {
  id: string;
  org_id: string;
  numero: number;
  lote_id: string;
  produto_id: string;
  especificacao_id: string | null;
  conforme: boolean;
  data_fabricacao: string | null;
  data_validade: string | null;
  shelf_life_dias: number | null;
  observacao: string | null;
  emitido_por: string | null;
  emitido_em: string;
  created_at: string;
  created_by: string | null;
}

export interface LaudoResultado {
  id: string;
  org_id: string;
  laudo_id: string;
  ensaio: string;
  resultado: number | null;
  texto: string | null;
  unidade: string | null;
  limite_min: number | null;
  limite_max: number | null;
  conforme: boolean;
  ordem: number;
}

export interface NovoLaudo {
  lote_id: string;
  produto_id: string;
  especificacao_id?: string | null;
  conforme: boolean;
  data_fabricacao?: string | null;
  data_validade?: string | null;
  shelf_life_dias?: number | null;
  observacao?: string | null;
  emitido_por?: string | null;
}

export interface NovoResultadoLaudo {
  laudo_id: string;
  ensaio: string;
  resultado?: number | null;
  texto?: string | null;
  unidade?: string | null;
  limite_min?: number | null;
  limite_max?: number | null;
  conforme: boolean;
  ordem?: number;
}
