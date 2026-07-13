// Qualidade — Controle de Insumos do Laboratório (FOR-POP09).
export interface InsumoLaboratorio {
  id: string;
  org_id: string;
  nome: string;
  tipo: string | null;
  especificacao: string | null;
  quantidade_necessaria: number | null;
  quantidade_estoque: number | null;
  precisa_comprar: boolean; // gerado: estoque < necessária
  solicitado: boolean;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovoInsumoLaboratorio {
  nome: string;
  tipo?: string | null;
  especificacao?: string | null;
  quantidade_necessaria?: number | null;
  quantidade_estoque?: number | null;
  observacao?: string | null;
}
