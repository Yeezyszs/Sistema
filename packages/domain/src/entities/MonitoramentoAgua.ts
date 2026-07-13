// Qualidade — Monitoramento do Teor de Cloro Residual e pH da água (FOR-POP 2).
export const AGUA_CLORO_MIN = 0.2;
export const AGUA_CLORO_MAX = 5.0;
export const AGUA_PH_MIN = 6.0;
export const AGUA_PH_MAX = 8.0;

export interface MonitoramentoAgua {
  id: string;
  org_id: string;
  data: string;
  hora: string | null;
  ponto_coleta: string | null;
  cloro_ppm: number | null;
  ph: number | null;
  aspecto: string | null;
  conforme: boolean;
  responsavel: string | null;
  validado_por: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface NovoMonitoramentoAgua {
  data: string;
  hora?: string | null;
  ponto_coleta?: string | null;
  cloro_ppm?: number | null;
  ph?: number | null;
  aspecto?: string | null;
  responsavel?: string | null;
  validado_por?: string | null;
  observacao?: string | null;
}

// Mesma regra do trigger, para pré-avaliação no formulário.
export function aguaConforme(cloro: number | null, ph: number | null): boolean {
  const cloroOk = cloro == null || (cloro >= AGUA_CLORO_MIN && cloro <= AGUA_CLORO_MAX);
  const phOk = ph == null || (ph >= AGUA_PH_MIN && ph <= AGUA_PH_MAX);
  return cloroOk && phOk;
}
