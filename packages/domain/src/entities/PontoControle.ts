export type TipoPontoControle = 'ccp' | 'prp' | 'prpo';

export const TIPO_PCC_LABEL: Record<TipoPontoControle, string> = {
  ccp: 'CCP',
  prp: 'PRP',
  prpo: 'PRPO',
};

export const TIPO_PCC_COR: Record<TipoPontoControle, string> = {
  ccp: 'red',
  prp: 'amber',
  prpo: 'sky',
};

export interface PontoControle {
  codigo: string;
  nome: string;
  tipo: TipoPontoControle;
  etapa_codigo: string | null;
  parametro: string | null;
  limite_min: number | null;
  limite_max: number | null;
  unidade: string | null;
  acao_corretiva: string | null;
  ativo: boolean;
  ordem: number;
}

export function limiteLabel(pc: PontoControle): string {
  if (pc.limite_min != null && pc.limite_max != null)
    return `${pc.limite_min} – ${pc.limite_max} ${pc.unidade ?? ''}`.trim();
  if (pc.limite_max != null) return `≤ ${pc.limite_max} ${pc.unidade ?? ''}`.trim();
  if (pc.limite_min != null) return `≥ ${pc.limite_min} ${pc.unidade ?? ''}`.trim();
  return '—';
}

export function valorConforme(pc: PontoControle, valor: number): boolean {
  if (pc.limite_min != null && valor < pc.limite_min) return false;
  if (pc.limite_max != null && valor > pc.limite_max) return false;
  return true;
}
