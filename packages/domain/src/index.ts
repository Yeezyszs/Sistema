// ─────────────────────────────────────────────────────────────
// @sistema/domain — Camada de domínio (pura, sem dependências externas).
//
// Ponto único de import. Backend (apps/api) e frontend (apps/web)
// consomem os tipos do domínio DAQUI — um `Lote` só em todo o monorepo.
//
// As entidades e value-objects entram na Etapa 3:
//   export * from './entities/Lote';
//   export * from './value-objects/StatusLote';
// ─────────────────────────────────────────────────────────────
export {};
