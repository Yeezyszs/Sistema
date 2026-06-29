-- ============================================================================
-- 0010 — Laudos: tipo (físico-químico / verificação visual) + colunas dos moldes
-- ============================================================================
alter table qualidade.laudos_internos
  add column tipo text not null default 'fisico_quimico'
    check (tipo in ('fisico_quimico','verificacao_visual')),
  add column dados jsonb;

alter table qualidade.laudo_resultados
  add column referencia_texto text,
  add column metodologia      text;
