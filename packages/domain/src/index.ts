// ─────────────────────────────────────────────────────────────
// @sistema/domain — Camada de domínio (pura, sem dependências externas).
//
// Ponto único de import. Backend (apps/api) e frontend (apps/web)
// consomem os tipos e regras do domínio DAQUI — um `Lote` só em todo
// o monorepo.
// ─────────────────────────────────────────────────────────────

// Value-objects
export * from './value-objects/StatusLote';
export * from './value-objects/TipoMovimento';
export * from './value-objects/Perfil';

// Entities + regras puras
export * from './entities/Etapa';
export * from './entities/Lote';
export * from './entities/EtapaLote';
export * from './entities/Recebimento';
export * from './entities/MovimentoEstoque';
export * from './entities/RegistroEtapa';
export * from './entities/Produto';
export * from './entities/Fornecedor';
export * from './entities/PontoControle';
export * from './entities/Monitoramento';
export * from './entities/Cliente';
export * from './entities/OrdemProducao';
export * from './entities/Especificacao';
export * from './entities/Laudo';
export * from './entities/NaoConformidade';
export * from './entities/PccFisico';
export * from './entities/Checklist';
export * from './entities/Ppho';
export * from './entities/Manutencao';
export * from './entities/Calibracao';
export * from './entities/AnaliseRisco';
export * from './entities/Auditoria';
export * from './entities/Ambiental';
export * from './entities/Recebimentoqa';
export * from './entities/Programacao';
export * from './entities/Apontamento';
export * from './entities/Estoque';
export * from './entities/Pedido';
export * from './entities/Carregamento';
