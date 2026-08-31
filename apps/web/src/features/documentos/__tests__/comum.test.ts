import { describe, expect, it, afterEach, vi } from 'vitest';
import { diasAte, corVencimento } from '../comum';

// Datas relativas precisam de "hoje" fixo, senão o teste muda de resultado
// conforme o dia em que roda.
function fixarHoje(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${iso}T12:00:00`));
}
afterEach(() => vi.useRealTimers());

describe('diasAte', () => {
  it('conta os dias que faltam', () => {
    fixarHoje('2026-06-15');
    expect(diasAte('2026-06-20')).toBe(5);
    expect(diasAte('2026-06-15')).toBe(0);
  });

  it('devolve negativo para data passada', () => {
    fixarHoje('2026-06-15');
    expect(diasAte('2026-06-10')).toBe(-5);
  });

  it('não tropeça no fuso ao virar o mês ou o ano', () => {
    fixarHoje('2026-12-31');
    expect(diasAte('2027-01-01')).toBe(1);
    fixarHoje('2026-03-01');
    expect(diasAte('2026-02-28')).toBe(-1);
  });

  it('sem data não há contagem', () => {
    expect(diasAte(null)).toBeNull();
    expect(diasAte('')).toBeNull();
  });
});

describe('corVencimento', () => {
  it('vencido em vermelho, próximo em âmbar, distante neutro', () => {
    fixarHoje('2026-06-15');
    expect(corVencimento('2026-06-10')).toContain('red');
    expect(corVencimento('2026-06-20')).toContain('amber');
    expect(corVencimento('2026-12-31')).toContain('slate');
  });

  it('a fronteira do alerta é 30 dias', () => {
    fixarHoje('2026-06-15');
    expect(corVencimento('2026-07-15')).toContain('amber'); // 30 dias
    expect(corVencimento('2026-07-16')).toContain('slate'); // 31 dias
  });
});
