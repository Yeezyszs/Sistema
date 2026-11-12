-- Calibração no formato do FOR-POP 05 1.4 Ver 02 (Avaliação dos certificados
-- de calibração). O instrumento ganha área e nº de série; o certificado ganha
-- a faixa calibrada, critério, erro+incerteza, análise crítica e quem verificou.
-- `valido_ate` continua sendo a validade do certificado (base do alerta de 30
-- dias); `recalibrar_ate` é o "Vencimento" da planilha — a data interna para
-- já ter calibrado de novo, normalmente uns dias antes da validade.
alter table qualidade.instrumentos
  add column if not exists area        text,
  add column if not exists numero_serie text;

alter table qualidade.calibracoes
  add column if not exists recalibrar_ate     date,
  add column if not exists faixa_calibrada    text,
  add column if not exists criterio_aceitacao text,
  add column if not exists analise_critica    text,
  add column if not exists verificado_em      date,
  add column if not exists verificado_por     text;
