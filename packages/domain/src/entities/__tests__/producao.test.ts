import { describe, expect, it } from 'vitest';
import {
  calcularRendimento,
  loteEstaLiberado,
  lotePodeSolicitarLiberacao,
  lotePodeCancelar,
  loteFoiCancelado,
} from '../../index';

describe('calcularRendimento', () => {
  it('divide produto acabado pela raiz consumida', () => {
    // ~27% é o rendimento típico da farinha de mandioca.
    expect(calcularRendimento(270, 1000)).toBeCloseTo(0.27);
  });

  it('devolve null quando falta um dos lados', () => {
    expect(calcularRendimento(null, 1000)).toBeNull();
    expect(calcularRendimento(270, null)).toBeNull();
  });

  it('não divide por zero', () => {
    // Raiz zerada acontece quando o apontamento é lançado antes da descarga.
    expect(calcularRendimento(270, 0)).toBeNull();
    expect(calcularRendimento(270, -50)).toBeNull();
  });
});

describe('ciclo de vida do lote', () => {
  it('só considera liberado o que está liberado', () => {
    expect(loteEstaLiberado({ status: 'liberado' })).toBe(true);
    expect(loteEstaLiberado({ status: 'aguardando_liberacao' })).toBe(false);
    expect(loteEstaLiberado({ status: 'bloqueado' })).toBe(false);
  });

  it('só pede liberação quem está em processo', () => {
    expect(lotePodeSolicitarLiberacao({ status: 'em_processo' })).toBe(true);
    expect(lotePodeSolicitarLiberacao({ status: 'liberado' })).toBe(false);
    expect(lotePodeSolicitarLiberacao({ status: 'expedido' })).toBe(false);
  });

  it('lote expedido não pode ser cancelado', () => {
    // Cancelar depois de expedido apagaria o rastro de um lote que já saiu.
    expect(lotePodeCancelar({ status: 'expedido' })).toBe(false);
    expect(lotePodeCancelar({ status: 'cancelado' })).toBe(false);
    expect(lotePodeCancelar({ status: 'em_processo' })).toBe(true);
  });

  it('reconhece o lote cancelado', () => {
    expect(loteFoiCancelado({ status: 'cancelado' })).toBe(true);
    expect(loteFoiCancelado({ status: 'em_processo' })).toBe(false);
  });
});
