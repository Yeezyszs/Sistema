// Questionário de homologação de produtor de mandioca (FOR POP 07 1.1).
//
// Visita ao produtor antes de comprar: 40 pontos de verificação em 8 blocos,
// cada um Conforme / Não conforme / Não aplicável. O bloco de produção
// orgânica só vale para quem declara produção orgânica — para o convencional
// ele nem aparece, e não conta.
import type { StatusHomologacao } from './Recebimentoqa';

export type RespostaHomologacao = 'c' | 'nc' | 'na';
export type RespostasHomologacao = Record<string, RespostaHomologacao>;

export interface ItemHomologacao {
  n: number;
  texto: string;
  /** O formulário pede para "citar" algo junto da resposta. */
  citar?: string;
}

export interface BlocoHomologacao {
  titulo: string;
  /** Só aparece para produção orgânica. */
  soOrganico?: boolean;
  itens: ItemHomologacao[];
}

export const BLOCOS_HOMOLOGACAO: BlocoHomologacao[] = [
  {
    titulo: 'Identificação e controle da propriedade',
    itens: [
      { n: 1, texto: 'Produtor e propriedade estão formalmente identificados? (CAD/PRO)' },
      { n: 2, texto: 'A área de cultivo de mandioca está identificada e sua localização pode ser confirmada?' },
      { n: 3, texto: 'A área é própria ou arrendada?' },
      { n: 4, texto: 'O uso anterior da área é conhecido?', citar: 'Uso anterior da área' },
      { n: 5, texto: 'Existem outras culturas/atividades próximas que possam representar risco de contaminação?', citar: 'Culturas/atividades próximas' },
    ],
  },
  {
    titulo: 'Produção e boas práticas agrícolas',
    itens: [
      { n: 6, texto: 'Há rotina definida para plantio, manejo e colheita?' },
      { n: 7, texto: 'A área apresenta condições gerais adequadas de higiene e conservação?' },
      { n: 8, texto: 'Há controle de contaminação por fezes, animais, resíduos ou materiais estranhos?' },
      { n: 9, texto: 'Ferramentas e equipamentos usados no manejo e colheita estão em condições adequadas?' },
      { n: 10, texto: 'Há orientação aos trabalhadores sobre higiene e boas práticas, quando aplicável?' },
      { n: 11, texto: 'Há medidas de controle de pragas na área?' },
    ],
  },
  {
    titulo: 'Insumos e perigos químicos',
    itens: [
      { n: 12, texto: 'Quando aplicável, existem registros de aplicação e manejo?' },
      { n: 13, texto: 'Os produtos químicos estão identificados e armazenados adequadamente?' },
      { n: 14, texto: 'Há controle para evitar contaminação da mandioca por produtos químicos?' },
      { n: 15, texto: 'Os períodos de carência/restrições de uso são respeitados?' },
      { n: 16, texto: 'Agrotóxicos utilizados (herbicidas, inseticidas e acaricidas)?', citar: 'Agrotóxicos utilizados' },
    ],
  },
  {
    titulo: 'Colheita, qualidade e contaminação',
    itens: [
      { n: 17, texto: 'A colheita e o carregamento são realizados de forma a evitar contaminação?' },
      { n: 18, texto: 'Há prevenção durante a colheita de pedras, madeira, metal, vidro, plástico duro ou outros materiais estranhos?' },
      { n: 19, texto: 'Há controle de raízes deterioradas e apodrecidas?' },
      { n: 20, texto: 'Há controle de excesso de terra e sujeira?' },
      { n: 21, texto: 'Há controle de raízes com sinais de pragas ou danos incompatíveis?' },
      { n: 22, texto: 'A mandioca fornecida atende ao critério de aceitação acordado com a empresa?' },
    ],
  },
  {
    titulo: 'Transporte e carregamento',
    itens: [
      { n: 23, texto: 'O veículo utilizado é adequado para transporte da mandioca?' },
      { n: 24, texto: 'O veículo está limpo e em condições adequadas antes do carregamento?' },
      { n: 25, texto: 'Não há resíduos ou produtos químicos de cargas anteriores que possam contaminar a mandioca?' },
      { n: 26, texto: 'A carga é protegida contra contaminação durante o transporte?' },
      { n: 27, texto: 'É possível identificar a origem da carga e relacioná-la ao produtor ou propriedade?' },
    ],
  },
  {
    titulo: 'Produção orgânica',
    soOrganico: true,
    itens: [
      { n: 28, texto: 'O produtor declara formalmente que a produção é orgânica?' },
      { n: 29, texto: 'Existe certificado de conformidade orgânica vigente?' },
      { n: 30, texto: 'O certificado contempla o produtor, a propriedade e a mandioca fornecida?' },
      { n: 31, texto: 'É possível identificar no certificado qual o mercado compatível para a produção?', citar: 'Mercado compatível' },
      { n: 32, texto: 'Quando aplicável, é possível confirmar o produtor no sistema oficial/CNPO?' },
      { n: 33, texto: 'Os insumos utilizados são conhecidos e compatíveis com o sistema de produção orgânica aplicável?' },
      { n: 34, texto: 'Há medidas para evitar uso/contaminação por insumos ou práticas não permitidos?' },
      { n: 35, texto: 'Os lotes orgânicos podem ser identificados e rastreados até a propriedade?' },
      { n: 36, texto: 'O produtor se compromete a comunicar suspensão, cancelamento ou alteração da certificação?' },
    ],
  },
  {
    titulo: 'Rastreabilidade e documentos',
    itens: [
      { n: 37, texto: 'Existe documento fiscal/registro comercial que permita rastrear a entrega?' },
      { n: 38, texto: 'O produtor consegue apresentar os documentos quando solicitados?' },
    ],
  },
  {
    titulo: 'Não conformidades e conclusão',
    itens: [
      { n: 39, texto: 'Foram identificadas não conformidades? Registrar evidência objetiva.' },
      { n: 40, texto: 'O produtor aceita os requisitos técnicos e permite visitas/solicitação de documentos pela empresa?' },
    ],
  },
];

