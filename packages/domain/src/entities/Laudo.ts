// Laudo interno por lote (registro append-only). Dois tipos:
// - fisico_quimico: umidade, acidez, granulometria (peneiras)
// - verificacao_visual: triagem de contaminantes físicos por peneiramento
export const TIPO_LAUDO = ['fisico_quimico', 'verificacao_visual'] as const;
export type TipoLaudo = (typeof TIPO_LAUDO)[number];

export const TIPO_LAUDO_LABEL: Record<TipoLaudo, string> = {
  fisico_quimico: 'Análise físico-química',
  verificacao_visual: 'Verificação visual — contaminantes físicos',
};

export interface LaudoInterno {
  id: string;
  org_id: string;
  numero: number;
  tipo: TipoLaudo;
  lote_id: string;
  produto_id: string;
  especificacao_id: string | null;
  conforme: boolean;
  data_fabricacao: string | null;
  data_validade: string | null;
  shelf_life_dias: number | null;
  observacao: string | null;
  dados: LaudoDados | null;
  emitido_por: string | null;
  emitido_em: string;
  created_at: string;
  created_by: string | null;
}

// Extras específicos da verificação visual.
export interface LaudoDados {
  amostragem?: string; // descrição da amostragem
  bags?: { faixa: string; resultado: string }[]; // amostras peneiradas por faixa de bag
}

export interface LaudoResultado {
  id: string;
  org_id: string;
  laudo_id: string;
  ensaio: string;
  resultado: number | null;
  texto: string | null;
  unidade: string | null;
  limite_min: number | null;
  limite_max: number | null;
  referencia_texto: string | null;
  metodologia: string | null;
  conforme: boolean;
  ordem: number;
}

export interface NovoLaudo {
  tipo: TipoLaudo;
  lote_id: string;
  produto_id: string;
  especificacao_id?: string | null;
  conforme: boolean;
  data_fabricacao?: string | null;
  data_validade?: string | null;
  shelf_life_dias?: number | null;
  observacao?: string | null;
  dados?: LaudoDados | null;
  emitido_por?: string | null;
}

export interface NovoResultadoLaudo {
  laudo_id: string;
  ensaio: string;
  resultado?: number | null;
  texto?: string | null;
  unidade?: string | null;
  limite_min?: number | null;
  limite_max?: number | null;
  referencia_texto?: string | null;
  metodologia?: string | null;
  conforme: boolean;
  ordem?: number;
}

// ── Templates padrão (espelham os moldes da Bepi Mataruco) ──────
const MET_FQ_GRANULO = 'IN MAPA nº 52/2011 (análise granulométrica por peneiramento mecânico).';

export interface TemplateEnsaioFQ {
  ensaio: string;
  unidade: string;
  referencia_texto: string;
  limite_min: number | null;
  limite_max: number | null;
  metodologia: string;
}

export const TEMPLATE_FISICO_QUIMICO: TemplateEnsaioFQ[] = [
  {
    ensaio: 'Teor de umidade',
    unidade: '% (base úmida)',
    referencia_texto: 'Máx. 5,0%',
    limite_min: null,
    limite_max: 5,
    metodologia: 'IN MAPA nº 52/2011 (determinação por secagem em estufa a 105 °C).',
  },
  {
    ensaio: 'Acidez',
    unidade: 'Porcentagem (%)',
    referencia_texto: 'Máx. 3,0%',
    limite_min: null,
    limite_max: 3,
    metodologia: 'IN MAPA nº 52/2011 (determinação de acidez titulável em produtos farináceos).',
  },
  {
    ensaio: 'Análise de granulometria peneira 10',
    unidade: 'Porcentagem (%)',
    referencia_texto: 'Vazar 100%',
    limite_min: 100,
    limite_max: null,
    metodologia: MET_FQ_GRANULO,
  },
  {
    ensaio: 'Análise de granulometria peneira 18',
    unidade: 'Porcentagem (%)',
    referencia_texto: 'Reter Máx. 10%',
    limite_min: null,
    limite_max: 10,
    metodologia: MET_FQ_GRANULO,
  },
  {
    ensaio: 'Análise de granulometria peneira 200 (fundo)',
    unidade: 'Porcentagem (%)',
    referencia_texto: 'Vazar Máx. 3,0%',
    limite_min: null,
    limite_max: 3,
    metodologia: MET_FQ_GRANULO,
  },
];

const MET_VISUAL = 'Inspeção visual conforme diretrizes do Codex CAC/RCP 1-1969 (peneira nº 10 - 2,00 mm).';

export const RESULTADO_VISUAL_OPCOES = ['Ausente', 'Não identificado', 'Identificado', 'Presente'] as const;

export interface TemplateItemVisual {
  ensaio: string;
  resultado: string; // valor padrão
  referencia_texto: string;
  metodologia: string;
}

export const TEMPLATE_VERIFICACAO_VISUAL: TemplateItemVisual[] = [
  { ensaio: 'Insetos inteiros (carunchos)', resultado: 'Ausente', referencia_texto: 'Ausência', metodologia: MET_VISUAL },
  { ensaio: 'Fragmentos de insetos', resultado: 'Não identificado', referencia_texto: 'Ausência', metodologia: MET_VISUAL },
  { ensaio: 'Ovos ou fezes', resultado: 'Não identificado', referencia_texto: 'Ausência', metodologia: MET_VISUAL },
  { ensaio: 'Outros contaminantes físicos', resultado: 'Não identificado', referencia_texto: 'Ausência', metodologia: MET_VISUAL },
];

export const AMOSTRAGEM_VISUAL_PADRAO =
  'Amostragem composta (200 g por big bag). Amostra homogeneizada. Inspeção visual por peneiramento manual com peneira metálica nº 10 (malha 2,00 mm).';

// Resultado visual é conforme quando não há contaminante presente/identificado.
export function resultadoVisualConforme(resultado: string): boolean {
  return resultado === 'Ausente' || resultado === 'Não identificado';
}
