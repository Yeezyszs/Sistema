-- ============================================================================
-- Qualidade, fase 1: questionário de homologação do produtor (FOR POP 07 1.1).
--
--   questionario — {nº do item: 'c' | 'nc' | 'na'} (31 itens; 40 se orgânico)
--   citacoes     — textos pedidos pelo formulário ("citar": uso anterior,
--                  culturas próximas, agrotóxicos, mercado compatível)
--   dados        — cabeçalho: propriedade, código, localização, variedades,
--                  comprador, tipo de produção, área cultivada
--   agrotoxicos  — declaração dos agrotóxicos permitidos usados
--   arquivo_*    — questionário assinado no bucket privado `fornecedores`
--
-- `pontuacao` passa a ser o % de conformes entre os itens aplicáveis. O status
-- continua alimentando core.fornecedores.homologado pelo trigger existente.
-- ============================================================================
alter table qualidade.homologacoes
  add column if not exists questionario jsonb,
  add column if not exists citacoes jsonb,
  add column if not exists dados jsonb,
  add column if not exists agrotoxicos text[],
  add column if not exists arquivo_path text,
  add column if not exists arquivo_nome text;
