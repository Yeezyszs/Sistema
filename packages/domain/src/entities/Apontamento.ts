// PCP — Apontamento & Rendimento (fonte única do "real" da produção).
import type { TurnoProd } from './Programacao';

export interface Apontamento {
  id: string;
  org_id: string;
  data: string;
  turno: TurnoProd;
  linha_id: string | null;
  produto_id: string | null;
  lote_id: string | null;
  programacao_id: string | null;
  quantidade_kg: number | null; // produto acabado produzido
  raiz_kg: number | null; // raiz consumida
  rendimento: number | null; // quantidade / raiz
  operador_id: string | null;
  observacao: string | null;
  apontado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovoApontamento {
  data: string;
  turno: TurnoProd;
  linha_id?: string | null;
  produto_id?: string | null;
  lote_id?: string | null;
  quantidade_kg?: number | null;
  raiz_kg?: number | null;
  operador_id?: string | null;
  observacao?: string | null;
}

// Rendimento = produto acabado / raiz consumida (~0,27).
export function calcularRendimento(quantidadeKg: number | null, raizKg: number | null): number | null {
  if (!quantidadeKg || !raizKg || raizKg <= 0) return null;
  return quantidadeKg / raizKg;
}
