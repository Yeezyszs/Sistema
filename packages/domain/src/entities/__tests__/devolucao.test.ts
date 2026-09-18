import { describe, it, expect } from 'vitest';
import { resumoVendas } from '../Devolucao';

describe('resumo de vendas', () => {
  it('líquido é o que saiu menos o que voltou', () => {
    const r = resumoVendas(179_800, 9_000);
    expect(r.liquido).toBe(170_800);
    expect(r.percentualDevolvido).toBeCloseTo(5.0059, 3);
  });

  it('sem devolução, líquido é a venda inteira', () => {
    expect(resumoVendas(100_000, 0)).toEqual({ liquido: 100_000, percentualDevolvido: 0 });
  });

  it('sem venda no período o percentual é nulo, não zero', () => {
    // "0% devolvido" esconderia que não houve venda nenhuma.
    const r = resumoVendas(0, 0);
    expect(r.percentualDevolvido).toBeNull();
    expect(r.liquido).toBe(0);
  });

  it('devolução de carga de mês anterior pode deixar o líquido negativo', () => {
    const r = resumoVendas(1_000, 4_000);
    expect(r.liquido).toBe(-3_000);
    expect(r.percentualDevolvido).toBe(400);
  });
});
