// Catálogo de tipos de documento (qualidade.documentos_exigidos) e o
// checklist por segmento (qualidade.segmento_documentos).
//
// O estado de cada item do checklist é calculado NO BANCO, pela função
// qualidade.checklist_fornecedor(). Os tipos daqui descrevem o que ela
// devolve — o front exibe, não recalcula.

export const ORIGEM_DOCUMENTO = ['fornecedor', 'interno'] as const;

export type OrigemDocumento = (typeof ORIGEM_DOCUMENTO)[number];

export const ORIGEM_DOCUMENTO_LABEL: Record<OrigemDocumento, string> = {
  fornecedor: 'Enviado pelo fornecedor',
  interno: 'Preenchido internamente',
};

export const EXIGENCIA = ['obrigatorio', 'condicional'] as const;

export type Exigencia = (typeof EXIGENCIA)[number];

export const EXIGENCIA_LABEL: Record<Exigencia, string> = {
  obrigatorio: 'Obrigatório',
  condicional: 'Condicional',
};

export interface DocumentoExigido {
  id: string;
  org_id: string;
  nome: string;
  tem_validade: boolean;
  origem: OrigemDocumento;
  permite_multiplos: boolean;
  ativo: boolean;
  created_at: string;
  created_by: string | null;
}

export interface NovoDocumentoExigido {
  nome: string;
  tem_validade?: boolean;
  origem?: OrigemDocumento;
  permite_multiplos?: boolean;
  ativo?: boolean;
}

// Item do checklist de um segmento.
export interface SegmentoDocumento {
  id: string;
  org_id: string;
  segmento_id: string;
  documento_exigido_id: string;
  exigencia: Exigencia;
  created_at: string;
  created_by: string | null;
}

// ── Estado calculado pelo banco ────────────────────────────────────────────
export const ESTADO_ITEM_CHECKLIST = ['ok', 'faltando', 'aguardando', 'vencido'] as const;

export type EstadoItemChecklist = (typeof ESTADO_ITEM_CHECKLIST)[number];

export const ESTADO_ITEM_LABEL: Record<EstadoItemChecklist, string> = {
  ok: 'Em dia',
  faltando: 'Faltando',
  aguardando: 'Sem validade informada',
  vencido: 'Vencido',
};

export const ESTADO_ITEM_TOM: Record<EstadoItemChecklist, string> = {
  ok: 'sucesso',
  faltando: 'erro',
  aguardando: 'alerta',
  vencido: 'erro',
};

// Arquivo vigente agregado no item (jsonb devolvido pela função).
export interface ArquivoChecklist {
  id: string;
  validade: string | null;
  emitido_em: string | null;
  arquivo_nome: string | null;
  arquivo_path: string | null;
  arquivo_bucket: string | null;
  resultado: string;
  numero_laudo: string | null;
  observacao: string | null;
}

// Uma linha de qualidade.checklist_fornecedor().
export interface ItemChecklistFornecedor {
  documento_exigido_id: string;
  documento: string;
  tem_validade: boolean;
  permite_multiplos: boolean;
  origem: OrigemDocumento;
  exigencia: Exigencia;
  estado: EstadoItemChecklist;
  proxima_validade: string | null;
  arquivos: ArquivoChecklist[];
}

// ── Status documental do fornecedor ────────────────────────────────────────
export const STATUS_DOCUMENTAL = ['ok', 'pendente', 'sem_documentos'] as const;

export type StatusDocumental = (typeof STATUS_DOCUMENTAL)[number];

export const STATUS_DOCUMENTAL_LABEL: Record<StatusDocumental, string> = {
  ok: 'Documentação em dia',
  pendente: 'Documentação pendente',
  sem_documentos: 'Sem documentos',
};

export const STATUS_DOCUMENTAL_TOM: Record<StatusDocumental, string> = {
  ok: 'sucesso',
  pendente: 'erro',
  sem_documentos: 'neutro',
};

// Uma linha de qualidade.documentos_vencendo() — alimenta o painel e o alerta.
export interface DocumentoVencendo {
  documento_id: string;
  fornecedor_id: string;
  fornecedor: string;
  documento: string;
  validade: string;
  dias: number;
  estado: 'vencido' | 'proximo_vencimento';
}

// Uma linha de qualidade.checklist_geral() — o checklist de TODOS os
// fornecedores, item a item. Alimenta dashboard e relatórios numa consulta.
export interface ItemChecklistGeral {
  fornecedor_id: string;
  fornecedor: string;
  status_documental: StatusDocumental;
  documento_exigido_id: string;
  documento: string;
  exigencia: Exigencia;
  tem_validade: boolean;
  estado: EstadoItemChecklist;
  proxima_validade: string | null;
}

// Uma linha de qualidade.status_documental_geral().
export interface StatusDocumentalFornecedor {
  fornecedor_id: string;
  status_documental: StatusDocumental;
  itens_pendentes: number;
  proximo_vencimento: string | null;
}
