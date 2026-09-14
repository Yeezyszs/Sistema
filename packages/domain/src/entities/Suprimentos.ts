// Suprimentos — a compra de mandioca.
//
// O comprador planeja a semana em CARGAS e a balança registra em QUILOS. A
// tonelagem varia por produtor, então não existe conversão entre os dois: a
// previsão compara carga com carga, e todo cálculo de dinheiro usa o peso real.

export const FORMA_PAGAMENTO = ['30_dias', 'avista', 'adiantamento'] as const;
export type FormaPagamento = (typeof FORMA_PAGAMENTO)[number];

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  '30_dias': '30 dias',
  avista: 'À vista',
  adiantamento: 'Adiantamento',
};

// As variedades que aparecem nas previsões do comprador. Lista aberta: o campo
// aceita outras, isto é só o atalho da tela.
export const VARIEDADES_MANDIOCA = ['Olho Junto', 'Ocauçu', 'Paraguaia'] as const;

// ── A conta do preço ───────────────────────────────────────────────────────
//
// A renda é a leitura da balança hidrostática, em gramas. O rendimento — quanto
// de farinha sai de uma tonelada de raiz — é uma reta em função dela.
//
// A planilha do comprador usava uma tabela de 850 linhas para esse valor.
// Conferida linha a linha, ela é exatamente a reta abaixo (erro máximo de
// 1e-16), então aqui é uma conta, não uma tabela para manter.
const RENDIMENTO_BASE = 0.0766323226;
const RENDIMENTO_POR_GRAMA = 0.0003739932;

export function rendimentoRaiz(renda: number | null): number | null {
  if (renda == null || renda <= 0) return null;
  return RENDIMENTO_BASE + RENDIMENTO_POR_GRAMA * renda;
}

/** Quanto custa a tonelada de farinha ao comprar essa raiz. */
export function custoTFarinha(renda: number | null, precoRenda: number | null): number | null {
  const rend = rendimentoRaiz(renda);
  if (rend == null || precoRenda == null || renda == null) return null;
  return (renda * precoRenda) / rend;
}

/** Preço da tonelada de raiz: é o que se paga ao produtor por tonelada. */
export function precoTRaiz(renda: number | null, precoRenda: number | null): number | null {
  if (renda == null || precoRenda == null) return null;
  return renda * precoRenda;
}

/** Valor de uma carga, a partir do peso real da balança. */
export function valorDaCarga(
  kg: number | null, renda: number | null, precoRenda: number | null,
): number | null {
  const porTonelada = precoTRaiz(renda, precoRenda);
  if (kg == null || porTonelada == null) return null;
  return (kg / 1000) * porTonelada;
}

/** Teto de custo da tonelada de farinha: uma fração do preço da farinha. */
export function tetoCusto(precoFarinha: number | null, tetoPct: number): number | null {
  if (precoFarinha == null) return null;
  return (precoFarinha * tetoPct) / 100;
}

// Renda máxima que ainda cabe no teto, ao preço do dia.
//
// Este é o número que o comprador usa na hora de fechar. A conta sai de
// resolver (r·p)/(a + b·r) = T para r, o que dá r = T·a / (p − T·b).
//
// Consequência que não é óbvia: como o rendimento tem uma base que existe
// mesmo com renda baixa, pagar proporcional à renda encarece a farinha quando
// a raiz é muito boa. Por isso existe um teto de renda, e não um piso.
//
// Quando o denominador é zero ou negativo o custo nunca alcança o teto: não há
// limite, e devolver null é mais honesto que devolver um número.
export function rendaMaxima(
  precoRenda: number | null, precoFarinha: number | null, tetoPct = 58,
): number | null {
  const teto = tetoCusto(precoFarinha, tetoPct);
  if (precoRenda == null || teto == null) return null;
  const den = precoRenda - teto * RENDIMENTO_POR_GRAMA;
  if (den <= 0) return null;
  return (teto * RENDIMENTO_BASE) / den;
}

/** Sobra (ou falta) por tonelada de farinha contra o teto. */
export function folgaNoTeto(
  renda: number | null, precoRenda: number | null, precoFarinha: number | null, tetoPct = 58,
): number | null {
  const custo = custoTFarinha(renda, precoRenda);
  const teto = tetoCusto(precoFarinha, tetoPct);
  if (custo == null || teto == null) return null;
  return teto - custo;
}

// ── Parâmetros da semana ───────────────────────────────────────────────────
export interface ParametrosSemana {
  id: string;
  org_id: string;
  semana_inicio: string;
  preco_renda: number;
  preco_farinha: number;
  teto_pct: number;
  created_at: string;
  created_by: string | null;
}

export interface NovosParametrosSemana {
  semana_inicio: string;
  preco_renda: number;
  preco_farinha: number;
  teto_pct?: number;
}

// ── Previsão da semana ─────────────────────────────────────────────────────
export interface PrevisaoSemana {
  id: string;
  org_id: string;
  semana_inicio: string;
  fornecedor_id: string;
  variedade: string | null;
  pagamento: FormaPagamento | null;
  confirmado: boolean;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
}

export interface PrevisaoDia {
  id: string;
  org_id: string;
  previsao_id: string;
  data: string;
  cargas: number;
}
