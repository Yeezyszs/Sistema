import { describe, it, expect } from 'vitest';
import { situacaoDetector, imasPendentesNoDia } from '../PccFisico';
import { desviosLeituraForno } from '../Forno';

describe('situacaoDetector', () => {
  const agora = new Date(2026, 9, 21, 10, 0);
  const em = (h: number, m = 0) => new Date(2026, 9, 21, h, m).toISOString();
  it('em dia até 2 h 15 depois do último', () => {
    const r = situacaoDetector({ registrado_em: em(7, 50), tipo_teste: 'durante_producao', nhp: false }, agora);
    expect(r.situacao).toBe('em_dia');
    expect(r.proximoAte?.getHours()).toBe(10);
    expect(r.proximoAte?.getMinutes()).toBe(5);
  });
  it('atrasado depois da tolerância', () => {
    expect(situacaoDetector({ registrado_em: em(7, 40), tipo_teste: 'inicio_producao', nhp: false }, agora).situacao).toBe('atrasado');
  });
  it('final de produção, NHP, ontem e nada: não cobra', () => {
    expect(situacaoDetector({ registrado_em: em(6), tipo_teste: 'final_producao', nhp: false }, agora).situacao).toBe('encerrado');
    expect(situacaoDetector({ registrado_em: em(6), tipo_teste: 'durante_producao', nhp: true }, agora).situacao).toBe('sem_teste');
    expect(situacaoDetector({ registrado_em: new Date(2026, 9, 20, 22).toISOString(), tipo_teste: 'durante_producao', nhp: false }, agora).situacao).toBe('sem_teste');
    expect(situacaoDetector(null, agora).situacao).toBe('sem_teste');
  });
});

describe('imasPendentesNoDia', () => {
  it('ímã verificado (ou NHP) no dia sai da lista; inativo não conta', () => {
    const imas = [{ id: 'a', ativo: true }, { id: 'b', ativo: true }, { id: 'c', ativo: false }];
    const verifs = [
      { ima_id: 'a', registrado_em: new Date(2026, 9, 21, 8).toISOString() },
      { ima_id: 'b', registrado_em: new Date(2026, 9, 20, 8).toISOString() },
    ];
    expect(imasPendentesNoDia(imas, verifs, '2026-10-21')).toEqual(['b']);
  });
});

describe('desviosLeituraForno', () => {
  const lim = { tempSaidaMin: 60, tempSaidaMax: null, umidadeMax: 13 };
  it('dentro do limite', () => expect(desviosLeituraForno({ temp_saida: 72, umidade: 11 }, lim)).toEqual([]));
  it('temperatura baixa e umidade alta', () => {
    expect(desviosLeituraForno({ temp_saida: 58, umidade: 13.5 }, lim)).toHaveLength(2);
  });
  it('campo vazio não é desvio', () => expect(desviosLeituraForno({ temp_saida: null, umidade: null }, lim)).toEqual([]));
});
