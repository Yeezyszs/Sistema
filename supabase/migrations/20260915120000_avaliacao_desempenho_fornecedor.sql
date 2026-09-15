-- Avaliação de desempenho de fornecedor (FOR-POP 07 1.2 Ver 02).
--
-- A tabela qualidade.avaliacoes_fornecedor já existia da fase 3 e nunca foi
-- usada. Aqui ela recebe o que falta para virar o formulário: identificação do
-- responsável, observação, e a garantia de que o mesmo fornecedor não é
-- avaliado duas vezes no mesmo semestre.

alter table qualidade.avaliacoes_fornecedor
  add column if not exists observacao  text,
  add column if not exists responsavel text;

-- Períodos são sempre 'AAAA-01' (jan–jun) ou 'AAAA-07' (jul–dez).
update qualidade.avaliacoes_fornecedor set periodo = null where periodo !~ '^\d{4}-(01|07)$';

alter table qualidade.avaliacoes_fornecedor
  drop constraint if exists avaliacoes_fornecedor_periodo_check;
alter table qualidade.avaliacoes_fornecedor
  add constraint avaliacoes_fornecedor_periodo_check
  check (periodo ~ '^\d{4}-(01|07)$');

create unique index if not exists avaliacoes_fornecedor_periodo_uniq
  on qualidade.avaliacoes_fornecedor (org_id, fornecedor_id, periodo);
