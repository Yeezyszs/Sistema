-- ============================================================================
-- 0033 — Qualidade/Produção: Controle de Retidos (FOR-PQSA18) + Legenda de Desvios.
--   Faz o upgrade do módulo Reprocesso para o "Controle de Retidos" real:
--     - catálogo de desvios codificados (RF-COR-001, PR-UM-001, ...) com a
--       categoria, descrição, produto afetado e onde reprocessar;
--     - campos extra no retido: lacre, desvio, onde reprocessar, descrição da
--       ocorrência, evidência, lote final;
--     - status alinhado à planilha: em_estoque / concluido.
-- ============================================================================

-- 1) Catálogo de desvios (a "Legenda de Desvios").
create table producao.desvios (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references core.organizacoes(id),
  codigo           text not null,
  categoria        text,
  descricao        text not null,
  produto_afetado  text,          -- descrição resumida / produto afetado
  onde_reprocessar text,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  created_by       uuid references core.usuarios(id),
  unique (org_id, codigo)
);
create index on producao.desvios (org_id);

create trigger trg_set_org_id before insert on producao.desvios
  for each row execute function core.set_org_id();
alter table producao.desvios enable row level security;
create policy tenant_isolation on producao.desvios
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on producao.desvios to authenticated;

-- 2) Semeia a legenda conhecida para a org demo.
insert into producao.desvios (org_id, categoria, codigo, descricao, produto_afetado, onde_reprocessar)
select '11111111-1111-1111-1111-111111111111', d.categoria, d.codigo, d.descricao, d.produto_afetado, d.onde_reprocessar
from (values
  ('Alteração de Produto (start de linha)','RF-MESCL-001','Produto mesclado com granulometria diferente devido ao start de linha e mudança de produto.','Farinha crua com granulometrias diferentes','Farinha Crua ou Torrada'),
  ('Alteração de Produto (start de linha)','RF-MESCL-002','Farinha crua mesclada com farinha especial devido ao start de linha.','Farinha crua com farinha especial','Farinha Crua/Torrada ou vender como pó'),
  ('Alteração de Produto (start de linha)','RF-MESCL-003','Farinha crua mesclada com farinha torrada devido ao start de linha.','Farinha crua com farinha torrada','Não reprocessa — identificar como "Farinha Tipo 2, Torrada com Crua"'),
  ('Cor (start de linha)','RF-COR-001','Desvio na padronização de cor para cliente específico devido ao start de linha.','Farinha amarela','Farinha Crua ou Torrada'),
  ('Cor (start de linha)','RF-COR-002','Desvio na padronização de cor para cliente específico devido ao start de linha.','Farinha creme escura','Farinha Crua ou Torrada'),
  ('Cor (start de linha)','RF-PP-001','Presença de pontos pretos devido ao start de linha.','Pontos pretos','Avaliar; se não for possível reprocessar, identificar como "Farinha Tipo 2, Crua com Pontos Pretos"'),
  ('Cor (start de linha)','RF-PI-001','Presença de casquinhas em bags iniciais por falta de areia na descarga.','Presença de pintas por falha de descascamento','Farinha Crua ou Torrada'),
  ('Umidade','PR-UM-001','Desvio de umidade no produto (> 5%).','Desvio de umidade acima de 5%','Farinha Crua ou Torrada'),
  ('Umidade','PR-UM-002','Desvio de umidade no produto (> 12%).','Desvio de umidade acima de 12%','Farinha Crua ou Torrada'),
  ('Cor (processo contínuo)','PR-COL-001','Desvio de coloração no acompanhamento do processo.','Cor amarela','Farinha Crua ou Torrada'),
  ('Cor (processo contínuo)','PR-COL-002','Desvio de coloração no acompanhamento do processo.','Cor creme escura','Farinha Crua ou Torrada'),
  ('Cor (processo contínuo)','PR-COL-003','Desvio de coloração no acompanhamento do processo.','Presença de pontos pretos','Farinha Crua'),
  ('Cor (processo contínuo)','PR-COL-004','Presença de casquinha por falha de descascamento no processo contínuo.','Presença de casquinha','Farinha Crua'),
  ('Processo contínuo','PR-GRAN-001','Desvio de granulometria para cliente específico durante o processo.','Desvio de granulometria','Farinha Crua ou Torrada'),
  ('Processo contínuo','PR-PES-001','Desvio de peso no bag para cliente específico.','Desvio de peso','Farinha Crua'),
  ('Processo contínuo','PR-ACZ-001','Alteração na acidez para cliente específico.','Alteração na acidez','Farinha Crua ou Torrada'),
  ('Processo contínuo','PR-RASG-001','Bag rasgado / sacaria rasgada.','Bag / sacaria rasgada','Farinha Crua ou Torrada'),
  ('Processo contínuo','PR-TOR-001','Farinha crua destinada a torrar.','Para torrar','Farinha Torrada'),
  ('Umidade / contaminação micro.','ARM-UM-TRAD-002','Desvio de umidade / presença de grumos.','Desvio de umidade na armazenagem','Farinha Crua ou Torrada'),
  ('Armazenamento','ARM-IDNT-001','Produto sem identificação no estoque.','Sem identificação','Farinha Crua ou Torrada'),
  ('Sensorial','ARM-SENS-001','Desvio de sensorial (odor, sabor) no produto.','Desvio sensorial em armazém','Farinha Crua')
) as d(categoria, codigo, descricao, produto_afetado, onde_reprocessar)
where not exists (
  select 1 from producao.desvios x
  where x.org_id='11111111-1111-1111-1111-111111111111' and x.codigo=d.codigo
);

-- 3) Upgrade da tabela de retidos (antiga reprocessos).
alter table producao.reprocessos
  add column if not exists lacre               text,
  add column if not exists desvio_id           uuid references producao.desvios(id),
  add column if not exists onde_reprocessar     text,
  add column if not exists descricao_ocorrencia text,
  add column if not exists evidencia_url        text,
  add column if not exists lote_final           text;

-- status alinhado à planilha (em_estoque / concluido).
alter table producao.reprocessos alter column status set default 'em_estoque';
update producao.reprocessos set status = 'em_estoque' where status = 'pendente';
update producao.reprocessos set status = 'concluido'  where status = 'resolvido';
alter table producao.reprocessos drop constraint if exists reprocessos_status_check;
alter table producao.reprocessos add constraint reprocessos_status_check
  check (status in ('em_estoque','concluido'));

-- carimba a data de conclusão quando status vira concluido.
create or replace function producao.set_reprocesso_numero()
returns trigger language plpgsql security definer set search_path = producao, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero),0)+1 into NEW.numero from producao.reprocessos where org_id = NEW.org_id;
  end if;
  if NEW.status = 'concluido' and NEW.resolvido_em is null then
    NEW.resolvido_em := current_date;
  end if;
  return NEW;
end; $$;
