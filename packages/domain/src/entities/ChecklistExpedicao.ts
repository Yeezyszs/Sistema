// Checklist de expedição (FOR POP 14 1.1), a cada carregamento.
//
// A Logística responde as seções 1 e 2 ao montar a carga; a Qualidade
// responde as seções 3 e 4 e dá o resultado. Os itens 2 e 3 da seção 1 são
// perguntas "há indícios de…?" — Conforme é não haver.

export type RespostaExpedicao = 'c' | 'nc' | 'na';
export type ChecklistExpedicao = Partial<Record<string, RespostaExpedicao>>;

export interface ItemExpedicao { chave: string; texto: string; permiteNa?: boolean }
export interface SecaoExpedicao { titulo: string; quem: 'logistica' | 'qualidade'; itens: ItemExpedicao[] }

export const SECOES_EXPEDICAO: SecaoExpedicao[] = [
  {
    titulo: 'Seção 1 — Inspeção veicular', quem: 'logistica', itens: [
      { chave: 'L1', texto: 'Veículo limpo, sem aparência de sujidades que possam comprometer a segurança do produto?' },
      { chave: 'L2', texto: 'Sem indícios de que o veículo tenha transportado produtos químicos?' },
      { chave: 'L3', texto: 'Sem indícios de que o veículo tenha transportado produtos contendo alérgenos?' },
      { chave: 'L4', texto: 'Caminhão vedado internamente, sem aberturas ou infiltrações (água, poeira, pragas)?' },
      { chave: 'L5', texto: 'Pallets da carga íntegros, secos e livres de umidade, sujeira, farpas ou danos?' },
    ],
  },
  {
    titulo: 'Seção 2 — Produto', quem: 'logistica', itens: [
      { chave: 'L6', texto: 'Produto inspecionado visualmente em todas as etapas (sem pragas, umidade ou contaminação)?' },
      { chave: 'L7', texto: 'Etiquetas conferidas (data, lote, validade e produto) e condizentes com o pedido?' },
      { chave: 'L8', texto: 'Todos os bags lacrados, íntegros e devidamente identificados?' },
      { chave: 'L9', texto: 'Produto sobre pallets limpos e em boas condições, respeitando a integridade das embalagens?' },
      { chave: 'L10', texto: 'Bags inspecionados nas laterais, parte superior e inferior (sem bolor, umidade ou contaminação)?' },
    ],
  },
  {
    titulo: 'Seção 3 — Inspeção veicular (Qualidade)', quem: 'qualidade', itens: [
      { chave: 'Q1', texto: 'Veículo limpo, sem aparência de sujidades que possam comprometer a segurança do produto?' },
      { chave: 'Q2', texto: 'Sem indícios de que o veículo tenha transportado produtos contendo alérgenos?' },
      { chave: 'Q3', texto: 'Veículo sem a presença de odores estranhos?' },
    ],
  },
  {
    titulo: 'Seção 4 — Produto (Qualidade)', quem: 'qualidade', itens: [
      { chave: 'Q4', texto: 'Bags/sacarias limpos, sem rasgos, vazamentos ou produto exposto (parte superior e laterais)?', permiteNa: true },
      { chave: 'Q5', texto: 'Produto sem contaminantes, pragas ou outra contaminação que afete a segurança do alimento?', permiteNa: true },
      { chave: 'Q6', texto: 'Produto sem a presença de odores estranhos?', permiteNa: true },
      { chave: 'Q7', texto: 'Acompanha laudo?', permiteNa: true },
    ],
  },
];

export const LIBERACAO_CARGA = ['aprovado', 'aprovado_restricao', 'reprovado'] as const;
export type LiberacaoCarga = (typeof LIBERACAO_CARGA)[number];
export const LIBERACAO_CARGA_LABEL: Record<LiberacaoCarga, string> = {
  aprovado: 'Aprovado',
  aprovado_restricao: 'Aprovado com restrição',
  reprovado: 'Reprovado',
};

function itensDe(quem: 'logistica' | 'qualidade'): ItemExpedicao[] {
  return SECOES_EXPEDICAO.filter((s) => s.quem === quem).flatMap((s) => s.itens);
}

/** Itens de quem ainda sem resposta. */
export function pendentesExpedicao(c: ChecklistExpedicao | null | undefined, quem: 'logistica' | 'qualidade'): string[] {
  return itensDe(quem).filter((i) => !c?.[i.chave]).map((i) => i.chave);
}

/** Itens marcados como não conforme (das duas partes). */
export function ncsExpedicao(c: ChecklistExpedicao | null | undefined): string[] {
  return SECOES_EXPEDICAO.flatMap((s) => s.itens).filter((i) => c?.[i.chave] === 'nc').map((i) => i.chave);
}

/** Resultado sugerido: com NC não aprova direto — a Qualidade decide entre
 *  restrição e reprovação. */
export function liberacoesPermitidas(c: ChecklistExpedicao | null | undefined): LiberacaoCarga[] {
  return ncsExpedicao(c).length > 0 ? ['aprovado_restricao', 'reprovado'] : [...LIBERACAO_CARGA];
}

/** Situação da carga para a lista. */
export function situacaoExpedicao(
  carga: { checklist: ChecklistExpedicao | null; liberacao: LiberacaoCarga | null; status: string },
): 'cancelada' | 'logistica_pendente' | 'aguardando_qualidade' | LiberacaoCarga {
  if (carga.status === 'cancelado') return 'cancelada';
  if (carga.liberacao) return carga.liberacao;
  if (pendentesExpedicao(carga.checklist, 'logistica').length > 0) return 'logistica_pendente';
  return 'aguardando_qualidade';
}
