-- ============================================================================
-- Catálogo inicial de homologação de fornecedores (FOR-POP 7 2.0).
--   Ponto de partida — a Qualidade refina depois pela aba Catálogo.
--   Idempotente: pode rodar de novo sem duplicar.
--
-- Uso: psql / SQL editor. Aplica na primeira organização cadastrada.
-- ============================================================================
do $$
declare
  v_org uuid;
begin
  select id into v_org from core.organizacoes order by created_at limit 1;
  if v_org is null then
    raise exception 'Nenhuma organização cadastrada.';
  end if;

  -- ── Segmentos (a atividade que carrega o checklist) ──────────────────────
  insert into qualidade.segmentos_fornecedor (org_id, nome, categoria) values
    (v_org, 'Laboratório de análises',                  'servico'),
    (v_org, 'Controle de pragas',                       'servico'),
    (v_org, 'Serviços ambientais',                      'servico'),
    (v_org, 'Limpeza de caixa d''água',                 'servico'),
    (v_org, 'Consultoria em segurança de alimentos',    'servico'),
    (v_org, 'Refeição coletiva',                        'servico'),
    (v_org, 'Higienização de big bags',                 'servico'),
    (v_org, 'Coleta e destinação de resíduos',          'servico'),
    (v_org, 'Calibração',                               'servico'),
    (v_org, 'Matéria-prima / produtor rural',           'produto'),
    (v_org, 'Produtos químicos — caldeira',             'produto'),
    (v_org, 'Produtos químicos — água potável',         'produto'),
    (v_org, 'Produtos químicos — higienização',         'produto'),
    (v_org, 'Lubrificantes',                            'produto'),
    (v_org, 'Embalagens primárias',                     'produto'),
    (v_org, 'Filme stretch / sacos',                    'produto'),
    (v_org, 'EPIs',                                     'produto'),
    (v_org, 'Material de manutenção',                   'produto'),
    (v_org, 'Equipamentos',                             'equipamento'),
    (v_org, 'Transportadora',                           'transporte')
  on conflict (org_id, nome) do nothing;

  -- ── Tipos de documento ───────────────────────────────────────────────────
  -- tem_validade liga o alerta de vencimento; permite_multiplos aceita vários
  -- arquivos vigentes (ficha técnica, laudos, certificações).
  insert into qualidade.documentos_exigidos (org_id, nome, tem_validade, origem, permite_multiplos) values
    (v_org, 'Alvará de funcionamento',                        true,  'fornecedor', false),
    (v_org, 'Licença sanitária',                              true,  'fornecedor', false),
    (v_org, 'Licença ambiental',                              true,  'fornecedor', false),
    (v_org, 'AVCB — Auto de Vistoria do Corpo de Bombeiros',  true,  'fornecedor', false),
    (v_org, 'Certidão de responsável técnico (RT)',           true,  'fornecedor', false),
    (v_org, 'ART / TRT do responsável técnico',               true,  'fornecedor', true),
    (v_org, 'Ficha técnica do produto',                       false, 'fornecedor', true),
    (v_org, 'FISPQ',                                          false, 'fornecedor', true),
    (v_org, 'Laudo / declaração food grade',                  true,  'fornecedor', true),
    (v_org, 'Certificado NSF',                                true,  'fornecedor', true),
    (v_org, 'Certificado ISO 9001',                           true,  'fornecedor', false),
    (v_org, 'Certificado ISO 22000',                          true,  'fornecedor', false),
    (v_org, 'Certificado FSSC 22000',                         true,  'fornecedor', false),
    (v_org, 'Certificado ISO 14001',                          true,  'fornecedor', false),
    (v_org, 'Certificado ISO/IEC 17025',                      true,  'fornecedor', false),
    (v_org, 'Certificado BPF',                                true,  'fornecedor', false),
    (v_org, 'Laudo de análise do produto',                    true,  'fornecedor', true),
    (v_org, 'Laudo de migração (contato com alimento)',       true,  'fornecedor', true),
    (v_org, 'Certificado de calibração RBC / Inmetro',        true,  'fornecedor', true),
    (v_org, 'Declaração de ausência de OGM',                  true,  'fornecedor', false),
    (v_org, 'Declaração de alérgenos',                        true,  'fornecedor', false),
    (v_org, 'Declaração de atendimento à legislação',         true,  'fornecedor', false),
    (v_org, 'Licença de operação IBAMA',                      true,  'fornecedor', false),
    (v_org, 'ATTIPP / Cadastro Técnico Federal',              true,  'fornecedor', false),
    (v_org, 'MTR — Manifesto de Transporte de Resíduos',      false, 'fornecedor', true),
    (v_org, 'CDF — Certificado de Destinação Final',          true,  'fornecedor', true),
    (v_org, 'Contrato de prestação de serviço',               true,  'fornecedor', false),
    (v_org, 'Plano / programa de controle de pragas',         true,  'fornecedor', false),
    (v_org, 'Comprovante de treinamento da equipe',           true,  'fornecedor', true),
    (v_org, 'Apólice de seguro de carga',                     true,  'fornecedor', false),
    (v_org, 'CRLV dos veículos',                              true,  'fornecedor', true),
    (v_org, 'Certificado de higienização de veículo',         true,  'fornecedor', true),
    (v_org, 'FOR-POP — Avaliação de fornecedor',              true,  'interno',    false)
  on conflict (org_id, nome) do nothing;
