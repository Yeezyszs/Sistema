import { describe, it, expect } from 'vitest';
import { validadeRetido, retidoVencendo, somarKgPor } from '../Reprocesso';

describe('retidos', () => {
  it('validade = data + shelf life', () => {
    expect(validadeRetido('2026-01-06')).toBe('2027-01-06');
    expect(validadeRetido('2026-01-06', 0.5)).toBe('2026-07-06');
  });
  it('vencendo só conta o que está em estoque', () => {
    expect(retidoVencendo({ status: 'em_estoque', validade: '2026-11-10' }, '2026-10-22')).toBe(true);
    expect(retidoVencendo({ status: 'em_estoque', validade: '2027-01-10' }, '2026-10-22')).toBe(false);
    expect(retidoVencendo({ status: 'concluido', validade: '2026-10-01' }, '2026-10-22')).toBe(false);
  });
  it('soma kg por chave', () => {
    const r = somarKgPor([{ quantidade_kg: 750, p: 'A' }, { quantidade_kg: 250, p: 'A' }, { quantidade_kg: 900, p: 'B' }], (i) => i.p);
    expect(r).toEqual([['A', 1000], ['B', 900]]);
  });
});
