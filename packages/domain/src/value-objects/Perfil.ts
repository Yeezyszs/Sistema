// Perfis de acesso (core.perfis) — definem quais módulos cada usuário vê.
export const PERFIL = ['gestao', 'operador', 'qualidade', 'manutencao'] as const;
export type Perfil = (typeof PERFIL)[number];

export const PERFIL_LABEL: Record<Perfil, string> = {
  gestao: 'Gestão',
  operador: 'Operador',
  qualidade: 'Qualidade',
  manutencao: 'Manutenção',
};

// Códigos de módulo — usados nas rotas/menu para decidir visibilidade.
export const MODULO = [
  'pcp', 'pedidos', 'expedicao', 'estoque', 'embalagens', 'pallets', 'reprocesso',
  'ordens', 'lotes', 'recebimentos', 'fornecedores',
  'qualidade', 'acompanhamento', 'pcc_fisico', 'ppho', 'especificacoes', 'calibracao',
  'analise_risco', 'auditoria', 'ambiental', 'nao_conformidades',
  'manutencao', 'usuarios',
] as const;
export type Modulo = (typeof MODULO)[number];

// Quais módulos cada perfil acessa. 'gestao' sempre vê tudo (checado à parte).
export const MODULOS_POR_PERFIL: Record<Perfil, Modulo[]> = {
  gestao: [...MODULO],
  operador: [
    'pcp', 'pedidos', 'expedicao', 'estoque', 'embalagens', 'pallets', 'reprocesso',
    'ordens', 'lotes', 'recebimentos',
  ],
  qualidade: [
    'lotes', 'recebimentos', 'fornecedores', 'qualidade', 'acompanhamento', 'pcc_fisico', 'ppho',
    'especificacoes', 'calibracao', 'analise_risco', 'auditoria', 'ambiental',
    'nao_conformidades', 'reprocesso',
  ],
  manutencao: ['manutencao', 'calibracao', 'pcc_fisico'],
};

// Verdadeiro se algum dos perfis do usuário dá acesso ao módulo.
export function podeAcessar(perfis: Perfil[], modulo: Modulo): boolean {
  if (perfis.includes('gestao')) return true;
  return perfis.some((p) => MODULOS_POR_PERFIL[p]?.includes(modulo));
}