end $$;

-- ── Checklists de exemplo (§9) ─────────────────────────────────────────────
-- Associa documentos aos segmentos por nome, para o arquivo seguir legível.
do $$
declare
  v_org uuid;
  v_par record;
begin
  select id into v_org from core.organizacoes order by created_at limit 1;

  for v_par in
    select * from (values
      -- Calibração
      ('Calibração', 'Alvará de funcionamento',                       'obrigatorio'),
      ('Calibração', 'Certificado ISO/IEC 17025',                     'obrigatorio'),
      ('Calibração', 'Certificado de calibração RBC / Inmetro',       'obrigatorio'),
      ('Calibração', 'Certidão de responsável técnico (RT)',          'condicional'),
      ('Calibração', 'Contrato de prestação de serviço',              'condicional'),
      -- Controle de pragas
      ('Controle de pragas', 'Alvará de funcionamento',               'obrigatorio'),
      ('Controle de pragas', 'Licença sanitária',                     'obrigatorio'),
      ('Controle de pragas', 'Certidão de responsável técnico (RT)',  'obrigatorio'),
      ('Controle de pragas', 'Plano / programa de controle de pragas','obrigatorio'),
      ('Controle de pragas', 'FISPQ',                                 'obrigatorio'),
      ('Controle de pragas', 'Licença ambiental',                     'condicional'),
      ('Controle de pragas', 'Comprovante de treinamento da equipe',  'condicional'),
      -- Transportadora
      ('Transportadora', 'Alvará de funcionamento',                   'obrigatorio'),
      ('Transportadora', 'CRLV dos veículos',                         'obrigatorio'),
      ('Transportadora', 'Certificado de higienização de veículo',    'obrigatorio'),
      ('Transportadora', 'Apólice de seguro de carga',                'obrigatorio'),
      ('Transportadora', 'Contrato de prestação de serviço',          'condicional'),
      -- Matéria-prima / produtor rural
      ('Matéria-prima / produtor rural', 'Laudo de análise do produto',            'obrigatorio'),
      ('Matéria-prima / produtor rural', 'Declaração de ausência de OGM',          'obrigatorio'),
      ('Matéria-prima / produtor rural', 'Declaração de atendimento à legislação', 'condicional'),
      ('Matéria-prima / produtor rural', 'FOR-POP — Avaliação de fornecedor',      'obrigatorio')
    ) as t(segmento, documento, exigencia)
  loop
    insert into qualidade.segmento_documentos (org_id, segmento_id, documento_exigido_id, exigencia)
    select v_org, s.id, d.id, v_par.exigencia
    from qualidade.segmentos_fornecedor s, qualidade.documentos_exigidos d
    where s.org_id = v_org and s.nome = v_par.segmento
      and d.org_id = v_org and d.nome = v_par.documento
    on conflict (segmento_id, documento_exigido_id) do nothing;
  end loop;
end $$;
