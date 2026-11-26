// Documentos regulatórios da própria empresa (alvará, licenças, CLCB, MAPA…).
// `validade` nula = sem vencimento; `validade_obs` explica ("Indeterminado").
export interface DocumentoEmpresa {
  id: string;
  org_id: string;
  nome: string;
  numero: string | null;
  validade: string | null;
  validade_obs: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export type NovoDocumentoEmpresa = Pick<DocumentoEmpresa, 'nome' | 'numero' | 'validade' | 'validade_obs' | 'observacao'>;
