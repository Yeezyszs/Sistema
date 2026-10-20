import { describe, it, expect } from 'vitest';
import { blocosAplicaveis, resumoHomologacao, statusSugeridoHomologacao, BLOCOS_HOMOLOGACAO } from '../QuestionarioHomologacao';

const todos = (organico: boolean, r: 'c' | 'nc' | 'na' = 'c') =>
  Object.fromEntries(blocosAplicaveis(organico).flatMap((b) => b.itens).map((i) => [String(i.n), r]));

describe('questionário de homologação', () => {
  it('40 itens; convencional fica sem o bloco orgânico (31)', () => {
    expect(BLOCOS_HOMOLOGACAO.flatMap((b) => b.itens)).toHaveLength(40);
    expect(resumoHomologacao({}, false).total).toBe(31);
    expect(resumoHomologacao({}, true).total).toBe(40);
  });
  it('tudo conforme → 100 e qualificado', () => {
    const r = resumoHomologacao(todos(false), false);
    expect(r.pontuacao).toBe(100);
    expect(statusSugeridoHomologacao(r)).toBe('qualificado');
  });
  it('N/A não entra na pontuação', () => {
    const resp = { ...todos(false), '3': 'na' as const, '4': 'nc' as const };
    const r = resumoHomologacao(resp, false);
    expect(r.naoAplicaveis).toBe(1);
    expect(r.naoConformes).toEqual([4]);
    expect(r.pontuacao).toBe(96.7); // 29 de 30
    expect(statusSugeridoHomologacao(r)).toBe('em_analise');
  });
  it('incompleto fica em análise; resposta de orgânico ignorada no convencional', () => {
    const r = resumoHomologacao({ '1': 'c', '28': 'nc' }, false);
    expect(r.respondidos).toBe(1);
    expect(r.naoConformes).toEqual([]);
    expect(statusSugeridoHomologacao(r)).toBe('em_analise');
  });
});
