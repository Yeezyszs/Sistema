import { describe, it, expect } from 'vitest';
import { origemDosBags, distribuirBags, faixasDeBags, juntarDataHora, eficaciaRecolhimento, minutosEntre } from '../Rastreabilidade';

const d = (h: string) => juntarDataHora('2026-08-28', h);

describe('origem dos bags (exemplo do lote MH2739)', () => {
  // Três cargas no dia; o ensaque rodou das 05:30 às 12:03, 24 bags.
  const cargas = [
    { id: 'a', inicio: d('04:10'), produtor: 'Eduardo Rigoni', quantidade: 20000 },
    { id: 'b', inicio: d('08:05'), produtor: 'Marcos Fidelis', quantidade: 12000 },
    { id: 'c', inicio: d('10:10'), produtor: 'José Benedito', quantidade: 6000 },
  ];
  const bags = distribuirBags(d('05:30'), d('12:03'), 24).map((b) => ({ ...b, saiu_em: b.saiu_em.toISOString(), peso_kg: 750 }));

  it('cada carga leva uma faixa contínua de bags', () => {
    const { origens, semOrigem } = origemDosBags(bags, cargas);
    expect(semOrigem).toEqual([]);
    expect(origens.map((o) => [o.carga.produtor, faixasDeBags(o.bags)])).toEqual([
      ['Eduardo Rigoni', '1 a 14'],
      ['Marcos Fidelis', '15 a 21'],
      ['José Benedito', '22 a 24'],
    ]);
  });
  it('kg esperado = carga × rendimento', () => {
    const { origens } = origemDosBags(bags, cargas);
    expect(origens[0]!.kgEsperado).toBe(5400);
    expect(origens[0]!.kgBags).toBe(14 * 750);
  });
  it('bag antes da primeira carga entrar no ensaque fica sem origem', () => {
    const { semOrigem } = origemDosBags([{ numero: 1, saiu_em: d('05:00').toISOString(), peso_kg: 750 }], cargas);
    expect(semOrigem).toEqual([1]);
  });
});

describe('auxiliares', () => {
  it('faixas', () => expect(faixasDeBags([3, 1, 2, 5, 7, 6])).toBe('1 a 3, 5 a 7'));
  it('distribuir: primeiro e último nos extremos', () => {
    const b = distribuirBags(d('05:30'), d('12:03'), 24);
    expect(b[0]!.saiu_em.getTime()).toBe(d('05:30').getTime());
    expect(b[23]!.saiu_em.getTime()).toBe(d('12:03').getTime());
  });
  it('eficácia e tempo', () => {
    expect(eficaciaRecolhimento({ kg_vendido: 18000, kg_no_cliente: 10500, kg_recuperavel: 0 })).toBe(58.3);
    expect(minutosEntre('10:00', '11:00')).toBe(60);
  });
});
