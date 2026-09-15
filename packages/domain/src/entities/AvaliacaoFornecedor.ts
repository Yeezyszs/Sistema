// Avaliação de desempenho de fornecedor — FOR-POP 07 1.2 Ver 02.
//
// Frequência semestral: preenchida em janeiro e julho. Cada critério recebe
// exclusivamente 1, 2 ou 3, com os textos do POP. A pontuação é a média dos
// quatro critérios (é o que a planilha faz: quatro notas 1 → pontuação 1) e a
// classificação sai da média na escala 1–3.

export const CRITERIO_AVALIACAO = ['cotacao', 'prazo_entrega', 'atendimento', 'nao_conformidades'] as const;
export type CriterioAvaliacao = (typeof CRITERIO_AVALIACAO)[number];

export type NotaCriterio = 1 | 2 | 3;

export const CRITERIO_LABEL: Record<CriterioAvaliacao, string> = {
  cotacao: 'Cotação',
  prazo_entrega: 'Prazo de entrega',
  atendimento: 'Atendimento',
  nao_conformidades: 'Nº de não conformidades',
};

// Os rótulos das notas são os do formulário, palavra por palavra.
export const CRITERIO_NOTAS: Record<CriterioAvaliacao, Record<NotaCriterio, string>> = {
  cotacao: { 1: 'Bom', 2: 'Praticável', 3: 'Ruim' },
  prazo_entrega: { 1: 'Dentro do prazo', 2: 'Até 2 dias de atraso', 3: 'Mais de 2 dias de atraso' },
  atendimento: { 1: 'Bom', 2: 'Moderável', 3: 'Ruim' },
  nao_conformidades: { 1: 'Máximo 3', 2: 'Entre 3 a 7', 3: 'Acima de 7' },
};

export type CriteriosAvaliacao = Record<CriterioAvaliacao, NotaCriterio>;

export const CLASSIFICACAO_AVALIACAO = ['aceitavel', 'aceitavel_com_restricao', 'nao_aceitavel'] as const;
export type ClassificacaoAvaliacao = (typeof CLASSIFICACAO_AVALIACAO)[number];

export const CLASSIFICACAO_FORNECEDOR_LABEL: Record<ClassificacaoAvaliacao, string> = {
  aceitavel: 'Aceitável',
  aceitavel_com_restricao: 'Aceitável com restrição',
  nao_aceitavel: 'Não aceitável',
};

export const CLASSIFICACAO_FORNECEDOR_TOM: Record<ClassificacaoAvaliacao, string> = {
  aceitavel: 'bg-emerald-100 text-emerald-800',
  aceitavel_com_restricao: 'bg-amber-100 text-amber-800',
  nao_aceitavel: 'bg-red-100 text-red-700',
};

export interface AvaliacaoFornecedor {
  id: string;
  org_id: string;
  fornecedor_id: string;
  periodo: string; // 'AAAA-01' (janeiro) ou 'AAAA-07' (julho)
  criterios: CriteriosAvaliacao | null;
  pontuacao: number | null;
  classificacao: ClassificacaoAvaliacao | null;
  avaliador_id: string | null;
  avaliado_em: string;
  observacao: string | null;
  responsavel: string | null;
  created_at: string;
  created_by: string | null;
}

/** Média dos quatro critérios, arredondada em duas casas. */
export function pontuacaoAvaliacao(c: CriteriosAvaliacao): number {
  const soma = CRITERIO_AVALIACAO.reduce((t, k) => t + c[k], 0);
  return Math.round((soma / CRITERIO_AVALIACAO.length) * 100) / 100;
}

/** Classificação a partir da pontuação, em terços da escala 1–3. */
export function classificacaoAvaliacao(pontuacao: number): ClassificacaoAvaliacao {
  if (pontuacao <= 1.66) return 'aceitavel';
  if (pontuacao <= 2.33) return 'aceitavel_com_restricao';
  return 'nao_aceitavel';
}

// As faixas do formulário se sobrepõem ("máximo 3" e "entre 3 a 7" incluem o 3).
// Resolvemos pela leitura mais branda ao fornecedor: 3 ainda é nota 1.
export function notaPorNumeroDeNCs(quantidade: number): NotaCriterio {
  if (quantidade <= 3) return 1;
  if (quantidade <= 7) return 2;
  return 3;
}

/** Os dois períodos de um ano, na ordem em que são preenchidos. */
export function periodosDoAno(ano: number): [string, string] {
  return [`${ano}-01`, `${ano}-07`];
}

/** Período semestral vigente na data informada. */
export function periodoVigente(data = new Date()): string {
  const semestre = data.getMonth() < 6 ? '01' : '07';
  return `${data.getFullYear()}-${semestre}`;
}

export function rotuloPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-');
  return `${mes === '01' ? 'Jan' : 'Jul'}/${ano}`;
}

/** Intervalo [início, fim] de datas ISO coberto pelo período. */
export function intervaloDoPeriodo(periodo: string): [string, string] {
  const [ano, mes] = periodo.split('-');
  return mes === '01' ? [`${ano}-01-01`, `${ano}-06-30`] : [`${ano}-07-01`, `${ano}-12-31`];
}
