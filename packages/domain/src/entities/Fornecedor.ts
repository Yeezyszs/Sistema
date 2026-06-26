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

export interface Fornecedor {
  id: string;
  org_id: string;
  razao_social: string;
  cnpj: string | null;
  tipo: TipoFornecedor;
  homologado: boolean;
  created_at: string;
  created_by: string | null;
}
