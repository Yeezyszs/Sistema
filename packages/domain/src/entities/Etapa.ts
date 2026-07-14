// Catálogo das etapas do fluxo FSSC 22000 (semeado em producao.etapas).
export const CODIGO_ETAPA = [
  'descarga',
  'extracao',
  'secagem',
  'laboratorio',
  'ensaque',
  'expedicao',
] as const;

export type CodigoEtapa = (typeof CODIGO_ETAPA)[number];

export interface Etapa {
  codigo: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}
