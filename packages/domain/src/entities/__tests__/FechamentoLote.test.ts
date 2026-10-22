import { describe, it, expect } from 'vitest';
import { tipoFarinhaDoProduto, fechamentoDoLote } from '../AnaliseProcesso';

describe('tipoFarinhaDoProduto', () => {
  it('reconhece os tipos das planilhas de cliente', () => {
    expect(tipoFarinhaDoProduto("PENEIRA 16 - 750 KG (24 Bag's) · P16 5%")).toBe('cinco');
    expect(tipoFarinhaDoProduto("PENEIRA 16 - 750 KG (24 Bag's) · FARINHA TORRADA")).toBe('torrada');
    expect(tipoFarinhaDoProduto('FARINHA PARA TORRAR 750 KG GENERAL MILLS')).toBe('crua');
    expect(tipoFarinhaDoProduto("PANIFICÁVEL 1000 KG (24 Bag's) · PANIFICÁVEL")).toBe('panificavel');
    expect(tipoFarinhaDoProduto('Fécula de mandioca')).toBeNull();
  });
});

describe('fechamentoDoLote', () => {
  it('resume os ensaios e reprova o lote com bag reprovado', () => {
    const r = fechamentoDoLote(
      [{ id: 'a', conforme: true }, { id: 'b', conforme: false }],
      [
        { analise_id: 'a', ensaio: 'Umidade', valor: 8, conforme: true, ordem: 0 },
        { analise_id: 'b', ensaio: 'Umidade', valor: 13, conforme: false, ordem: 0 },
        { analise_id: 'x', ensaio: 'Umidade', valor: 99, conforme: false, ordem: 0 },
      ],
    );
    expect(r.ensaios).toEqual([{ ensaio: 'Umidade', n: 2, min: 8, max: 13, media: 10.5, foraDoLimite: 1 }]);
    expect(r.aprovado).toBe(false);
  });
});
