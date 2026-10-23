import { describe, it, expect } from 'vitest';
import { indicadoresPorCliente, aprovacaoPorDia, indicadoresPcc } from '../PainelQualidade';

describe('painel da qualidade', () => {
  it('agrupa análises por cliente e tipo', () => {
    const g = indicadoresPorCliente(
      [
        { id: 'a', cliente_id: 'gm', tipo_farinha: 'crua', conforme: true, lote_codigo: 'L1', lote_id: null },
        { id: 'b', cliente_id: 'gm', tipo_farinha: 'crua', conforme: false, lote_codigo: 'L1', lote_id: null },
      ],
      [
        { analise_id: 'a', ensaio: 'Umidade', valor: 8, conforme: true, ordem: 0 },
        { analise_id: 'b', ensaio: 'Umidade', valor: 14, conforme: false, ordem: 0 },
      ],
    );
    expect(g).toEqual([{ cliente_id: 'gm', tipo_farinha: 'crua', analises: 2, aprovadas: 1, lotes: 1, ensaios: [{ ensaio: 'Umidade', media: 11, fora: 1, n: 2 }] }]);
    expect(aprovacaoPorDia([{ data: '2026-10-02', conforme: true }, { data: '2026-10-01', conforme: false }]).map((d) => d.dia)).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('conta atraso do detector acima de 2h15 no mesmo dia', () => {
    const r = indicadoresPcc([], { tempSaidaMin: null, tempSaidaMax: null, umidadeMax: null }, [
      { detector_id: 'd', registrado_em: '2026-10-01T08:00:00Z', conforme: true, nhp: false },
      { detector_id: 'd', registrado_em: '2026-10-01T10:10:00Z', conforme: true, nhp: false },
      { detector_id: 'd', registrado_em: '2026-10-01T12:30:00Z', conforme: false, nhp: false },
    ], []);
    expect(r.detector).toEqual({ testes: 3, falhas: 1, nhp: 0, atrasos: 1 });
  });
});
