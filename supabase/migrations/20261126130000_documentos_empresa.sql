-- Documentos regulatórios da própria empresa (alvará, licenças, CLCB, MAPA,
-- IBAMA, outorga, CNDT…). Todos os setores consultam; Qualidade, Gestão e
-- Administrador mantêm. `validade` nula = sem vencimento ("indeterminado",
-- "sem data definida"), explicado em `validade_obs`.
create table if not exists core.documentos_empresa (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  nome          text not null,
  numero        text,
  validade      date,
  validade_obs  text,
  observacao    text,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id)
);
create trigger trg_set_org_id before insert on core.documentos_empresa
  for each row execute function core.set_org_id();

alter table core.documentos_empresa enable row level security;
create policy leitura on core.documentos_empresa
  for select using (org_id = core.current_org());
create policy escrita on core.documentos_empresa
  for all
  using (org_id = core.current_org() and core.tem_perfil(array['qualidade','gestao','administrador']))
  with check (org_id = core.current_org() and core.tem_perfil(array['qualidade','gestao','administrador']));
grant select, insert, update, delete on core.documentos_empresa to authenticated;

insert into core.documentos_empresa (org_id, nome, numero, validade, validade_obs)
select '11111111-1111-1111-1111-111111111111', d.nome, d.numero, d.validade::date, d.obs
  from (values
    ('Alvará municipal', '173/2024', null, 'Sem data definida — condicionado ao CLCB vigente'),
    ('Licença sanitária', '605/2023', null, 'Indeterminado'),
    ('ART – CRQ', '25544/2026', '2027-03-31', null),
    ('CLCB – Bombeiros', '3.9.01.25.0000971017-20', '2026-05-06', null),
    ('Registro MAPA', 'PR 003925-0', '2029-03-04', null),
    ('Regularidade IBAMA', '6947290', '2027-01-19', null),
    ('Outorga de captação subterrânea', '24594/2023/OD-GOUT', '2029-06-22', null),
    ('Licença de operação – IAT', '207475-R3', '2030-10-06', null),
    ('Certificado de controle de pragas', 'PROCIP', '2027-09-01', null),
    ('Certidão Negativa de Débitos Trabalhistas – CNDT', '79478731/2026', '2027-03-24', null),
    ('Cartão CNPJ', '19.777.875/0001-22', null, 'Sem data definida')
  ) as d(nome, numero, validade, obs)
 where not exists (select 1 from core.documentos_empresa);