/** Agrotóxicos permitidos (declaração do formulário). */
export const AGROTOXICOS_PERMITIDOS = [
  'Metribuzin', 'Bacillus thuringiensis', 'Beta-ciflutrina', 'Clethodim',
  'Clomazone', 'Dimetenamida-p', 'Lufenuron', 'Ametryn',
] as const;

export const DECLARACAO_AGROTOXICOS =
  'Declaro estar ciente de que devo utilizar somente agrotóxicos listados acima para o tipo de produção declarado, ' +
  'não utilizando produtos proibidos ou que contenham isoxaflutol, incluindo Fordor 750 WG e Provence 750 WG. ' +
  'Para produção orgânica, declaro-me ciente de que não devo utilizar qualquer agrotóxico ou os herbicidas nos ' +
  'plantios destinados à empresa. Declaro que as informações prestadas são verdadeiras e comunicarei qualquer ' +
  'alteração que possa afetar o atendimento aos requisitos acordados.';

/** Os blocos que valem para o tipo de produção. */
export function blocosAplicaveis(organico: boolean): BlocoHomologacao[] {
  return BLOCOS_HOMOLOGACAO.filter((b) => organico || !b.soOrganico);
}

export interface ResumoHomologacao {
  total: number;
  respondidos: number;
  conformes: number;
  naoConformes: number[];
  naoAplicaveis: number;
  /** % de conformes entre os itens aplicáveis respondidos; null se nenhum. */
  pontuacao: number | null;
  completo: boolean;
}

export function resumoHomologacao(respostas: RespostasHomologacao, organico: boolean): ResumoHomologacao {
  const itens = blocosAplicaveis(organico).flatMap((b) => b.itens);
  let respondidos = 0, conformes = 0, naoAplicaveis = 0;
  const naoConformes: number[] = [];
  for (const i of itens) {
    const r = respostas[String(i.n)];
    if (!r) continue;
    respondidos++;
    if (r === 'c') conformes++;
    else if (r === 'nc') naoConformes.push(i.n);
    else naoAplicaveis++;
  }
  const aplicaveis = conformes + naoConformes.length;
  return {
    total: itens.length,
    respondidos,
    conformes,
    naoConformes,
    naoAplicaveis,
    pontuacao: aplicaveis > 0 ? Math.round((conformes / aplicaveis) * 1000) / 10 : null,
    completo: respondidos === itens.length,
  };
}

/** Questionário completo e sem NC → qualificado. Qualquer NC deixa em análise
 *  até a Qualidade decidir — desqualificar é decisão de quem avalia. */
export function statusSugeridoHomologacao(resumo: ResumoHomologacao): StatusHomologacao {
  return resumo.completo && resumo.naoConformes.length === 0 ? 'qualificado' : 'em_analise';
}
