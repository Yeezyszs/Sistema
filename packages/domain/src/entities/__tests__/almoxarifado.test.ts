import { describe, expect, it } from 'vitest';
import { abaixoDoMinimo, embalagemEmPosse, embalagemTotal } from '../../index';

describe('abaixoDoMinimo', () => {
  it('avisa quando o saldo chega ao mínimo', () => {
    expect(abaixoDoMinimo({ saldo: 5, estoque_minimo: 10 })).toBe(true);
    expect(abaixoDoMinimo({ saldo: 10, estoque_minimo: 10 })).toBe(true);
    expect(abaixoDoMinimo({ saldo: 11, estoque_minimo: 10 })).toBe(false);
  });

  it('item sem mínimo definido nunca alerta', () => {
    // Mínimo zero significa "não controlado" — alertar sempre viraria ruído e
    // o operador pararia de olhar.
    expect(abaixoDoMinimo({ saldo: 0, estoque_minimo: 0 })).toBe(false);
  });
});

describe('contagem de embalagens', () => {
  const item = { saldo: 100, qtd_uso: 40, qtd_reparo: 10, qtd_terceiros: 25 };

  it('em posse soma estoque, uso e reparo — sem o que está com terceiros', () => {
    // O que está com terceiros não é patrimônio disponível; entra no total,
    // não no valor em posse.
    expect(embalagemEmPosse(item)).toBe(150);
  });

  it('o total inclui o que está com terceiros', () => {
    expect(embalagemTotal(item)).toBe(175);
  });

  it('item novo, ainda sem movimentação, soma zero', () => {
    expect(embalagemEmPosse({ saldo: 10, qtd_uso: 0, qtd_reparo: 0 })).toBe(10);
    expect(embalagemTotal({ saldo: 0, qtd_uso: 0, qtd_reparo: 0, qtd_terceiros: 0 })).toBe(0);
  });
});
