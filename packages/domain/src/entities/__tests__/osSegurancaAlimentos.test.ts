import { describe, it, expect } from 'vitest';
import {
  statusAoEncerrarServico, podeConcluirOs, podeRetirarRisco, problemaNoAnexo, TAMANHO_MAX_ANEXO,
} from '../Pcm';

describe('O.S. com risco à segurança de alimentos', () => {
  it('sem risco, encerrar o serviço conclui a O.S.', () => {
    expect(statusAoEncerrarServico(false)).toBe('Concluído');
  });

  it('com risco, encerrar o serviço manda para a Qualidade', () => {
    expect(statusAoEncerrarServico(true)).toBe('Aguardando Qualidade');
  });

  it('só a Qualidade conclui O.S. com risco', () => {
    const comRisco = { risco_seguranca_alimentos: true };
    expect(podeConcluirOs(comRisco, ['manutencao'])).toBe(false);
    expect(podeConcluirOs(comRisco, ['gestao', 'administrador'])).toBe(false);
    expect(podeConcluirOs(comRisco, ['qualidade'])).toBe(true);
  });

  it('O.S. sem risco qualquer um conclui', () => {
    expect(podeConcluirOs({ risco_seguranca_alimentos: false }, ['manutencao'])).toBe(true);
  });

  it('só a Qualidade retira o risco — senão bastaria desmarcar e concluir', () => {
    expect(podeRetirarRisco(['manutencao', 'encarregado'])).toBe(false);
    expect(podeRetirarRisco(['qualidade'])).toBe(true);
  });
});

describe('anexos da O.S.', () => {
  const arq = (type: string, size: number) => ({ type, size, name: 'arquivo' });

  it('aceita foto e vídeo dentro do limite', () => {
    expect(problemaNoAnexo(arq('image/jpeg', 3_000_000))).toBeNull();
    expect(problemaNoAnexo(arq('video/mp4', TAMANHO_MAX_ANEXO))).toBeNull();
  });

  it('recusa o que não é foto nem vídeo', () => {
    expect(problemaNoAnexo(arq('application/pdf', 1000))).toMatch(/não é foto nem vídeo/);
  });

  it('recusa acima de 50 MB dizendo o tamanho', () => {
    expect(problemaNoAnexo(arq('video/mp4', 120 * 1024 * 1024))).toMatch(/120 MB/);
  });
});
