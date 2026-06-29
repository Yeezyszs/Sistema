# Módulo 05 — Mudanças, Documentação/Indicadores e Expedição

> Detalhamento técnico. Convenções e tipos (A/B/C/M) no [README](./README.md).

---

## 5.1 Gestão de Mudanças (PO17)

### MUD-01 — Formulário de Gestão de Mudanças (FOR PO17)
- **Função:** registrar e avaliar o **impacto de qualquer mudança** (instalação,
  equipamento, processo, função, fornecedor) na segurança de alimentos antes de
  executá-la. Requisito FSSC.
- **Campos:** tipo de mudança {Planejada, Inesperada} · descrição · **requer
  mudança em** {Documento, Equipamento, Processo, Sistemas, Outros} (multi) ·
  requer autorização da direção? {Sim/Não} · solicitante · data da solicitação ·
  responsável pela mudança · propósito · **potenciais riscos ao processo** ·
  **potenciais riscos à segurança de alimentos** · (aprovação, conclusão).
- **No sistema (B):** `qualidade.mudancas` (tipo, descricao, afeta jsonb,
  requer_autorizacao, solicitante_id, responsavel_id, proposito,
  risco_processo, risco_seguranca_alimentos, status {solicitada, aprovada,
  implementada, encerrada}, datas). Mudança que afeta PCC/PPR pode disparar
  revisão de APPCC e treinamento (PES-03).
- **Cópias:** ~15 instâncias (uma por mudança, ex.: "Instalação da porta",
  "Antecâmara Ensaque 3", "Detector de metais") → registros.

---

## 5.2 Controle Documental (PQSA02, PQSA03, POP07)

### DOC-01 — Lista Mestra de Documentos (FOR PQSA02 1.1)
- **Função:** inventário de **todos os documentos do SGSA** (internos e externos)
  com código, versão, local e backup. Base do controle de informação documentada.
- **Campos:** cód. do documento · nome · local de armazenamento · backup ·
  disponível em outro setor · data de criação/nova revisão · revisão · observações.
  Abas: documentos internos, externos, legislações externas.
- **No sistema (C):** `qualidade.documentos` (codigo, nome, tipo {interno,
  externo, legislacao}, local, backup, vigente) + `qualidade.documento_versoes`
  (documento_id, versao, criado_em, elaborado_por, aprovado_por, vigente). **Esta
  é a tabela transversal** que dá identidade/versão a todos os templates citados
  nos módulos 01–04 (PPHO, checklists, FORs). A "Lista Mestra" é a **tela de
  índice** dela.

### DOC-02 — Lista Mestra de Registros (FOR PQSA03 1.1)
- **Função:** define, para cada **registro** (evidência preenchida), os requisitos
  de **retenção/proteção/recuperação/descarte** (ISO 22000 7.5).
- **Campos:** origem do registro (POP01…) · nome do documento · identificação do
  registro · requisitos de armazenamento · de proteção · de recuperação · **tempo
  de retenção** (3–4 anos) · requisitos de descarte.
- **No sistema (A):** catálogo `qualidade.politica_registros` (registro_codigo,
  origem, retencao_meses, descarte, protecao). Define a **regra de retenção** das
  tabelas append-only (informa rotina de expurgo/arquivamento). Cruza com AUD-05
  (verificação de PPR) e DOC-04 (pendências).

### DOC-03 — Controle de Documentos / Matriz de Fornecedores (FOR-POP07 2.0)
- **Função:** ver módulo 02 (FOR-10). Abas extras de **análise de risco de
  perigos** (MP) e **base de documentações por categoria de fornecedor**.
- **No sistema:** já coberto em `qualidade.documentos_exigidos` e
  `qualidade.riscos_fornecimento` (módulo 02).

