import { describe, expect, it } from 'vitest';
import {
  rendimentoRaiz, custoTFarinha, precoTRaiz, valorDaCarga,
  tetoCusto, rendaMaxima, folgaNoTeto,
} from '../../index';

// Os números de referência vêm do "Simulador Waldecir", a planilha que o
// comprador usa para fechar preço. Se algum destes quebrar, o sistema passou a
// discordar da régua que a fábrica usa de verdade.
describe('a conta do simulador', () => {
  it('reproduz o cenário salvo na planilha', () => {
    // renda 540 g, preço da renda R$ 0,85, farinha R$ 3.020/t, teto 58%
    expect(rendimentoRaiz(540)).toBeCloseTo(0.27858864840631703, 8);
    expect(precoTRaiz(540, 0.85)).toBeCloseTo(459, 6);
    expect(custoTFarinha(540, 0.85)).toBeCloseTo(1647.59, 2);
    expect(tetoCusto(3020, 58)).toBeCloseTo(1751.6, 6);
    expect(folgaNoTeto(540, 0.85, 3020)).toBeCloseTo(104.01, 2);
  });

  it('acha a mesma renda máxima que a planilha', () => {
    // A planilha traz 689 como "Renda Máxima Aceitável" naquele cenário.
    expect(rendaMaxima(0.85, 3020, 58)).toBeCloseTo(688.7, 1);
  });

  it('o limite se move com o preço da renda', () => {
    // Quanto mais caro o ponto de renda, menor a raiz que ainda cabe no teto.
    const a = rendaMaxima(0.79, 3020, 58)!;
    const b = rendaMaxima(0.85, 3020, 58)!;
    const c = rendaMaxima(0.9, 3020, 58)!;
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(c).toBeCloseTo(548.1, 1);
  });

  it('sem limite quando a raiz nunca alcança o teto', () => {
    // A R$ 0,60 o custo não encosta no teto em nenhuma renda. Devolver um
    // número aqui seria inventar um limite que não existe.
    expect(rendaMaxima(0.6, 3020, 58)).toBeNull();
  });
});

describe('custo por tonelada de farinha', () => {
  it('sobe junto com a renda — o contrário do que parece', () => {
    // Consequência de pagar proporcional à renda enquanto o rendimento tem uma
    // base fixa: raiz melhor sai mais cara por tonelada de farinha.
    const baixa = custoTFarinha(400, 0.85)!;
    const media = custoTFarinha(540, 0.85)!;
    const alta = custoTFarinha(700, 0.85)!;
    expect(baixa).toBeLessThan(media);
    expect(media).toBeLessThan(alta);
    expect(alta).toBeGreaterThan(tetoCusto(3020, 58)!);
  });
});

describe('valor da carga', () => {
  it('usa o peso real da balança, não uma tonelagem padrão', () => {
    // 29.740 kg de raiz com renda 552 a R$ 0,85
    expect(valorDaCarga(29_740, 552, 0.85)).toBeCloseTo(13_954.008, 2);
  });

  it('duas cargas do mesmo produtor com pesos diferentes valem diferente', () => {
    const a = valorDaCarga(29_740, 550, 0.85)!;
    const b = valorDaCarga(24_000, 550, 0.85)!;
    expect(a).toBeGreaterThan(b);
  });
});

describe('entradas ausentes', () => {
  it('não inventa número quando falta dado', () => {
    expect(rendimentoRaiz(null)).toBeNull();
    expect(rendimentoRaiz(0)).toBeNull();
    expect(custoTFarinha(540, null)).toBeNull();
    expect(valorDaCarga(null, 540, 0.85)).toBeNull();
    expect(folgaNoTeto(540, 0.85, null)).toBeNull();
  });
});
