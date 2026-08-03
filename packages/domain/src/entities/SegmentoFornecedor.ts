// Segmento do fornecedor — a atividade que carrega o checklist documental
// (qualidade.segmentos_fornecedor). Um fornecedor pode ter mais de um
// segmento; o checklist é a união dos exigidos por cada um.

export const CATEGORIA_SEGMENTO = ['produto', 'servico', 'equipamento', 'transporte'] as const;

export type CategoriaSegmento = (typeof CATEGORIA_SEGMENTO)[number];

export const CATEGORIA_SEGMENTO_LABEL: Record<CategoriaSegmento, string> = {
  produto: 'Produto',
  servico: 'Serviço',
  equipamento: 'Equipamento',
  transporte: 'Transporte',
};

export interface SegmentoFornecedor {
  id: string;
  org_id: string;
  nome: string;
  categoria: CategoriaSegmento;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovoSegmentoFornecedor {
  nome: string;
  categoria: CategoriaSegmento;
  ativo?: boolean;
}

// Vínculo N:N fornecedor ↔ segmento (qualidade.fornecedor_segmentos).
export interface FornecedorSegmento {
  id: string;
  org_id: string;
  fornecedor_id: string;
  segmento_id: string;
  created_at: string;
  created_by: string | null;
}
