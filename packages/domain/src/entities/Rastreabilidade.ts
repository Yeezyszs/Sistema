// Rastreabilidade (FOR POP 08 1.6): de qual carga de mandioca veio cada bag.
//
// Regra da fábrica: a carga leva ~40 min para descarregar e mais 30–40 min
// até a massa chegar ao ensaque. Então uma carga começa a "sair" no ensaque
// em (início da descarga + atraso) e continua saindo até a carga seguinte
// assumir. Cada bag é da carga cuja entrada no ensaque é a mais recente antes
// da saída dele.

export const ATRASO_ENSAQUE_MIN = 70;
export const RENDIMENTO_ESTIMADO = 0.27;

export interface LoteBag {
  id: string;
  org_id: string;
  lote_id: string;
  numero: number;
  saiu_em: string;
  peso_kg: number | null;
  lacre: string | null;
  created_at: string;
  created_by: string | null;
}
export type NovoLoteBag = Pick<LoteBag, 'lote_id' | 'numero' | 'saiu_em'> & Partial<Pick<LoteBag, 'peso_kg' | 'lacre'>>;

export interface CargaParaRastreio {
  id: string;
  /** Início da descarga (timestamp completo). */
  inicio: Date;
  produtor: string;
  quantidade: number | null;
}

export interface OrigemCarga<C extends CargaParaRastreio> {
  carga: C;
  /** Quando a massa dessa carga começa a chegar ao ensaque. */
  entraNoEnsaque: Date;
  bags: number[];
  kgBags: number;
  /** kg de farinha esperados da carga (quantidade × rendimento). */
  kgEsperado: number | null;
}

/** Junta data (AAAA-MM-DD) e hora (HH:MM[:SS]) em horário local. */
export function juntarDataHora(data: string, hora: string): Date {
  return new Date(`${data.slice(0, 10)}T${hora.slice(0, 5)}:00`);
}

/** Bags distribuídos por igual entre o início e o fim da produção. */
export function distribuirBags(inicio: Date, fim: Date, quantidade: number, primeiroNumero = 1): { numero: number; saiu_em: Date }[] {
  if (quantidade <= 0) return [];
  const passo = quantidade === 1 ? 0 : (fim.getTime() - inicio.getTime()) / (quantidade - 1);
  return Array.from({ length: quantidade }, (_, i) => ({
    numero: primeiroNumero + i,
    saiu_em: new Date(inicio.getTime() + passo * i),
  }));
}

/**
 * Atribui cada bag a uma carga. Bag que sai antes de qualquer carga entrar
 * no ensaque fica sem origem (massa de antes do período olhado).
 */
export function origemDosBags<C extends CargaParaRastreio>(
  bags: Pick<LoteBag, 'numero' | 'saiu_em' | 'peso_kg'>[],
  cargas: C[],
  atrasoMin = ATRASO_ENSAQUE_MIN,
  rendimento = RENDIMENTO_ESTIMADO,
): { origens: OrigemCarga<C>[]; semOrigem: number[] } {
  const ordenadas = [...cargas].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const origens: OrigemCarga<C>[] = ordenadas.map((carga) => ({
    carga,
    entraNoEnsaque: new Date(carga.inicio.getTime() + atrasoMin * 60_000),
    bags: [],
    kgBags: 0,
    kgEsperado: carga.quantidade != null ? Math.round(carga.quantidade * rendimento) : null,
  }));
  const semOrigem: number[] = [];
  for (const bag of [...bags].sort((a, b) => a.numero - b.numero)) {
    const t = new Date(bag.saiu_em).getTime();
    let escolhida: OrigemCarga<C> | null = null;
    for (const o of origens) if (o.entraNoEnsaque.getTime() <= t) escolhida = o;
    if (!escolhida) { semOrigem.push(bag.numero); continue; }
    escolhida.bags.push(bag.numero);
    escolhida.kgBags += bag.peso_kg ?? 0;
  }
  return { origens: origens.filter((o) => o.bags.length > 0), semOrigem };
}

/** "1 a 14", "15", "3, 5 a 7" — como o relatório escreve as faixas. */
export function faixasDeBags(numeros: number[]): string {
  const n = [...new Set(numeros)].sort((a, b) => a - b);
  const partes: string[] = [];
  for (let i = 0; i < n.length; i++) {
    let j = i;
    while (j + 1 < n.length && n[j + 1] === n[j]! + 1) j++;
    partes.push(i === j ? `${n[i]}` : `${n[i]} a ${n[j]}`);
    i = j;
  }
  return partes.join(', ');
}

// ── Teste de rastreabilidade / recolhimento ────────────────────
export interface TesteRastreabilidade {
  id: string;
  org_id: string;
  lote_id: string;
  data: string;
  inicio_rastreio: string | null;
  fim_rastreio: string | null;
  cliente: string | null;
  contato_em: string | null;
  resposta_em: string | null;
  kg_vendido: number | null;
  kg_no_cliente: number | null;
  kg_recuperavel: number | null;
  conclusao: string | null;
  created_at: string;
  created_by: string | null;
}
export type NovoTesteRastreabilidade = Omit<TesteRastreabilidade, 'id' | 'org_id' | 'created_at' | 'created_by'>;

/** Minutos entre duas horas HH:MM do mesmo dia; null se faltar uma. */
export function minutosEntre(de: string | null, ate: string | null): number | null {
  if (!de || !ate) return null;
  const m = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  return m(ate) - m(de);
}

/** % do que estava fora da fábrica que foi localizado (no cliente + recuperável). */
export function eficaciaRecolhimento(t: Pick<TesteRastreabilidade, 'kg_vendido' | 'kg_no_cliente' | 'kg_recuperavel'>): number | null {
  if (!t.kg_vendido) return null;
  const localizado = (t.kg_no_cliente ?? 0) + (t.kg_recuperavel ?? 0);
  return Math.round((localizado / t.kg_vendido) * 1000) / 10;
}
