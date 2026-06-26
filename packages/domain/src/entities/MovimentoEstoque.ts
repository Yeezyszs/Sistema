import type { TipoMovimento } from '../value-objects/TipoMovimento';

// Ledger de estoque append-only — producao.movimentos_estoque.
export interface MovimentoEstoque {
  id: string;
  org_id: string;
  produto_id: string;
  lote_id: string | null;
  tipo: TipoMovimento;
  quantidade: number;
  etapa_codigo: string | null;
  funcionario_id: string | null;
  ocorrido_em: string;
  created_at: string;
  created_by: string | null;
}
