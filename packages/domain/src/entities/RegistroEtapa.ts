// Registro genérico tipado (lado flexível do híbrido) — producao.registros_etapa.
// higienização, operadores, fichas, checklists, ficha de descarga, NF...
export interface RegistroEtapa {
  id: string;
  org_id: string;
  lote_id: string | null;
  etapa_codigo: string | null;
  tipo_documento: string;
  operador_id: string | null;
  equipamento_id: string | null;
  dados: Record<string, unknown> | null;
  anexo_url: string | null;
  registrado_em: string;
  created_at: string;
  created_by: string | null;
}
