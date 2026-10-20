import { describe, it, expect } from 'vitest';
import { mediaRendas, itensNaoConformes, situacaoInspecaoCarga } from '../Recebimento';

describe('mediaRendas', () => {
  it('média das amostras preenchidas, ignorando vazias', () => {
    expect(mediaRendas([600, 620, null, 640, undefined])).toBe(620);
  });
  it('arredonda a uma casa', () => {
    expect(mediaRendas([600, 601, 601])).toBe(600.7);
  });
  it('sem amostras → null', () => {
    expect(mediaRendas([null, undefined])).toBeNull();
    expect(mediaRendas([])).toBeNull();
  });
});

describe('inspeção da carga', () => {
  const tudoC = { coberta: 'c', corpos_estranhos: 'c', impurezas: 'c', podre: 'c', odor: 'c', pragas: 'c' } as const;
  it('todos conformes', () => {
    expect(situacaoInspecaoCarga(tudoC)).toBe('conforme');
    expect(itensNaoConformes(tudoC)).toEqual([]);
  });
  it('um NC já marca a carga, mesmo incompleta', () => {
    expect(situacaoInspecaoCarga({ pragas: 'nc' })).toBe('nao_conforme');
    expect(itensNaoConformes({ ...tudoC, podre: 'nc' })).toEqual(['podre']);
  });
  it('sem resposta e parcial', () => {
    expect(situacaoInspecaoCarga(null)).toBe('sem_inspecao');
    expect(situacaoInspecaoCarga({})).toBe('sem_inspecao');
    expect(situacaoInspecaoCarga({ coberta: 'c' })).toBe('incompleta');
  });
});
