import { describe, expect, it } from 'vitest';
import {
  situacaoCalibracao,
  phmetroConforme,
  aguaConforme,
  classificarFornecedor,
} from '../../index';

describe('situacaoCalibracao', () => {
  const hoje = new Date('2026-06-15T12:00:00');

  it('classifica pela distância até o vencimento', () => {
    expect(situacaoCalibracao('2026-12-31', hoje)).toBe('vigente');
    expect(situacaoCalibracao('2026-07-10', hoje)).toBe('a_vencer'); // 25 dias
    expect(situacaoCalibracao('2026-06-01', hoje)).toBe('vencida');
  });

  it('trata a ausência de calibração como caso próprio, não como vencida', () => {
    // Instrumento sem registro é diferente de instrumento com registro vencido:
    // um nunca foi calibrado, o outro perdeu a validade.
    expect(situacaoCalibracao(null, hoje)).toBe('sem_registro');
    expect(situacaoCalibracao('data-invalida', hoje)).toBe('sem_registro');
  });

  it('a janela de alerta é de 30 dias, contados por data', () => {
    // A contagem não pode depender da hora em que a tela foi aberta.
    expect(situacaoCalibracao('2026-07-15', hoje)).toBe('a_vencer'); // 30 dias
    expect(situacaoCalibracao('2026-07-16', hoje)).toBe('vigente');  // 31 dias
    const cedo = new Date('2026-06-15T00:30:00');
    const tarde = new Date('2026-06-15T23:30:00');
    expect(situacaoCalibracao('2026-07-16', cedo)).toBe('vigente');
    expect(situacaoCalibracao('2026-07-16', tarde)).toBe('vigente');
  });

  it('aceita limite conforme no dia exato do vencimento', () => {
    expect(situacaoCalibracao('2026-06-15', hoje)).toBe('a_vencer');
    expect(situacaoCalibracao('2026-06-14', hoje)).toBe('vencida');
  });
});

describe('phmetroConforme', () => {
  it('exige as duas soluções dentro da faixa', () => {
    expect(phmetroConforme(3.9, 6.9)).toBe(true);
    expect(phmetroConforme(3.5, 6.9)).toBe(false);
    expect(phmetroConforme(3.9, 7.5)).toBe(false);
  });

  it('aceita os extremos da faixa', () => {
    expect(phmetroConforme(3.8, 6.8)).toBe(true);
    expect(phmetroConforme(4.0, 7.0)).toBe(true);
  });
});

describe('aguaConforme', () => {
  it('reprova cloro ou pH fora da faixa', () => {
    expect(aguaConforme(1.0, 7.0)).toBe(true);
    expect(aguaConforme(6.0, 7.0)).toBe(false); // acima de 5,0 ppm
    expect(aguaConforme(1.0, 11)).toBe(false);
  });

  it('parâmetro não medido não reprova a amostra', () => {
    // A ficha permite registrar só cloro ou só pH; ausência não é desvio.
    expect(aguaConforme(null, 7.0)).toBe(true);
    expect(aguaConforme(1.0, null)).toBe(true);
    expect(aguaConforme(null, null)).toBe(true);
  });
});

describe('classificarFornecedor', () => {
  it('mapeia a nota para classe e status', () => {
    expect(classificarFornecedor(95)).toEqual({ letra: 'A', status: 'qualificado' });
    expect(classificarFornecedor(85)).toEqual({ letra: 'B', status: 'qualificado' });
    expect(classificarFornecedor(75)).toEqual({ letra: 'C', status: 'qualificado' });
    expect(classificarFornecedor(60)).toEqual({ letra: 'D', status: 'desqualificado' });
  });

  it('respeita as bordas de cada faixa', () => {
    expect(classificarFornecedor(91).letra).toBe('A');
    expect(classificarFornecedor(90).letra).toBe('B'); // 90 não é > 90
    expect(classificarFornecedor(80).letra).toBe('B');
    expect(classificarFornecedor(79).letra).toBe('C');
    expect(classificarFornecedor(70).letra).toBe('C');
    expect(classificarFornecedor(69).letra).toBe('D');
  });
});
