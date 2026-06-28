// Entrada de matéria-prima (etapa Descarga) — producao.recebimentos.
export interface Recebimento {
  id: string;
  org_id: string;
  fornecedor_id: string | null;
  produto_id: string;
  lote_mp: string | null;
  variedade: string | null;
  quantidade: number | null;
  renda: string | null; // ponto de descarga (renda)
  rosca: string | null; // rosca transportadora usada
  recebido_em: string; // ISO timestamp
  created_at: string;
  created_by: string | null;
}

// Payload para registrar um recebimento (sem colunas gerenciadas pelo banco).
export interface NovoRecebimento {
  fornecedor_id: string | null;
  produto_id: string;
  variedade: string | null;
  quantidade: number | null;
  renda: string | null;
  rosca: string | null;
  recebido_em: string;
}
