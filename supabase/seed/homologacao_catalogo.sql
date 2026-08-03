-- ============================================================================
-- Catálogo de homologação de fornecedores — dados reais da Sumaré.
-- Fonte: FOR-POP 7 2.0 (Controle de documentos), transposto do sistema de
-- Homologação que este módulo absorve.
--
-- Ponto de partida editável: a Qualidade refina depois pela aba Catálogo.
-- Idempotente — pode rodar de novo sem duplicar.
-- ============================================================================
do $$
declare
  v_org uuid;
begin
  select id into v_org from core.organizacoes order by created_at limit 1;
  if v_org is null then
    raise exception 'Nenhuma organização cadastrada.';
  end if;

  -- ── Tipos de documento (33) ──────────────────────────────────────────────
  -- tem_validade liga o monitoramento de vencimento.
  -- permite_multiplos: fichas técnicas, laudos e certificações convivem.
  -- origem 'interno' = formulário nosso, não é o fornecedor que envia.
  insert into qualidade.documentos_exigidos (org_id, nome, tem_validade, origem, permite_multiplos) values
    (v_org, 'Alvará de funcionamento',                                     true,  'fornecedor', false),
    (v_org, 'Licença sanitária',                                           true,  'fornecedor', false),
    (v_org, 'Licença ambiental / de operação',                             true,  'fornecedor', false),
    (v_org, 'AVCB / Certificado do Corpo de Bombeiros',                    true,  'fornecedor', false),
    (v_org, 'Responsável técnico (CRQ/CRBio)',                             false, 'fornecedor', false),
    (v_org, 'Ficha técnica do produto/serviço',                            false, 'fornecedor', true),
    (v_org, 'FISPQ / Ficha de segurança (FDS)',                            false, 'fornecedor', false),
    (v_org, 'Declaração food grade / NSF',                                 false, 'fornecedor', false),
    (v_org, 'Plano/relatórios ou certificado de controle de pragas',       true,  'fornecedor', false),
    (v_org, 'Acreditação ISO/IEC 17025 + escopo',                          true,  'fornecedor', false),
    (v_org, 'Certificações vigentes (ISO/FSSC/BPF/NSF)',                   true,  'fornecedor', true),
    (v_org, 'Laudo de análise / relatório técnico',                        true,  'fornecedor', true),
    (v_org, 'Laudo de migração (embalagens)',                              true,  'fornecedor', true),
    (v_org, 'Certificado de calibração RBC/Inmetro',                       true,  'fornecedor', false),
    (v_org, 'Certificado de material (inox/plástico)',                     false, 'fornecedor', false),
    (v_org, 'Declaração de ausência de OGM, alérgenos e radiação',         false, 'fornecedor', false),
    (v_org, 'Declaração de atendimento à legislação (RDC/IN/MAPA/ANVISA)', false, 'fornecedor', false),
    (v_org, 'Proposta comercial',                                          false, 'fornecedor', false),
    (v_org, 'Questionário de avaliação (FOR POP07 1.5)',                   false, 'interno',    false),
    (v_org, 'Carta de Garantia do Fornecedor (FOR-POP 7 2.2)',             false, 'interno',    false),
    (v_org, 'Carta compromisso com produtor rural (FOR POP 7 1.9)',        false, 'interno',    false),
    (v_org, 'Checklist de Boas Práticas Agrícolas (FOR POP 7 1.8)',        false, 'interno',    false),
    (v_org, 'Questionário de Avaliação de Produtores (FOR POP07 1.1)',     false, 'interno',    false),
    (v_org, 'Diploma de formação (responsável técnico)',                   false, 'fornecedor', false),
    (v_org, 'Currículo do nutricionista responsável',                      false, 'fornecedor', false),
    (v_org, 'Licença específica para preparo/transporte de alimentos',     true,  'fornecedor', false),
    (v_org, 'Termo de Compromisso (transportadora)',                       false, 'interno',    false),
    (v_org, 'Declaração da Transportadora',                                false, 'fornecedor', false),
    (v_org, 'Certificado de regularidade IBAMA',                           true,  'fornecedor', false),
    (v_org, 'ATTIPP — Transporte de produtos perigosos',                   true,  'fornecedor', false),
    (v_org, 'ART — Anotação de Responsabilidade Técnica',                  true,  'fornecedor', false),
    (v_org, 'Certificado de destinação de resíduos',                       true,  'fornecedor', false),
    (v_org, 'MTR — Manifesto de Transporte de Resíduos',                   true,  'fornecedor', false)
  on conflict (org_id, nome) do nothing;

  -- ── Segmentos (20) ───────────────────────────────────────────────────────
  insert into qualidade.segmentos_fornecedor (org_id, nome, categoria) values
    (v_org, 'Laboratório de análises',                             'servico'),
    (v_org, 'Controle de pragas',                                  'servico'),
    (v_org, 'Serviços ambientais',                                 'servico'),
    (v_org, 'Limpeza de caixa d''água',                            'servico'),
    (v_org, 'Consultoria em segurança de alimentos',               'servico'),
    (v_org, 'Refeição coletiva',                                   'servico'),
    (v_org, 'Higienização e manutenção de big bags',               'servico'),
    (v_org, 'Coleta e destinação de resíduos',                     'servico'),
    (v_org, 'Calibração',                                          'servico'),
    (v_org, 'Matéria-prima/produtor rural',                        'produto'),
    (v_org, 'Produto químico para caldeira',                       'produto'),
    (v_org, 'Produto químico para tratamento de água potável',     'produto'),
    (v_org, 'Produto químico para higienização de equipamentos',   'produto'),
    (v_org, 'Lubrificantes/óleo/graxa',                            'produto'),
    (v_org, 'Embalagens primárias (bag e sacaria)',                'produto'),
    (v_org, 'Filme stretch/sacos plásticos',                       'produto'),
    (v_org, 'EPIs',                                                'produto'),
    (v_org, 'Equipamentos',                                        'equipamento'),
    (v_org, 'Material de manutenção (peças)',                      'equipamento'),
    (v_org, 'Transportadora',                                      'transporte')
  on conflict (org_id, nome) do nothing;

  -- ── Checklists de exemplo ────────────────────────────────────────────────
  insert into qualidade.segmento_documentos (org_id, segmento_id, documento_exigido_id, exigencia)
  select v_org, s.id, d.id, v.exigencia
  from (values
    -- Calibração
    ('Calibração', 'Alvará de funcionamento',                                     'obrigatorio'),
    ('Calibração', 'Licença ambiental / de operação',                             'obrigatorio'),
    ('Calibração', 'Acreditação ISO/IEC 17025 + escopo',                          'obrigatorio'),
    ('Calibração', 'AVCB / Certificado do Corpo de Bombeiros',                    'obrigatorio'),
    ('Calibração', 'Certificado de calibração RBC/Inmetro',                       'condicional'),
    ('Calibração', 'Certificações vigentes (ISO/FSSC/BPF/NSF)',                   'condicional'),
    -- Controle de pragas
    ('Controle de pragas', 'Alvará de funcionamento',                             'obrigatorio'),
    ('Controle de pragas', 'Licença sanitária',                                   'obrigatorio'),
    ('Controle de pragas', 'Licença ambiental / de operação',                     'obrigatorio'),
    ('Controle de pragas', 'Ficha técnica do produto/serviço',                    'obrigatorio'),
    ('Controle de pragas', 'Declaração de ausência de OGM, alérgenos e radiação', 'obrigatorio'),
    ('Controle de pragas', 'Laudo de análise / relatório técnico',                'obrigatorio'),
    ('Controle de pragas', 'Questionário de avaliação (FOR POP07 1.5)',           'obrigatorio'),
    ('Controle de pragas', 'Declaração de atendimento à legislação (RDC/IN/MAPA/ANVISA)', 'obrigatorio'),
    ('Controle de pragas', 'AVCB / Certificado do Corpo de Bombeiros',            'obrigatorio'),
    ('Controle de pragas', 'Certificações vigentes (ISO/FSSC/BPF/NSF)',           'condicional'),
    -- Transportadora
    ('Transportadora', 'Alvará de funcionamento',                                 'obrigatorio'),
    ('Transportadora', 'Licença sanitária',                                       'obrigatorio'),
    ('Transportadora', 'AVCB / Certificado do Corpo de Bombeiros',                'obrigatorio'),
    ('Transportadora', 'Termo de Compromisso (transportadora)',                   'obrigatorio'),
    ('Transportadora', 'Declaração da Transportadora',                            'obrigatorio'),
    -- Matéria-prima / produtor rural
    ('Matéria-prima/produtor rural', 'Carta compromisso com produtor rural (FOR POP 7 1.9)',    'obrigatorio'),
    ('Matéria-prima/produtor rural', 'Checklist de Boas Práticas Agrícolas (FOR POP 7 1.8)',    'obrigatorio'),
    ('Matéria-prima/produtor rural', 'Questionário de Avaliação de Produtores (FOR POP07 1.1)', 'obrigatorio')
  ) as v(segmento, documento, exigencia)
  join qualidade.segmentos_fornecedor s on s.org_id = v_org and s.nome = v.segmento
  join qualidade.documentos_exigidos  d on d.org_id = v_org and d.nome = v.documento
  on conflict (segmento_id, documento_exigido_id) do nothing;
end $$;
