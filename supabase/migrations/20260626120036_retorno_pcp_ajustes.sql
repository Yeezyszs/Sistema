-- ============================================================================
-- 0036 — Retorno do PCP: ajustes de rastreabilidade.
--   1) Etapas: flag ativo; desativa Descarga/Extração/Secagem (fluxo do lote
--      passa a ser Laboratório → Ensaque → Expedição). Histórico preservado.
--   2) Recebimentos: hora de início e fim da descarga.
--   3) Produtos: código curto (P.10, P.16...) exibido na programação.
-- ============================================================================
alter table producao.etapas add column if not exists ativo boolean not null default true;
update producao.etapas set ativo = false where codigo in ('descarga','extracao','secagem');

alter table producao.recebimentos
  add column if not exists hora_inicio time,
  add column if not exists hora_fim    time;

alter table core.produtos add column if not exists codigo text;

-- Extrai o código do prefixo entre parênteses do nome (ex.: "(P 10) FARINHA...").
update core.produtos
   set codigo = trim(substring(nome from '^\(([^)]{1,24})\)'))
 where codigo is null and nome ~ '^\([^)]{1,24}\)';
