// Avaliação de desempenho de fornecedor — FOR-POP 07 1.2 Ver 02.
//
// Frequência semestral: preenchida em janeiro e julho. Cada critério continua
// com as três faixas do POP (guardadas como 1, 2 e 3 em `criterios`), mas a
// pontuação agora é de 0 a 100, maior é melhor: cada critério vale até 25
// pontos — faixa boa 25, intermediária 15, ruim 0 — e a pontuação é a soma.
// Fornecedor com tudo em ordem fecha 100.

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

/** Pontos de cada faixa. Quatro critérios × 25 = 100. */
export const PONTOS_POR_NOTA: Record<NotaCriterio, number> = { 1: 25, 2: 15, 3: 0 };
export const PONTUACAO_MAXIMA = 100;

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

/** Soma dos pontos dos quatro critérios (0 a 100). */
export function pontuacaoAvaliacao(c: CriteriosAvaliacao): number {
  return CRITERIO_AVALIACAO.reduce((t, k) => t + PONTOS_POR_NOTA[c[k]], 0);
}

/**
 * 80 ou mais: aceitável — até dois critérios na faixa intermediária.
 * 60 a 79: aceitável com restrição — três intermediários, ou um critério ruim.
 * Abaixo de 60: não aceitável.
 */
export function classificacaoAvaliacao(pontuacao: number): ClassificacaoAvaliacao {
  if (pontuacao >= 80) return 'aceitavel';
  if (pontuacao >= 60) return 'aceitavel_com_restricao';
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
