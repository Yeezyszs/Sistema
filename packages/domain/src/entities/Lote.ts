import type { StatusLote } from '../value-objects/StatusLote';

// O lote é a espinha da rastreabilidade. Mapeia producao.lotes 1:1.
export interface Lote {
  id: string;
  org_id: string;
  codigo: string;
  produto_id: string;
  ordem_producao_id: string | null;
  data_producao: string | null; // ISO date (yyyy-mm-dd)
  status: StatusLote;
  pedido: string | null;
  cliente_id: string | null;
  quantidade: number | null;
  volume_texto: string | null; // ex.: "16 Bag's"
  data_carregamento: string | null;
  data_entrega: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovoLote {
  codigo: string;
  produto_id: string;
  data_producao?: string | null;
  ordem_producao_id?: string | null;
  pedido?: string | null;
  cliente_id?: string | null;
  quantidade?: number | null;
  volume_texto?: string | null;
  data_carregamento?: string | null;
  data_entrega?: string | null;
}

// ── Regras puras ───────────────────────────────────────────────
export function loteEstaEmProcesso(lote: Pick<Lote, 'status'>): boolean {
  return lote.status === 'em_processo';
}

export function loteEstaLiberado(lote: Pick<Lote, 'status'>): boolean {
  return lote.status === 'liberado' || lote.status === 'expedido';
}

export function loteEstaBloqueado(lote: Pick<Lote, 'status'>): boolean {
  return lote.status === 'bloqueado';
}

// Só faz sentido pedir liberação de um lote ainda em processo.
export function lotePodeSolicitarLiberacao(lote: Pick<Lote, 'status'>): boolean {
  return lote.status === 'em_processo';
}
