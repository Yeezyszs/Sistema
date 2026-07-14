-- ============================================================================
-- 0037 — Catálogo oficial de produtos (planilha "CÓDIGOS DE PRODUTOS").
--   Desativa os produtos acabados antigos (histórico preservado via flag) e
--   insere os 24 códigos oficiais com cliente, faixa de umidade e peso por
--   bag/saca. O código numérico permite digitar só o código e puxar o produto.
-- ============================================================================
alter table core.produtos
  add column if not exists ativo boolean not null default true,
  add column if not exists cliente_rotulo text,
  add column if not exists umidade_faixa  text;

-- Desativa o catálogo antigo de acabados (matéria-prima continua ativa).
update core.produtos set ativo = false where tipo = 'produto_acabado';

insert into core.produtos (org_id, codigo, nome, tipo, unidade, peso_unitario, cliente_rotulo, umidade_faixa)
select '11111111-1111-1111-1111-111111111111', p.codigo, p.nome, 'produto_acabado', 'kg', p.peso, p.cliente, p.umidade
from (values
  ('6221',  'SACO DE 25 KG - P. 10 · FARINHA CRUA',            25,   'SACAS/DIVERSOS', '10% A 11,5%'),
  ('824',   'SACO DE 50 KG - P. 20 · FARINHA CRUA',            50,   'SACAS',          '10% A 11,5%'),
  ('11024', 'SACO DE 50 KG - P. 16 · FARINHA CRUA',            50,   'SACAS',          '10% A 11,5%'),
  ('7281',  'SACO DE 50 KG - P. 16 · FARINHA TORRADA',         50,   'SACAS',          null),
  ('822',   'SACO DE 50 KG - P. 10 · FARINHA CRUA',            50,   'SACAS',          '10% A 11,5%'),
  ('194',   'SACO DE 25 KG - P. 16 · FARINHA CRUA',            25,   'SACAS/DIVERSOS', '10% A 11,5%'),
  ('11405', 'SACAS PANIFICÁVEL DE 25KG · PANIFICÁVEL',         25,   'ZAYA',           null),
  ('823',   'PÓ FILTRADO 25 KG · PÓ FILTRADO',                 25,   'SACAS',          null),
  ('6829',  'PÓ FILTRADO 1000 KG · PÓ FILTRADO',               1000, 'BAG',            null),
  ('18070', 'PENEIRA 16 - 1400 KG (24 Bag''s) · FARINHA CRUA', 1400, 'GLÚTEM FREE',    '10% A 11,5%'),
  ('8593',  'PENEIRA 20 - 1400 KG (24 Bag''s) · FARINHA CRUA', 1400, 'GLÚTEM FREE',    '10% A 11,5%'),
  ('8334',  'PENEIRA 20 - 1000 KG (24 Bag''s) · FARINHA CRUA', 1000, 'ESTOQUE',        '10% A 11,5%'),
  ('16229', 'PENEIRA 16 - 750 KG (24 Bag''s) · FARINHA CRUA',  750,  'GENERAL MILLS',  '10% A 11,5%'),
  ('16500', 'PENEIRA 16 - 750 KG (24 Bag''s) · FARINHA P/ TORRAR', 750, 'GENERAL MILLS', '10% A 11,5%'),
  ('16231', 'PENEIRA 16 - 750 KG (24 Bag''s) · FARINHA TORRADA',   750, 'GENERAL MILLS', null),
  ('16232', 'PENEIRA 16 - 750 KG (24 Bag''s) · P16 5%',        750,  'GENERAL MILLS',  '4% A 5%'),
  ('10823', 'PENEIRA 16 - 1000 KG (24 Bag''s) · FARINHA CRUA', 1000, 'CASSAVA',        '10% A 11,5%'),
  ('11587', 'PENEIRA 16 - 1000 KG (24 Bag''s) · FARINHA TORRADA',  1000, 'GENERAL MILLS', null),
  ('10887', 'PENEIRA 16 - 1000 KG (24 Bag''s) · FARINHA P/ TORRAR', 1000, 'GENERAL MILLS', '10% A 11,5%'),
  ('14430', 'PENEIRA 16 - 1000 KG (24 Bag''s) · P16 5%',       1000, 'GENERAL MILLS',  '4% A 5%'),
  ('1747',  'PENEIRA 10 - 1000 KG (24 Bag''s) · FARINHA CRUA', 1000, 'AGROÇALES',      '10% A 11,5%'),
  ('11986', 'PANIFICÁVEL 1000 KG (24 Bag''s) · PANIFICÁVEL',   1000, 'ZAYA',           '8% A 9,5%'),
  ('34',    'ESPECIAL 1250 KG (16 Bag''s) · ESPECIAL',         1250, 'CASSAVA',        '8% A 9,5%'),
  ('5034',  'ESPECIAL 1000 KG (24 Bag''s) · ESPECIAL',         1000, 'CASSAVA',        '8% A 9,5%')
) as p(codigo, nome, peso, cliente, umidade)
where not exists (
  select 1 from core.produtos x
  where x.org_id='11111111-1111-1111-1111-111111111111' and x.codigo=p.codigo and x.ativo
);
