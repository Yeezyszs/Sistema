import { describe, expect, it } from 'vitest';
import { horasEntre, calcularIndicadores, diasNoMes, proximoEstadoChecklist } from '../../index';
import type { Parada } from '../../index';

describe('horasEntre', () => {
  it('calcula a duração dentro do mesmo dia', () => {
    expect(horasEntre('08:00', '12:30')).toBe(4.5);
  });

  it('atravessa a meia-noite', () => {
    // Turno da noite: parada que começa 22h e termina 2h dura 4 horas, não -20.
    expect(horasEntre('22:00', '02:00')).toBe(4);
  });

  it('devolve zero quando falta horário ou o valor é inválido', () => {
    expect(horasEntre(null, '12:00')).toBe(0);
    expect(horasEntre('08:00', null)).toBe(0);
    expect(horasEntre('abc', '12:00')).toBe(0);
  });
});

describe('calcularIndicadores', () => {
  const paradas: Pick<Parada, 'tipo' | 'horas'>[] = [
    { tipo: 'Manutenção / Quebra', horas: 4 },
    { tipo: 'Manutenção / Quebra', horas: 2 },
    { tipo: 'Falta de Matéria Prima', horas: 6 },
  ];

  it('só falha de manutenção entra em MTTR e MTBF', () => {
    // Parada por falta de matéria-prima reduz disponibilidade, mas não é falha
    // de equipamento — contá-la inflaria o MTBF e mascararia o desempenho.
    const i = calcularIndicadores(paradas, 100);
    expect(i.nFalhas).toBe(2);
    expect(i.horasManutencao).toBe(6);
    expect(i.horasParadas).toBe(12);
    expect(i.horasOperacao).toBe(88);
    expect(i.mttr).toBe(3);   // 6h / 2 falhas
    expect(i.mtbf).toBe(44);  // 88h / 2 falhas
    expect(i.disponibilidade).toBe(88);
  });

  it('sem falha, MTTR e MTBF ficam indefinidos em vez de zero', () => {
    // Zero diria "conserta instantaneamente" / "quebra o tempo todo"; o certo
    // é não ter número.
    const i = calcularIndicadores([{ tipo: 'Queda de Energia', horas: 2 }], 10);
    expect(i.mttr).toBeNull();
    expect(i.mtbf).toBeNull();
  });

  it('sem horas planejadas não há disponibilidade', () => {
    expect(calcularIndicadores([], 0).disponibilidade).toBeNull();
  });

  it('parada maior que o planejado não gera operação negativa', () => {
    const i = calcularIndicadores([{ tipo: 'Manutenção / Quebra', horas: 30 }], 20);
    expect(i.horasOperacao).toBe(0);
  });
});

describe('diasNoMes', () => {
  it('conhece os meses de 30 e 31 dias', () => {
    expect(diasNoMes(2026, 1)).toBe(31);
    expect(diasNoMes(2026, 4)).toBe(30);
  });

  it('acerta fevereiro em ano bissexto', () => {
    expect(diasNoMes(2026, 2)).toBe(28);
    expect(diasNoMes(2028, 2)).toBe(29);
  });
});

describe('proximoEstadoChecklist', () => {
  it('avança no ciclo e volta ao vazio no fim', () => {
    expect(proximoEstadoChecklist(null)).toBe('C');
    expect(proximoEstadoChecklist('C')).toBe('NC');
    expect(proximoEstadoChecklist('A')).toBeNull();
  });
});
