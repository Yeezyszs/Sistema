// Documento de fornecedor — laudo laboratorial externo de homologação
// (qualidade.documentos_fornecedor). O arquivo fica no bucket privado
// `fornecedores` do Supabase Storage; aqui guardamos os metadados + caminho.

export const CATEGORIA_ANALISE = [
  'metais_pesados',
  'microbiologia',
  'ecoli',
  'bacillus',
  'outro',
] as const;

export type CategoriaAnalise = (typeof CATEGORIA_ANALISE)[number];

export const CATEGORIA_ANALISE_LABEL: Record<CategoriaAnalise, string> = {
  metais_pesados: 'Metais pesados',
  microbiologia: 'Microbiologia',
  ecoli: 'E. coli',
  bacillus: 'Bacillus',
  outro: 'Outro',
};

export const RESULTADO_DOCUMENTO = ['aprovado', 'reprovado', 'pendente'] as const;

export type ResultadoDocumento = (typeof RESULTADO_DOCUMENTO)[number];

export const RESULTADO_DOCUMENTO_LABEL: Record<ResultadoDocumento, string> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  pendente: 'Pendente',
};

export const RESULTADO_DOCUMENTO_TOM: Record<ResultadoDocumento, string> = {
  aprovado: 'sucesso',
  reprovado: 'erro',
  pendente: 'alerta',
};

export interface DocumentoFornecedor {
  id: string;
  org_id: string;
  fornecedor_id: string;
  homologacao_id: string | null;
  tipo: string;
  categoria_analise: string | null;
  fazenda: string | null;
  variedade: string | null;
  numero_laudo: string | null;
  ano: number | null;
  resultado: ResultadoDocumento;
  emitido_em: string | null;
  validade: string | null;
  arquivo_bucket: string | null;
  arquivo_path: string | null;
  arquivo_nome: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovoDocumentoFornecedor {
  fornecedor_id: string;
  homologacao_id?: string | null;
  tipo?: string;
  categoria_analise?: string | null;
  fazenda?: string | null;
  variedade?: string | null;
  numero_laudo?: string | null;
  ano?: number | null;
  resultado?: ResultadoDocumento;
  arquivo_bucket?: string | null;
  arquivo_path?: string | null;
  arquivo_nome?: string | null;
  observacao?: string | null;
}
