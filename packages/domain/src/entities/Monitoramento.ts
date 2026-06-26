export interface Monitoramento {
  id: string;
  org_id: string;
  lote_id: string;
  ponto_controle_codigo: string;
  valor: number | null;
  texto: string | null;
  conforme: boolean | null;
  observacao: string | null;
  operador_id: string | null;
  registrado_em: string;
  created_at: string;
  created_by: string | null;
}

export interface NovoMonitoramento {
  lote_id: string;
  ponto_controle_codigo: string;
  valor?: number | null;
  texto?: string | null;
  conforme: boolean;
  observacao?: string | null;
  operador_id?: string | null;
}
