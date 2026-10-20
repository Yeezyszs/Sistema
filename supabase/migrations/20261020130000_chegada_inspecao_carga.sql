-- ============================================================================
-- Qualidade, fase 1: a Chegada da carga passa a cobrir a ficha de descarga
-- (FOR POP 09 1.2) e o checklist de inspeção da carga (FOR POP 09 1.5).
--
-- Tudo no mesmo registro da carga, para que placa, ticket e produtor não sejam
-- digitados duas vezes e a rastreabilidade saia de um lugar só.
--
--   rendas       — as 5 amostras de renda; `renda` continua sendo a média,
--                  que é o que o custo usa.
--   impureza     — % de impureza da carga.
--   tipo_mp      — convencional | organica.
--   inspecao     — {chave do item: 'c' | 'nc'} dos 6 itens do checklist.
--   inspecao_obs — observação obrigatória quando algum item é não conforme.
-- ============================================================================
alter table producao.recebimentos
  add column if not exists rendas numeric[],
  add column if not exists impureza numeric,
  add column if not exists placa text,
  add column if not exists tipo_mp text check (tipo_mp in ('convencional','organica')),
  add column if not exists inspecao jsonb,
  add column if not exists inspecao_obs text;
