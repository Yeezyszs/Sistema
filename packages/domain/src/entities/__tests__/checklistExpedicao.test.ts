import { describe, it, expect } from 'vitest';
import { pendentesExpedicao, ncsExpedicao, liberacoesPermitidas, situacaoExpedicao, SECOES_EXPEDICAO } from '../ChecklistExpedicao';

const logistica = Object.fromEntries(SECOES_EXPEDICAO.filter((s) => s.quem === 'logistica').flatMap((s) => s.itens).map((i) => [i.chave, 'c' as const]));

describe('checklist de expedição', () => {
  it('10 itens da Logística e 7 da Qualidade', () => {
    expect(pendentesExpedicao({}, 'logistica')).toHaveLength(10);
    expect(pendentesExpedicao({}, 'qualidade')).toHaveLength(7);
    expect(pendentesExpedicao(logistica, 'logistica')).toEqual([]);
  });
  it('NC tira o "Aprovado" das opções', () => {
    expect(liberacoesPermitidas(logistica)).toContain('aprovado');
    expect(liberacoesPermitidas({ ...logistica, Q3: 'nc' })).toEqual(['aprovado_restricao', 'reprovado']);
    expect(ncsExpedicao({ ...logistica, L2: 'nc' })).toEqual(['L2']);
  });
  it('situação da carga', () => {
    expect(situacaoExpedicao({ checklist: null, liberacao: null, status: 'carregado' })).toBe('logistica_pendente');
    expect(situacaoExpedicao({ checklist: logistica, liberacao: null, status: 'carregado' })).toBe('aguardando_qualidade');
    expect(situacaoExpedicao({ checklist: logistica, liberacao: 'reprovado', status: 'carregado' })).toBe('reprovado');
    expect(situacaoExpedicao({ checklist: logistica, liberacao: null, status: 'cancelado' })).toBe('cancelada');
  });
});