### DOC-04 — Controle de Pendências de Registros
- **Função:** apontar **registros não preenchidos/divergentes** por setor.
- **Campos:** setor · registro · divergência · data pendente.
- **No sistema:** **derivado** — view que cruza `politica_registros` (esperado) ×
  registros existentes (realizado) por período. Não é tabela de entrada manual; é
  o "radar de preenchimento". (Existe também um indicador de "preenchimento de
  registros".)

---

## 5.3 Indicadores, Política e APPCC (PLA-SGQ, PO04, PQSA04, POP04)

### IND-00 — Padrão de Indicador (estrutura comum)
Quase todo indicador da empresa tem a **mesma forma** (vista em PLA SGQ 01,
FOR-POP04 resíduos, satisfação, cultura, pragas):
- **Cabeçalho:** nome do indicador · área/responsável · frequência · objetivo ·
  método de apuração · período.
- **Série:** mês (ou ciclo) · **valor obtido** · **meta/limite tolerável** ·
  análise/avaliação · decisão tomada · **eficácia {Eficaz/Ineficaz/NA}** · status
  {Andamento, Encerrada, Em atraso}.
- **No sistema (A+B):** catálogo `qualidade.indicadores` (codigo, nome, area,
  frequencia, objetivo, metodo, meta) + registro `qualidade.indicador_medicoes`
  (indicador_id, periodo, valor, meta, analise, decisao, eficacia, status). **Uma
  estrutura serve a todos os indicadores abaixo** — não criar tabela por indicador.

### IND-01 — Indicadores da Política e Objetivos (PLA SGQ 01)
- **Função:** painel de KPIs ligados à política: cultura, alcance de treinamentos,
  taxa de engajamento, reclamação de cliente, satisfação de cliente, NC de
  recebimento, conformidade de produto, desvios por causa. (Uma aba por indicador.)
- **No sistema:** vários registros em `qualidade.indicadores` + medições. É o
  **dashboard de qualidade**.

### IND-02 — Indicador de Resíduos (FOR-POP04 1.2)
- **Função:** quantidade mensal de resíduo gerado (casquinha, resíduos, cinzas) ×
  meta. Liga ao indicador ambiental.
- **No sistema:** `indicador='residuos'` (3 séries: casquinha/resíduos/cinzas).

### IND-03 — Satisfação de Clientes (FOR PQSA04 1.2)
- **Função:** pesquisa **anual** de satisfação por cliente em critérios (cortesia,
  rapidez, flexibilidade, prazo, informações técnicas, qualidade dos produtos,
  atendimento a reclamações, documentação) — nota 1–5. Uma aba por cliente.
- **No sistema (B):** `qualidade.pesquisas_satisfacao` (cliente_id, ano, criterios
  jsonb, media). Alimenta IND-01 (satisfação de cliente).

### IND-04 — Contatos Regulatórios (FOR PO04 1.1)
- **Função:** **agenda de órgãos reguladores** (ANVISA, IPEM, CRQ, IAP, MAPA,
  Bombeiros…) e o responsável interno pelo recebimento.
- **Campos:** sigla · nome do órgão · endereço · cidade · telefone · setor/
  responsável da planta.
- **No sistema (A):** catálogo `qualidade.contatos_regulatorios` (sigla, orgao,
  contato, responsavel_id). Dado-mestre simples.

### IND-05 — Plano APPCC / Plano de Segurança de Alimentos (PLA SGQ01 - APPCC)
- **Função:** o **plano HACCP** completo: matriz de avaliação de risco, análise de
  perigos (superfícies de contato, MP/embalagem), árvore decisória FSSC,
  categorização, **monitoramento** e **verificação** dos PCCs/PPROs.
- **Campos — análise de perigos:** etapa/superfície · material · perigo
  (bio/físico/químico) · justificativa · nível aceitável · **severidade ×
  probabilidade → risco → classificação** · PPRs relacionados · medida de controle.
- **Campos — matriz de risco:** níveis de severidade (1–3) com exemplos
  (químicos/físicos/biológicos) e probabilidade → significância.
- **No sistema (A+B):** é a **fonte de verdade** do `qualidade.pontos_controle`
  (CCP/PRP/PRPO) que já existe. Modelar `qualidade.analise_perigos` (etapa_codigo,
  perigo, severidade, probabilidade, risco, medida_controle, ppr) +
  `qualidade.plano_appcc_versoes`. Os PCCs daqui **populam** `pontos_controle` e
  são o que o gate `liberar_lote` consulta. Reusa a tabela genérica
  `qualidade.analises_risco` (módulo 03) para a parte de avaliação.

---

## 5.4 Expedição e Especificações (PQSA06, PQSA07)

### EXP-01 — Laudo de Carregamento (NF - … - LOTE)
- **Função:** laudo emitido **por carregamento/NF** entregue ao cliente: produto,
  lote, quantidade, validade, shelf life, e resultados (físico-químicos e/ou
  verificação visual conforme o cliente). É a versão "para o cliente" do LAB-01.
- **Campos:** cliente · NF · endereço/contato do cliente · material/marca ·
  registro do cliente · lote · quantidade (kg) · data fab/validade · shelf life ·
  ensaios + resultados (mesma base do LAB-01/LAB-02).
- **No sistema (B):** `qualidade.laudos_carregamento` (lote_id, cliente_id, nf,
  emitido_em, shelf_life_dias) reusando os resultados do laudo interno (LAB-01).
  Geração de **PDF** com layout do cliente. **Cópias:** ~87 instâncias (1 por
  NF/carregamento) → registros. **Liga em expedição:** só emite laudo de lote
  liberado (`status='liberado'`).

### EXP-02 — Checklist de Expedição (FOR PQSA06 1.1)
- **Função:** inspeção do **veículo e do carregamento** a cada expedição
  (limpeza, vedação, último produto transportado, etc.).
- **Campos — cabeçalho:** data · horário · NF · cliente · produto · lote ·
  quantidade (kg) · placa · motorista · transportadora · último produto
  transportado.
- **Campos — itens:** seções (inspeção veicular…) · item · critério ·
  {Conforme/Não Conforme}.
- **No sistema (A+B):** catálogo `qualidade.checklist_itens`
  (`contexto='expedicao'`) + registro `qualidade.checklists_expedicao`
  (lote_id, cliente_id, nf, placa, motorista, transportadora_id) com filha de
  respostas. NC → bloqueia carregamento + NC-01.

### EXP-03 — Controle de Acesso de Visitantes (FOR PQSA07 1.1)
- **Função:** registrar **acessos** de visitantes/prestadores (food defense).
- **Campos:** data · nome · CPF · empresa (se externo) · cargo/função · **tipo de
  acesso** {Interno/Externo} · motivo · responsável pela autorização · assinatura.
- **No sistema (B):** `qualidade.acessos_visitantes` (data, nome, cpf, empresa,
  cargo, tipo, motivo, autorizado_por_id). Há também **questionário de visitantes**
  (saúde/origem) que entra como filha opcional.

### EXP-04 — Especificação de Produto por Cliente (Ficha Técnica)
- **Função:** **ficha técnica** do produto conforme exigência de cada cliente
  (parâmetros e limites que o produto deve atender). É a base de referência dos
  laudos (LAB-01) e do plano de análises (LAB-05).
- **Campos:** cliente · produto/material · marca · registro do cliente · lote
  (modelo) · quantidade · data fab/validade · shelf life · parâmetros e limites
  (umidade, granulometria, micro, etc. — variam por cliente/produto).
- **No sistema (A):** catálogo `qualidade.especificacoes` (produto_id, cliente_id,
  shelf_life_dias, versao) + filha `especificacao_parametros` (ensaio, limite_min/
  max, unidade, metodologia). **Esta é a fonte** que LAB-01/EXP-01 consultam para
  decidir Conforme/Não Conforme. **Cópias:** ~57 fichas (produto × cliente) →
  registros do catálogo, **não** 57 telas.

---

## Resumo de tabelas propostas (schema `qualidade`, salvo nota)

| Área | Catálogo (A) | Registro (B) / Doc (C) |
| --- | --- | --- |
| NC | — | `nao_conformidades` (+`nc_correcoes`,`nc_causa_raiz`), `acoes`/`planos_acao` |
| PPHO/Higiene | `pphos`, `parametros_agua`, `pontos_amostragem` | `higienizacoes`, `swabs_validacao`, `swabs_pessoais`, `analises_agua`, `higienizacao_ar` |
| Laboratório | `especificacoes_ensaio`, `laboratorios`, `plano_analises`, `tempo_contraprova` | `laudos_internos`(+`laudo_resultados`), `verificacoes_visuais`, `envios_laboratorio`(+`envio_resultados`), `contraprovas`, `controle_peso`, `estudos_shelflife` |
| Fornecedores | `questionarios`, `alergenicos`, `documentos_exigidos`, `riscos_fornecimento`, `checklist_itens` | `homologacoes`, `questionario_respostas`, `declaracoes`, `declaracoes_alergenicos`, `avaliacoes_fornecedor`, `visitas_fornecedor` |
| Recebimento | `planos_amostragem` | `inspecoes_recebimento`, `estoque_insumos_lab`, `renda_impureza` (ou estende `producao.recebimentos`) |
| Pessoas | `plano_treinamento`, `cultura_perguntas`, `cargos` | `treinamentos`(+`treinamento_participantes`), `avaliacoes_cultura`, `inspecoes_asseio` |
| Auditoria | `requisitos_norma`, `cronograma_auditorias` | `auditorias`(+`auditoria_itens`), `verificacoes_ppr`, `autoinspecoes` |
| Food Defense | — | `analises_risco` (food_defense/food_fraud/appcc), `checklists_food_defense`, `inspecoes_estruturais` |
| Ambiental | `zonas_ambientais`, `armadilhas` | `monitoramento_ambiental`, `monitoramento_ar` |
| PCC físico | `detectores_metais`, `imas` | `verificacoes_dm`, `verificacoes_ima`, `quebras_vidro` |
| Manutenção (`manutencao`) | `plano_preventivo`, `plano_lubrificacao`, `ferramentas` | `ordens_servico`, `execucoes_preventiva` |
| Calibração | `instrumentos` | `calibracoes`, `monitor_caldeira` |
| Mudanças | — | `mudancas` |
| Documental | `documentos`(C), `politica_registros` | `documento_versoes` |
| Indicadores | `indicadores`, `contatos_regulatorios` | `indicador_medicoes`, `pesquisas_satisfacao` |
| APPCC | `pontos_controle` (existe) | `analise_perigos`, `plano_appcc_versoes` |
| Expedição | `especificacoes`(+`especificacao_parametros`) | `laudos_carregamento`, `checklists_expedicao`, `acessos_visitantes` |

> **Tabelas “coringa” a priorizar** (cortam ~30% da duplicação): `checklist_itens`
> (catálogo de itens por `contexto`) + um registro genérico de execução de
> checklist; `analises_risco` (food defense/fraud/appcc); `indicadores` +
> `indicador_medicoes`; `documentos` + `documento_versoes` (versão de todo
> template). Modelar essas quatro primeiro reduz muito o trabalho dos módulos.
