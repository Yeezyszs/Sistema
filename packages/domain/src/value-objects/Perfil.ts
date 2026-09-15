// Perfis de acesso (core.perfis) — definem quais módulos cada usuário vê.
export const PERFIL = ['gestao', 'operador', 'qualidade', 'manutencao', 'compras', 'almoxarifado', 'comercial', 'administrador'] as const;
export type Perfil = (typeof PERFIL)[number];

export const PERFIL_LABEL: Record<Perfil, string> = {
  gestao: 'Gestão',
  operador: 'Operador',
  qualidade: 'Qualidade',
  manutencao: 'Manutenção',
  compras: 'Compras',
  almoxarifado: 'Almoxarifado',
  comercial: 'Comercial',
  administrador: 'Administrador',
};

// Códigos de módulo — usados nas rotas/menu para decidir visibilidade.
export const MODULO = [
  'painel',
  'pcp', 'produtos', 'pedidos', 'expedicao', 'estoque', 'pallets', 'reprocesso',
  'ordens', 'lotes', 'recebimentos', 'fornecedores',
  'qualidade', 'acompanhamento', 'monitoramento_agua', 'insumos_lab', 'contraprovas', 'pcc_fisico', 'ppho', 'especificacoes', 'calibracao',
  'analise_risco', 'auditoria', 'ambiental', 'nao_conformidades',
  'manutencao', 'comercial', 'almoxarifado', 'documentos', 'suprimentos', 'usuarios',
] as const;
export type Modulo = (typeof MODULO)[number];

// Quais módulos cada perfil acessa.
//
// Nenhum perfil é mágico: `gestao` é só uma lista grande. Administrar usuários
// e perfis é responsabilidade distinta de tocar a fábrica, então mora no perfil
// `administrador` e é concedida à parte — quem gerencia a operação não precisa
// poder mudar o acesso dos outros.
export const MODULOS_POR_PERFIL: Record<Perfil, Modulo[]> = {
  gestao: MODULO.filter((m) => m !== 'usuarios'),
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
  compras: ['painel', 'documentos', 'almoxarifado', 'suprimentos'],
  // Almoxarifado atende a manutenção: quem entrega a peça e quem a consome
  // olham o mesmo estoque.
  almoxarifado: ['painel', 'almoxarifado', 'manutencao'],
  // Comercial vende e acompanha o que sustenta a venda: o grupo Suprimentos
  // inteiro (previsão da semana, produtores, recebimentos e fornecedores) e os
  // lotes prontos. De produção, só lotes — programação, apontamento e ordens
  // são do chão de fábrica.
  comercial: [
    'painel', 'comercial', 'pedidos', 'lotes',
    'suprimentos', 'recebimentos', 'fornecedores',
  ],
  // Só a administração de usuários e perfis. Soma-se a outro perfil.
  administrador: ['painel', 'usuarios'],
};

// Verdadeiro se algum dos perfis do usuário dá acesso ao módulo.
// Perfis somam: quem é gestão e administrador acessa a união dos dois.
export function podeAcessar(perfis: Perfil[], modulo: Modulo): boolean {
  return perfis.some((p) => MODULOS_POR_PERFIL[p]?.includes(modulo));
}
