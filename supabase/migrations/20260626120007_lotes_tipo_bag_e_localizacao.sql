-- ============================================================================
-- 0007 — Lotes: tipo de bag (embalagem do produto) + localização no barracão
-- ============================================================================
alter table producao.lotes
  add column tipo_bag       text,  -- ex.: "Big Bag 1000kg", "Saco 25kg"
  add column local_barracao text,  -- ex.: "Barracão 1"
  add column local_rua      text;  -- ex.: "Rua 17"
