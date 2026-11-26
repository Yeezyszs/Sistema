-- Checklist de ferramentas do encarregado (Guilherme): terceira lista, ao
-- lado da mecânica e da elétrica.
alter table manutencao.ferramentas drop constraint if exists ferramentas_tipo_check;
alter table manutencao.ferramentas
  add constraint ferramentas_tipo_check check (tipo in ('eletrica','mecanica','encarregado'));

insert into manutencao.colaboradores (org_id, nome, funcao, setor, ativo)
select '11111111-1111-1111-1111-111111111111', 'Guilherme', 'Encarregado', 'Manutenção', true
 where not exists (select 1 from manutencao.colaboradores where nome = 'Guilherme');

insert into manutencao.ferramentas (org_id, tipo, nome, qty)
select '11111111-1111-1111-1111-111111111111', 'encarregado', f.nome, f.qty
  from (values
    ('Chave 14', 2), ('Chave 13', 2), ('Chave 9/16 x 1/2', 2), ('Marreta 1 kg', 1),
    ('Alicate universal', 1), ('Alicate de pressão', 1), ('Chave 15/16', 2),
    ('Chave Philips 1/4 x 4', 2), ('Chave de fenda 1/4 x 5', 2), ('Chave 3/4', 2),
    ('Chave 17', 2), ('Chave 22', 1), ('Chave 28', 1), ('Chave 32', 1),
    ('Alicate de corte', 1), ('Chave de cano 300', 1), ('Chave grifo 250', 1),
    ('Pito 19', 1), ('Extensor 125 mm', 1)
  ) as f(nome, qty)
 where not exists (select 1 from manutencao.ferramentas where tipo = 'encarregado');
