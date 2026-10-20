// Entrada de matéria-prima (etapa Descarga) — producao.recebimentos.
// Espelha o "CONTROLE DE CARGAS": nº carga, turno, ticket, produtor, peso,
// renda (rendimento), cancha (local de descarga) e variedade.
export const TURNO = ['diurno', 'noturno'] as const;
export type Turno = (typeof TURNO)[number];
export const TURNO_LABEL: Record<Turno, string> = {
  diurno: 'Diurno',
  noturno: 'Noturno',
};

export interface Recebimento {
  id: string;
  org_id: string;
  numero: number | null; // nº da carga (sequencial por org)
  fornecedor_id: string | null; // vínculo opcional com core.fornecedores
  produtor: string | null; // produtor (texto livre, como no Controle de Cargas)
  produto_id: string;
  lote_mp: string | null;
  variedade: string | null;
  quantidade: number | null; // peso (kg)
  renda: number | null; // rendimento
  cancha: string | null; // local de descarga (1/2)
  turno: Turno | null;
  ticket: string | null;
  hora_inicio: string | null; // início da descarga (HH:MM)
  hora_fim: string | null; // fim da descarga (HH:MM)
  recebido_em: string; // ISO timestamp
  // ── Suprimentos ──
  /** Linha da previsão que esta carga cumpre. Null = chegou sem estar previsto
   *  — acontece, e o sistema não pode recusar o caminhão que está no pátio. */
  previsao_id: string | null;
  /** Parâmetros da semana copiados no lançamento: mudar o preço de hoje não
   *  pode reescrever o custo das cargas antigas. */
  preco_renda: number | null;
  preco_farinha: number | null;
  teto_pct: number | null;
  // ── Qualidade (FOR POP 09 1.2 e 1.5) ──
  rendas: number[] | null; // as 5 amostras; `renda` é a média delas
  impureza: number | null; // %
  placa: string | null;
  tipo_mp: TipoMp | null;
  inspecao: InspecaoCarga | null;
  inspecao_obs: string | null;
  created_at: string;
  created_by: string | null;
}

// Payload para registrar um recebimento (sem colunas gerenciadas pelo banco).
export interface NovoRecebimento {
  fornecedor_id: string | null;
  produtor: string | null;
  produto_id: string;
  variedade: string | null;
  quantidade: number | null;
  renda: number | null;
  cancha: string | null;
  turno: Turno | null;
  ticket: string | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  recebido_em: string;
  // Preenchidos pela tela de chegada: a linha da previsão que esta carga
  // cumpre e os preços da semana congelados no momento do lançamento.
  previsao_id?: string | null;
  preco_renda?: number | null;
  preco_farinha?: number | null;
  teto_pct?: number | null;
  rendas?: number[] | null;
  impureza?: number | null;
  placa?: string | null;
  tipo_mp?: TipoMp | null;
  inspecao?: InspecaoCarga | null;
  inspecao_obs?: string | null;
}

// ── Inspeção da carga (FOR POP 09 1.5) ─────────────────────────
export const TIPO_MP = ['convencional', 'organica'] as const;
export type TipoMp = (typeof TIPO_MP)[number];
export const TIPO_MP_LABEL: Record<TipoMp, string> = {
  convencional: 'Convencional',
  organica: 'Orgânica',
};

// Os itens do formulário. A pergunta é feita como no papel ("presença de…"),
// mas a resposta é sempre Conforme / Não conforme — "presença de pragas" é NC.
export const ITENS_INSPECAO_CARGA = [
  { chave: 'coberta', texto: 'Carga devidamente coberta, protegida de chuva e sujeira durante o transporte?' },
  { chave: 'corpos_estranhos', texto: 'Presença de corpos estranhos (plástico, madeira, metal, etc.)?' },
  { chave: 'impurezas', texto: 'Presença excessiva de impurezas (terra, folhas, galhos, etc.)?' },
  { chave: 'podre', texto: 'Presença de mandioca podre, fermentada ou deteriorada?' },
  { chave: 'odor', texto: 'Presença de odor anormal (azedo, fermentado, mofado, etc.)?' },
  { chave: 'pragas', texto: 'Presença de pragas, animais ou sinais de infestação?' },
] as const;
export type ItemInspecaoCarga = (typeof ITENS_INSPECAO_CARGA)[number]['chave'];
export type InspecaoCarga = Partial<Record<ItemInspecaoCarga, 'c' | 'nc'>>;

/** Média das amostras de renda preenchidas; null se nenhuma. */
export function mediaRendas(rendas: readonly (number | null | undefined)[]): number | null {
  const validas = rendas.filter((r): r is number => typeof r === 'number' && Number.isFinite(r) && r > 0);
  if (validas.length === 0) return null;
  return Math.round((validas.reduce((s, r) => s + r, 0) / validas.length) * 10) / 10;
}

/** Itens marcados como não conforme. */
export function itensNaoConformes(inspecao: InspecaoCarga | null | undefined): ItemInspecaoCarga[] {
  if (!inspecao) return [];
  return ITENS_INSPECAO_CARGA.filter((i) => inspecao[i.chave] === 'nc').map((i) => i.chave);
}

/** Situação da inspeção: sem inspeção, incompleta, conforme ou com NC. */
export function situacaoInspecaoCarga(
  inspecao: InspecaoCarga | null | undefined,
): 'sem_inspecao' | 'incompleta' | 'conforme' | 'nao_conforme' {
  if (!inspecao || Object.keys(inspecao).length === 0) return 'sem_inspecao';
  if (itensNaoConformes(inspecao).length > 0) return 'nao_conforme';
  const respondidos = ITENS_INSPECAO_CARGA.filter((i) => inspecao[i.chave]).length;
  return respondidos === ITENS_INSPECAO_CARGA.length ? 'conforme' : 'incompleta';
}
