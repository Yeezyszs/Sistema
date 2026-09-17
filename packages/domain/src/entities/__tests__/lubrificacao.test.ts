import { describe, it, expect } from 'vitest';
import {
  frequenciaEmDias, janelaDeAviso, situacaoLubrificacao,
  lubrificacaoPedeAcao, compararUrgenciaLubrificacao,
} from '../Lubrificacao';

describe('frequência em dias', () => {
  it('lê as palavras que existem no cadastro da fábrica', () => {
    expect(frequenciaEmDias('SEMANAL')).toBe(7);
    expect(frequenciaEmDias('SEMANALMENTE')).toBe(7);
    expect(frequenciaEmDias('QUINZENAL')).toBe(15);
    expect(frequenciaEmDias('MENSAL')).toBe(30);
    expect(frequenciaEmDias('TRIMESTRALMENTE')).toBe(90);
  });

  it('não confunde quinzenal com semanal', () => {
    expect(frequenciaEmDias('quinzenal')).toBe(15);
  });

  it('devolve null no que não reconhece, em vez de chutar prazo', () => {
    expect(frequenciaEmDias('A CADA PARADA')).toBeNull();
    expect(frequenciaEmDias('')).toBeNull();
    expect(frequenciaEmDias(null)).toBeNull();
  });
});

describe('janela de aviso', () => {
  it('é proporcional ao ciclo, com no mínimo um dia', () => {
    expect(janelaDeAviso(7)).toBe(1);
    expect(janelaDeAviso(15)).toBe(3);
    expect(janelaDeAviso(30)).toBe(6);
    expect(janelaDeAviso(90)).toBe(18);
  });
});

describe('situação do ponto', () => {
  it('em dia enquanto falta mais que a janela', () => {
    const s = situacaoLubrificacao('2026-09-10', 'QUINZENAL', '2026-09-17');
    expect(s.situacao).toBe('em_dia');
    expect(s.proxima).toBe('2026-09-25');
    expect(s.diasRestantes).toBe(8);
  });

  it('vencendo quando entra na janela', () => {
    // Quinzenal avisa com 3 dias: 22/09 ainda não, 23/09 sim.
    expect(situacaoLubrificacao('2026-09-10', 'QUINZENAL', '2026-09-21').situacao).toBe('em_dia');
    expect(situacaoLubrificacao('2026-09-10', 'QUINZENAL', '2026-09-22').situacao).toBe('vencendo');
    expect(situacaoLubrificacao('2026-09-10', 'QUINZENAL', '2026-09-25').situacao).toBe('vencendo');
  });

  it('vencida só no dia seguinte ao prazo — o dia do vencimento ainda dá para lubrificar', () => {
    const noDia = situacaoLubrificacao('2026-09-10', 'SEMANAL', '2026-09-17');
    expect(noDia.situacao).toBe('vencendo');
    expect(noDia.diasRestantes).toBe(0);
    const depois = situacaoLubrificacao('2026-09-10', 'SEMANAL', '2026-09-18');
    expect(depois.situacao).toBe('vencida');
    expect(depois.diasRestantes).toBe(-1);
  });

  it('sem execução é sem registro, não vencida', () => {
    const s = situacaoLubrificacao(null, 'SEMANAL', '2026-09-17');
    expect(s.situacao).toBe('sem_registro');
    expect(s.proxima).toBeNull();
  });

  it('frequência não reconhecida não vira prazo inventado', () => {
    const s = situacaoLubrificacao('2026-09-10', 'A CADA PARADA', '2026-09-17');
    expect(s.situacao).toBe('sem_frequencia');
    expect(s.diasDesdeUltima).toBe(7);
    expect(s.proxima).toBeNull();
  });

  it('atravessa a virada de mês sem escorregar', () => {
    const s = situacaoLubrificacao('2026-09-25', 'SEMANAL', '2026-10-05');
    expect(s.proxima).toBe('2026-10-02');
    expect(s.situacao).toBe('vencida');
    expect(s.diasRestantes).toBe(-3);
  });
});

describe('prioridade', () => {
  it('pede ação em vencida, vencendo e sem registro', () => {
    expect(lubrificacaoPedeAcao('vencida')).toBe(true);
    expect(lubrificacaoPedeAcao('vencendo')).toBe(true);
    expect(lubrificacaoPedeAcao('sem_registro')).toBe(true);
    expect(lubrificacaoPedeAcao('em_dia')).toBe(false);
    expect(lubrificacaoPedeAcao('sem_frequencia')).toBe(false);
  });

  it('ordena o que já venceu na frente, e dentro disso o mais atrasado', () => {
    const vencidaAntiga = situacaoLubrificacao('2026-08-01', 'SEMANAL', '2026-09-17');
    const vencidaNova = situacaoLubrificacao('2026-09-05', 'SEMANAL', '2026-09-17');
    const vencendo = situacaoLubrificacao('2026-09-10', 'SEMANAL', '2026-09-16');
    const ordem = [vencendo, vencidaNova, vencidaAntiga].sort(compararUrgenciaLubrificacao);
    expect(ordem.map((s) => s.situacao)).toEqual(['vencida', 'vencida', 'vencendo']);
    expect(ordem[0]?.diasRestantes).toBe(-40);
  });
});
