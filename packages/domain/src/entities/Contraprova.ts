// Qualidade — Controle de Contraprovas (FOR-PO06): amostras de retenção.
export interface ContraprovaRetencao {
  id: string;
  org_id: string;
  rotulo: string;
  dias: number;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovaRetencao {
  rotulo: string;
  dias: number;
}

export interface Contraprova {
  id: string;
  org_id: string;
  numero_caixa: number;
  data_lancamento: string;
  lotes: string | null;
  cliente_id: string | null;
  retencao_id: string | null;
  dias_retencao: number | null;
  local_estoque: string;
  em_estoque: boolean;
  descartado_em: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovaContraprova {
  data_lancamento: string;
  lotes?: string | null;
  cliente_id?: string | null;
  retencao_id?: string | null;
  dias_retencao?: number | null;
  local_estoque?: string;
  observacao?: string | null;
}

// Data limite de retenção (lançamento + dias). Null se sem prazo.
export function vencimentoContraprova(dataLancamento: string, dias: number | null): Date | null {
  if (dias == null) return null;
  const d = new Date(dataLancamento);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + dias);
  return d;
}

// Verdadeiro se ainda em estoque e o prazo de retenção já venceu (elegível a descarte).
export function elegivelDescarte(
  c: Pick<Contraprova, 'em_estoque' | 'data_lancamento' | 'dias_retencao'>,
  hoje = new Date(),
): boolean {
  if (!c.em_estoque) return false;
  const venc = vencimentoContraprova(c.data_lancamento, c.dias_retencao);
  if (!venc) return false;
  return hoje >= venc;
}
