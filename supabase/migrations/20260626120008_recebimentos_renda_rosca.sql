-- ============================================================================
-- 0008 — Recebimentos: renda e rosca (onde a MP foi descarregada)
-- ============================================================================
alter table producao.recebimentos
  add column renda text,   -- ponto de descarga (renda)
  add column rosca text;   -- rosca transportadora usada
