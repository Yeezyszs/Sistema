-- ============================================================================
-- Adiciona o status 'cancelado' aos lotes (cancelamento preserva rastreabilidade).
-- ============================================================================
alter table producao.lotes drop constraint if exists lotes_status_check;
alter table producao.lotes add constraint lotes_status_check
  check (status in ('em_processo','aguardando_liberacao','liberado','bloqueado','expedido','cancelado'));
