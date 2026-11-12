import { describe, it, expect } from 'vitest';
import { situacaoCalibracao, calibracoesEmAlerta } from '../Calibracao';

const hoje = new Date(2026, 10, 12);

describe('alerta de calibração (30 dias)', () => {
  it('avisa um mês antes da validade', () => {
    expect(situacaoCalibracao('2026-12-12', hoje)).toBe('a_vencer');
    expect(situacaoCalibracao('2026-12-13', hoje)).toBe('vigente');
    expect(situacaoCalibracao('2026-11-11', hoje)).toBe('vencida');
  });

  it('olha só o certificado mais recente de cada instrumento', () => {
    const inst = [{ id: 'a', ativo: true }, { id: 'b', ativo: true }, { id: 'c', ativo: false }];
    const cal = [
      { instrumento_id: 'a', calibrado_em: '2025-01-01', valido_ate: '2026-01-01' },
      { instrumento_id: 'a', calibrado_em: '2026-01-01', valido_ate: '2027-01-01' },
      { instrumento_id: 'b', calibrado_em: '2025-12-01', valido_ate: '2026-12-01' },
      { instrumento_id: 'c', calibrado_em: '2025-01-01', valido_ate: '2026-01-01' },
    ];
    expect(calibracoesEmAlerta(inst, cal, hoje).map((c) => c.instrumento_id)).toEqual(['b']);
  });
});
