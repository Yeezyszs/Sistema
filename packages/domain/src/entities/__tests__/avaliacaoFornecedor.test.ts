import { describe, it, expect } from 'vitest';
import {
  pontuacaoAvaliacao, classificacaoAvaliacao, notaPorNumeroDeNCs,
  periodoVigente, rotuloPeriodo, intervaloDoPeriodo,
} from '../AvaliacaoFornecedor';

describe('pontuação (FOR-POP 07)', () => {
  it('reproduz a planilha: quatro notas 1 dão pontuação 1', () => {
    expect(pontuacaoAvaliacao({ cotacao: 1, prazo_entrega: 1, atendimento: 1, nao_conformidades: 1 })).toBe(1);
  });

  it('é a média dos quatro critérios', () => {
    expect(pontuacaoAvaliacao({ cotacao: 1, prazo_entrega: 1, atendimento: 1, nao_conformidades: 2 })).toBe(1.25);
    expect(pontuacaoAvaliacao({ cotacao: 3, prazo_entrega: 3, atendimento: 3, nao_conformidades: 3 })).toBe(3);
  });
});

describe('classificação', () => {
  it('fornecedor sem desvio é aceitável', () => {
    expect(classificacaoAvaliacao(1)).toBe('aceitavel');
    expect(classificacaoAvaliacao(1.66)).toBe('aceitavel');
  });

  it('meio da escala exige ressalva', () => {
    expect(classificacaoAvaliacao(1.75)).toBe('aceitavel_com_restricao');
    expect(classificacaoAvaliacao(2.33)).toBe('aceitavel_com_restricao');
  });

  it('acima de dois terços reprova', () => {
    expect(classificacaoAvaliacao(2.5)).toBe('nao_aceitavel');
    expect(classificacaoAvaliacao(3)).toBe('nao_aceitavel');
  });
});

describe('nota pelo número de NCs', () => {
  it('até 3 ainda é nota 1 — a faixa sobreposta do formulário resolve a favor do fornecedor', () => {
    expect(notaPorNumeroDeNCs(0)).toBe(1);
    expect(notaPorNumeroDeNCs(3)).toBe(1);
  });

  it('de 4 a 7 é nota 2 e acima de 7 é nota 3', () => {
    expect(notaPorNumeroDeNCs(4)).toBe(2);
    expect(notaPorNumeroDeNCs(7)).toBe(2);
    expect(notaPorNumeroDeNCs(8)).toBe(3);
  });
});

describe('períodos semestrais', () => {
  it('janeiro a junho caem no período 01; julho em diante no 07', () => {
    expect(periodoVigente(new Date(2026, 0, 15))).toBe('2026-01');
    expect(periodoVigente(new Date(2026, 5, 30))).toBe('2026-01');
    expect(periodoVigente(new Date(2026, 6, 1))).toBe('2026-07');
    expect(periodoVigente(new Date(2026, 11, 31))).toBe('2026-07');
  });

  it('rotula e delimita o semestre', () => {
    expect(rotuloPeriodo('2026-07')).toBe('Jul/2026');
    expect(intervaloDoPeriodo('2026-01')).toEqual(['2026-01-01', '2026-06-30']);
    expect(intervaloDoPeriodo('2026-07')).toEqual(['2026-07-01', '2026-12-31']);
  });
});
