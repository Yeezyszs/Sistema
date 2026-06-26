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

// Entities + regras puras
export * from './entities/Etapa';
export * from './entities/Lote';
export * from './entities/EtapaLote';
export * from './entities/Recebimento';
export * from './entities/MovimentoEstoque';
export * from './entities/RegistroEtapa';
export * from './entities/Produto';
export * from './entities/Fornecedor';
