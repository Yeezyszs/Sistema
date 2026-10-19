-- Detalhe da foto: a manutenção descreve a operação mostrada no anexo
-- ("aperto dos parafusos do mancal", "limpeza após a troca").
alter table manutencao.os_anexos add column if not exists descricao text;
