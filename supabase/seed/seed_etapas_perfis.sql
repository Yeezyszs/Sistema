-- ============================================================================
-- Seed — catálogos globais (idempotente)
-- ============================================================================

-- Etapas do fluxo FSSC 22000 (ordem importa)
insert into producao.etapas (codigo, nome, ordem) values
  ('descarga',    'Descarga',    1),
  ('extracao',    'Extração',    2),
  ('secagem',     'Secagem',     3),
  ('laboratorio', 'Laboratório', 4),
  ('ensaque',     'Ensaque',     5),
  ('expedicao',   'Expedição',   6)
on conflict (codigo) do update
  set nome = excluded.nome, ordem = excluded.ordem;

-- Perfis de acesso (universais)
insert into core.perfis (nome) values
  ('operador'),
  ('qualidade'),
  ('manutencao'),
  ('gestao')
on conflict (nome) do nothing;
