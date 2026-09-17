// Situação de um ponto da rota de lubrificação.
//
// A frequência é texto livre no cadastro herdado da planilha, mas na prática só
// aparecem quatro palavras (semanal, quinzenal, mensal, trimestral, com ou sem
// o sufixo "-mente"). Quando a palavra não é reconhecida, o sistema não inventa
// prazo: devolve `sem_frequencia` e deixa a leitura com o mantenedor.

export const SITUACAO_LUBRIFICACAO = [
  'vencida', 'vencendo', 'em_dia', 'sem_registro', 'sem_frequencia',
] as const;
export type SituacaoLubrificacao = (typeof SITUACAO_LUBRIFICACAO)[number];

export const SITUACAO_LUBRIFICACAO_LABEL: Record<SituacaoLubrificacao, string> = {
  vencida: 'Vencida',
  vencendo: 'Vencendo',
  em_dia: 'Em dia',
  sem_registro: 'Sem registro',
  sem_frequencia: 'Sem frequência',
};

export const SITUACAO_LUBRIFICACAO_TOM: Record<SituacaoLubrificacao, string> = {
  vencida: 'bg-red-100 text-red-700',
  vencendo: 'bg-amber-100 text-amber-800',
  em_dia: 'bg-emerald-100 text-emerald-800',
  sem_registro: 'bg-slate-100 text-slate-600',
  sem_frequencia: 'bg-slate-100 text-slate-600',
};

/** Frequência textual do plano convertida em dias. Null = não reconhecida. */
export function frequenciaEmDias(frequencia: string | null | undefined): number | null {
  if (!frequencia) return null;
  const f = frequencia.toUpperCase();
  // A ordem importa: "QUINZENAL" contém "ZENAL", não "SEMANAL", mas
  // "SEMANALMENTE" contém "SEMANAL" — por isso testamos o mais específico antes.
  if (f.includes('QUINZEN')) return 15;
  if (f.includes('SEMANAL') || f.includes('SEMANA')) return 7;
  if (f.includes('TRIMESTRAL')) return 90;
  if (f.includes('BIMESTRAL')) return 60;
  if (f.includes('MENSAL')) return 30;
  if (f.includes('DIÁRIA') || f.includes('DIARIA') || f.includes('DIÁRIO') || f.includes('DIARIO')) return 1;
  return null;
}

// Quanto antes do vencimento o ponto começa a avisar. Proporcional ao ciclo:
// avisar com 7 dias de antecedência num ponto semanal seria avisar sempre, e
// avisar com 1 dia num trimestral não daria tempo de programar.
export function janelaDeAviso(dias: number): number {
  return Math.max(1, Math.round(dias * 0.2));
}

export interface SituacaoPonto {
  situacao: SituacaoLubrificacao;
  /** Data prevista da próxima lubrificação (ISO), quando calculável. */
  proxima: string | null;
  /** Dias até o vencimento. Negativo = atrasada. */
  diasRestantes: number | null;
  /** Dias desde a última execução. */
  diasDesdeUltima: number | null;
}

/**
 * Situação do ponto a partir da última execução e da frequência.
 * `hoje` e `ultima` em ISO (AAAA-MM-DD).
 */
export function situacaoLubrificacao(
  ultima: string | null | undefined,
  frequencia: string | null | undefined,
  hoje: string,
): SituacaoPonto {
  const dias = frequenciaEmDias(frequencia);
  if (!ultima) {
    // Sem registro é diferente de vencido: pode ser ponto novo ou execução que
    // ninguém lançou. Os dois pedem ação, mas não são a mesma coisa.
    return { situacao: 'sem_registro', proxima: null, diasRestantes: null, diasDesdeUltima: null };
  }
  const diasDesdeUltima = diferencaEmDias(ultima, hoje);
  if (dias == null) {
    return { situacao: 'sem_frequencia', proxima: null, diasRestantes: null, diasDesdeUltima };
  }
  const proxima = somarDiasISO(ultima, dias);
  const diasRestantes = diferencaEmDias(hoje, proxima);
  const situacao: SituacaoLubrificacao =
    diasRestantes < 0 ? 'vencida'
      : diasRestantes <= janelaDeAviso(dias) ? 'vencendo'
      : 'em_dia';
  return { situacao, proxima, diasRestantes, diasDesdeUltima };
}

/** Situação que pede ação do mantenedor. */
export function lubrificacaoPedeAcao(s: SituacaoLubrificacao): boolean {
  return s === 'vencida' || s === 'vencendo' || s === 'sem_registro';
}

// Ordem de urgência para listar: o que já venceu primeiro, depois o que vence.
const ORDEM: Record<SituacaoLubrificacao, number> = {
  vencida: 0, vencendo: 1, sem_registro: 2, sem_frequencia: 3, em_dia: 4,
};

export function compararUrgenciaLubrificacao(a: SituacaoPonto, b: SituacaoPonto): number {
  const d = ORDEM[a.situacao] - ORDEM[b.situacao];
  if (d !== 0) return d;
  return (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0);
}

// ── Datas, em calendário local e sem passar por fuso ───────────────────────
function partes(iso: string): [number, number, number] {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return [a ?? 1970, m ?? 1, d ?? 1];
}

function somarDiasISO(iso: string, n: number): string {
  const [a, m, d] = partes(iso);
  const dt = new Date(a, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

function diferencaEmDias(de: string, ate: string): number {
  const [a1, m1, d1] = partes(de);
  const [a2, m2, d2] = partes(ate);
  return Math.round(
    (new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / 86_400_000,
  );
}
