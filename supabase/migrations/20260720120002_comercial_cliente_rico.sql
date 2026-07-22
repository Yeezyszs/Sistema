-- ============================================================================
-- Comercial (Fase 1) — cadastro de cliente enriquecido.
--   Campos comerciais opcionais; não alteram nada do que já existe.
-- ============================================================================
alter table core.clientes
  add column if not exists contato             text,
  add column if not exists telefone            text,
  add column if not exists email               text,
  add column if not exists endereco_entrega    text,
  add column if not exists condicao_pagamento  text;
