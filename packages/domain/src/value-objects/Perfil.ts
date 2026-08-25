// Perfis de acesso (core.perfis) — definem quais módulos cada usuário vê.
export const PERFIL = ['gestao', 'operador', 'qualidade', 'manutencao', 'compras', 'almoxarifado'] as const;
export type Perfil = (typeof PERFIL)[number];

export const PERFIL_LABEL: Record<Perfil, string> = {
  gestao: 'Gestão',
  operador: 'Operador',
  qualidade: 'Qualidade',
  manutencao: 'Manutenção',
  compras: 'Compras',
  almoxarifado: 'Almoxarifado',
};

// Códigos de módulo — usados nas rotas/menu para decidir visibilidade.
export const MODULO = [
  'painel',
  'pcp', 'produtos', 'pedidos', 'expedicao', 'estoque', 'pallets', 'reprocesso',
  'ordens', 'lotes', 'recebimentos', 'fornecedores',
  'qualidade', 'acompanhamento', 'monitoramento_agua', 'insumos_lab', 'contraprovas', 'pcc_fisico', 'ppho', 'especificacoes', 'calibracao',
  'analise_risco', 'auditoria', 'ambiental', 'nao_conformidades',
  'manutencao', 'comercial', 'almoxarifado', 'documentos', 'usuarios',
] as const;
export type Modulo = (typeof MODULO)[number];

// Quais módulos cada perfil acessa. 'gestao' sempre vê tudo (checado à parte).
export const MODULOS_POR_PERFIL: Record<Perfil, Modulo[]> = {
  gestao: [...MODULO],
  operador: [
    'painel',
    'pcp', 'produtos', 'pedidos', 'expedicao', 'estoque', 'pallets', 'reprocesso',
    'ordens', 'lotes', 'recebimentos', 'almoxarifado',
  ],
  qualidade: [
    'painel',
    'lotes', 'recebimentos', 'fornecedores', 'qualidade', 'acompanhamento', 'monitoramento_agua', 'insumos_lab', 'contraprovas', 'pcc_fisico', 'ppho',
    'especificacoes', 'calibracao', 'analise_risco', 'auditoria', 'ambiental',
    'nao_conformidades', 'reprocesso', 'documentos',
  ],
  manutencao: ['painel', 'manutencao', 'calibracao', 'pcc_fisico', 'almoxarifado'],
  // Compras cuida da documentação de homologação e do estoque de consumíveis
  // e embalagens. Não vê produção, qualidade nem comercial.
  compras: ['painel', 'documentos', 'almoxarifado'],
  // Almoxarifado atende a manutenção: quem entrega a peça e quem a consome
  // olham o mesmo estoque.
  almoxarifado: ['painel', 'almoxarifado', 'manutencao'],
};

// Verdadeiro se algum dos perfis do usuário dá acesso ao módulo.
export function podeAcessar(perfis: Perfil[], modulo: Modulo): boolean {
  if (perfis.includes('gestao')) return true;
  return perfis.some((p) => MODULOS_POR_PERFIL[p]?.includes(modulo));
}
