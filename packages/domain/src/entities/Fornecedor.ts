// Dados-mestre de fornecedor (core.fornecedores).
export const TIPO_FORNECEDOR = [
  'fornecedor',
  'produtor_rural',
  'transportadora',
] as const;

export type TipoFornecedor = (typeof TIPO_FORNECEDOR)[number];

export const TIPO_FORNECEDOR_LABEL: Record<TipoFornecedor, string> = {
  fornecedor: 'Fornecedor',
  produtor_rural: 'Produtor rural',
  transportadora: 'Transportadora',
};

// Risco do fornecedor — pesa na homologação, independe do status documental.
export const CLASSIFICACAO_RISCO = ['alto', 'medio', 'baixo'] as const;

export type ClassificacaoRisco = (typeof CLASSIFICACAO_RISCO)[number];

export const CLASSIFICACAO_RISCO_LABEL: Record<ClassificacaoRisco, string> = {
  alto: 'Alto',
  medio: 'Médio',
  baixo: 'Baixo',
};

// Cores próprias, deliberadamente diferentes das de status: as duas colunas
// aparecem lado a lado na lista e não podem se confundir.
export const CLASSIFICACAO_RISCO_COR: Record<ClassificacaoRisco, string> = {
  alto: '#7c3aed',
  medio: '#2563eb',
  baixo: '#94a3b8',
};

export interface Fornecedor {
  id: string;
  org_id: string;
  razao_social: string;
  cnpj: string | null;
  tipo: TipoFornecedor;
  homologado: boolean;
  telefone: string | null;
  email: string | null;
  classificacao_risco: ClassificacaoRisco | null;
  data_cadastro: string;
  // Situação do checklist documental — gravada por trigger no banco.
  // Nada a ver com `homologado` / qualidade.homologacoes (nota e classe):
  // são duas homologações diferentes.
  status_documental: 'sem_documentos' | 'pendente' | 'ok';
  created_at: string;
  created_by: string | null;
}

export interface NovoFornecedor {
  razao_social: string;
  cnpj?: string | null;
  tipo?: TipoFornecedor;
  telefone?: string | null;
  email?: string | null;
  classificacao_risco?: ClassificacaoRisco | null;
}

export type AtualizacaoFornecedor = Partial<NovoFornecedor>;
