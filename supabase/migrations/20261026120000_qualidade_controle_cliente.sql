-- ============================================================================
-- Qualidade: controle por cliente (FOR-CQ-001 General Mills, FOR-CQ-002 Pódium).
--
-- As planilhas de acompanhamento separam a especificação por TIPO de farinha
-- (crua, 5%, torrada, panificável), não por SKU. A especificação passa a poder
-- ser cliente × tipo de farinha, sem produto; a análise guarda o tipo.
-- ============================================================================
alter table qualidade.especificacoes alter column produto_id drop not null;
alter table qualidade.especificacoes add column if not exists tipo_farinha text
  check (tipo_farinha in ('crua','cinco','torrada','panificavel'));
alter table qualidade.especificacoes add constraint especificacoes_alvo_ck
  check (produto_id is not null or tipo_farinha is not null);
alter table qualidade.analises_processo add column if not exists tipo_farinha text
  check (tipo_farinha in ('crua','cinco','torrada','panificavel'));
-- Histórico das planilhas: o código do lote nem sempre existe no sistema, então
-- fica guardado em texto; `origem` marca o que veio de planilha.
alter table qualidade.analises_processo add column if not exists lote_codigo text;
alter table qualidade.analises_processo add column if not exists origem text;
create index if not exists analises_processo_lote_codigo_idx on qualidade.analises_processo (lote_codigo);

-- Limites das planilhas, como estavam no cabeçalho de cada aba.
do $$
declare
  org uuid := '11111111-1111-1111-1111-111111111111';
  gm uuid := (select id from core.clientes where nome = 'General Mills' and org_id = org limit 1);
  pd uuid := (select id from core.clientes where nome = 'Podium Alimentos' and org_id = org limit 1);
  esp uuid;
  r record;
begin
  for r in select * from (values
    (gm, 'crua',        'FOR-CQ-001 · General Mills · Farinha crua',        13::numeric, 6.0::numeric, 7.5::numeric),
    (gm, 'cinco',       'FOR-CQ-001 · General Mills · Farinha 5%',          5,  6.0, 7.5),
    (gm, 'torrada',     'FOR-CQ-001 · General Mills · Farinha torrada',     5,  6.0, 7.5),
    (pd, 'crua',        'FOR-CQ-002 · Pódium · Farinha crua',               12, 5.8, 7.7),
    (pd, 'panificavel', 'FOR-CQ-002 · Pódium · Especial panificável',       14, 6.0, 7.5)
  ) as t(cli, tipo, nome, umid, ph_min, ph_max)
  loop
    continue when r.cli is null
      or exists (select 1 from qualidade.especificacoes e where e.cliente_id = r.cli and e.tipo_farinha = r.tipo and e.vigente);
    insert into qualidade.especificacoes (org_id, cliente_id, tipo_farinha, nome, versao, vigente)
      values (org, r.cli, r.tipo, r.nome, 1, true) returning id into esp;
    insert into qualidade.especificacao_parametros (org_id, especificacao_id, ensaio, limite_min, limite_max, unidade, ordem) values
      (org, esp, 'Umidade',               null,     r.umid,   '%',              0),
      (org, esp, 'Acidez',                null,     3,        'mL NaOH/10g',    1),
      (org, esp, 'pH',                    r.ph_min, r.ph_max, null,             2),
      (org, esp, 'Granulometria P10 (passagem)', 100, null,   '%',              3),
      (org, esp, 'Granulometria P18 (retenção)', null, 10,    '%',              4),
      (org, esp, 'Granulometria P200 (passagem)', null, 3,    '%',              5);
  end loop;
end $$;
