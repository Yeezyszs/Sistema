// Perfis de acesso (core.perfis) — definem quais módulos cada usuário vê.
export const PERFIL = ['gestao', 'encarregado', 'operador', 'qualidade', 'manutencao', 'compras', 'almoxarifado', 'comercial', 'logistica', 'administrador'] as const;
export type Perfil = (typeof PERFIL)[number];

export const PERFIL_LABEL: Record<Perfil, string> = {
  gestao: 'Gestão',
  encarregado: 'Encarregado',
  operador: 'Operador',
  qualidade: 'Qualidade',
  manutencao: 'Manutenção',
  compras: 'Compras',
  almoxarifado: 'Almoxarifado',
  comercial: 'Comercial',
  logistica: 'Logística',
  administrador: 'Administrador',
};

// Códigos de módulo — usados nas rotas/menu para decidir visibilidade.
export const MODULO = [
  'painel',
  'pcp', 'produtos', 'pedidos', 'expedicao', 'estoque', 'pallets', 'reprocesso',
  'ordens', 'lotes', 'recebimentos', 'fornecedores',
  'qualidade', 'acompanhamento', 'monitoramento_agua', 'insumos_lab', 'contraprovas', 'pcc_fisico', 'ppho', 'especificacoes', 'calibracao',
  'analise_risco', 'auditoria', 'ambiental', 'nao_conformidades',
  'manutencao', 'ordens_servico', 'comercial', 'almoxarifado', 'embalagens', 'documentos', 'suprimentos', 'usuarios',
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
  // Encarregado de turno: responde pelo que a fábrica produz no dia. Enxerga a
  // produção inteira, tira peça do almoxarifado e abre O.S. — as três coisas
  // que ele resolve sem pedir para ninguém. Fica de fora o que é decisão de
  // outra mesa: pedido, expedição, comercial e qualidade. A exceção é o
  // monitoramento de PCC (forno, detector, ímãs): quem preenche é a linha.
  encarregado: [
    'painel',
    'pcp', 'produtos', 'ordens', 'lotes', 'estoque', 'pallets', 'reprocesso', 'recebimentos',
    'almoxarifado', 'embalagens', 'manutencao', 'ordens_servico', 'pcc_fisico',
  ],
  operador: [
    'painel',
    'pcp', 'produtos', 'pedidos', 'expedicao', 'estoque', 'pallets', 'reprocesso',
    'ordens', 'lotes', 'recebimentos', 'almoxarifado', 'embalagens', 'pcc_fisico',
  ],
  qualidade: [
    'painel',
    'lotes', 'recebimentos', 'fornecedores', 'qualidade', 'acompanhamento', 'monitoramento_agua', 'insumos_lab', 'contraprovas', 'pcc_fisico', 'ppho',
    'especificacoes', 'calibracao', 'analise_risco', 'auditoria', 'ambiental',
    'nao_conformidades', 'reprocesso', 'documentos',
    // Inspeção e liberação da carga (FOR POP 14 1.1, seções 3 e 4).
    'expedicao',
    // Abre O.S. quando encontra problema em equipamento (e já libera as que
    // têm risco à segurança de alimentos).
    'manutencao', 'ordens_servico',
  ],
  manutencao: ['painel', 'manutencao', 'ordens_servico', 'calibracao', 'pcc_fisico', 'almoxarifado', 'embalagens'],
  // Compras cuida da documentação de homologação e do estoque de consumíveis
  // e embalagens. Não vê produção, qualidade nem comercial.
  // A chegada da carga (`recebimentos`) é do comprador tanto quanto a
  // previsão: é onde ele confere se o que combinou entrou de fato.
  compras: ['painel', 'documentos', 'almoxarifado', 'embalagens', 'suprimentos', 'recebimentos', 'fornecedores'],
  // Almoxarifado atende a manutenção: quem entrega a peça e quem a consome
  // olham o mesmo estoque.
  almoxarifado: ['painel', 'almoxarifado', 'embalagens', 'manutencao', 'ordens_servico'],
  // Comercial vende e acompanha o que sustenta a venda: o grupo Suprimentos
  // inteiro (previsão da semana, produtores, recebimentos e fornecedores) e os
  // lotes prontos. De produção, só lotes — programação, apontamento e ordens
  // são do chão de fábrica.
  comercial: [
    'painel', 'comercial', 'pedidos', 'lotes',
    'suprimentos', 'recebimentos', 'fornecedores',
  ],
  // Logística: estoque e expedição, os pedidos que vai carregar e as
  // embalagens/bags que saem com a carga. Sem painel — o painel mostra a
  // fábrica inteira; quem entra cai direto na Expedição. Abre O.S. (só a
  // tela de ordens de serviço, não o resto do PCM).
  logistica: ['estoque', 'expedicao', 'pedidos', 'embalagens', 'ordens_servico'],
  // Só a administração de usuários e perfis. Soma-se a outro perfil.
  administrador: ['painel', 'usuarios'],
};

// Verdadeiro se algum dos perfis do usuário dá acesso ao módulo.
// Perfis somam: quem é gestão e administrador acessa a união dos dois.
export function podeAcessar(perfis: Perfil[], modulo: Modulo): boolean {
  return perfis.some((p) => MODULOS_POR_PERFIL[p]?.includes(modulo));
}
