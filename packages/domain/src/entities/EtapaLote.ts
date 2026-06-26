// Instância de uma etapa para um lote específico (producao.etapas_lote).
export interface EtapaLote {
  id: string;
  org_id: string;
  lote_id: string;
  etapa_codigo: string;
  setor_id: string | null;
  equipamento_id: string | null;
  operador_id: string | null;
  iniciado_em: string | null;
  finalizado_em: string | null;
  created_at: string;
  created_by: string | null;
}

// ── Regras puras ───────────────────────────────────────────────
export function etapaConcluida(e: Pick<EtapaLote, 'finalizado_em'>): boolean {
  return e.finalizado_em != null;
}

export function etapaEmAndamento(
  e: Pick<EtapaLote, 'iniciado_em' | 'finalizado_em'>,
): boolean {
  return e.iniciado_em != null && e.finalizado_em == null;
}

export function etapaPendente(
  e: Pick<EtapaLote, 'iniciado_em' | 'finalizado_em'>,
): boolean {
  return e.iniciado_em == null && e.finalizado_em == null;
}
