import { describe, expect, it } from 'vitest';
import {
  formatarData,
  hojeLocalISO,
  formatarQuantidade,
  formatarDuracao,
} from '../format';

describe('formatarData', () => {
  // Regressão: a produção lançada no dia 20 aparecia como dia 19. `new Date`
  // lê "2026-07-20" como meia-noite UTC, e o fuso do Brasil (−3h) volta um dia.
  it('não desloca a data por causa do fuso', () => {
    expect(formatarData('2026-07-20')).toBe('20/07/2026');
    expect(formatarData('2026-01-01')).toBe('01/01/2026');
    expect(formatarData('2026-12-31')).toBe('31/12/2026');
  });

  it('formata timestamp completo', () => {
    expect(formatarData('2026-07-20T15:30:00-03:00')).toBe('20/07/2026');
  });

  it('mostra travessão quando não há data', () => {
    expect(formatarData(null)).toBe('—');
    expect(formatarData('')).toBe('—');
    expect(formatarData('não é data')).toBe('—');
  });
});

describe('hojeLocalISO', () => {
  it('devolve o dia local, não o dia UTC', () => {
    // O mesmo motivo do teste acima: às 21h no Brasil já é o dia seguinte em
    // UTC, e o padrão do campo de data viria errado.
    const d = new Date();
    const esperado = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    expect(hojeLocalISO()).toBe(esperado);
  });

  it('sai no formato aceito por <input type="date">', () => {
    expect(hojeLocalISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatarQuantidade', () => {
  it('usa separador brasileiro e anexa a unidade', () => {
    expect(formatarQuantidade(1234.5, 'kg')).toBe('1.234,5 kg');
    expect(formatarQuantidade(1000)).toBe('1.000');
  });

  it('zero é um valor, não ausência', () => {
    // Distinguir "produziu 0 kg" de "não apontou" importa no painel.
    expect(formatarQuantidade(0, 'kg')).toBe('0 kg');
    expect(formatarQuantidade(null, 'kg')).toBe('—');
  });
});

describe('formatarDuracao', () => {
  it('escreve horas e minutos', () => {
    expect(formatarDuracao('2026-07-20T08:00:00Z', '2026-07-20T09:30:00Z')).toBe('1h 30min');
    expect(formatarDuracao('2026-07-20T08:00:00Z', '2026-07-20T08:45:00Z')).toBe('45min');
    expect(formatarDuracao('2026-07-20T08:00:00Z', '2026-07-20T10:00:00Z')).toBe('2h');
  });

  it('recusa intervalo incompleto ou invertido', () => {
    expect(formatarDuracao(null, '2026-07-20T09:00:00Z')).toBeNull();
    expect(formatarDuracao('2026-07-20T10:00:00Z', '2026-07-20T09:00:00Z')).toBeNull();
  });
});
