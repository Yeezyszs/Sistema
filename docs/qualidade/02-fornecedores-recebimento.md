# Módulo 02 — Fornecedores e Recebimento

> Detalhamento técnico. Convenções e tipos (A/B/C/M) no [README](./README.md).
> Reusar sempre `core.fornecedores`, `core.produtos`, `producao.lotes`.

---

## 2.1 Qualificação / Homologação de Fornecedores (POP07 / POP09)

> Visão de domínio: um **fornecedor** passa por **homologação** (conjunto de
> questionários + visita + documentos) e depois por **avaliações de desempenho**
> periódicas. Tudo abaixo gira em torno de `core.fornecedores` (que já tem
> `homologado boolean`, `tipo`). Sugestão central:
> `qualidade.homologacoes` (fornecedor_id, status, validade) +
> `qualidade.questionarios` (catálogo de modelos) +
> `qualidade.questionario_respostas` (preenchidos).

### FOR-01 — Questionário de Autoavaliação do Fornecedor (FQ-178 / Supplier Survey)
- **Função:** o **próprio fornecedor** se autoavalia em SGQ, segurança de
  alimentos, controle de pragas, legislação, certificações. Gera **nota e
  classificação**. (Quando o fornecedor tem certificação GFSI — FSSC/BRC/IFS/SQF
  — dispensa o questionário e basta o certificado.)
- **Campos — cabeçalho:** detalhes do fornecedor (razão social, CNPJ, nº
  colaboradores, ano fundação, telefone, endereço, responsável da qualidade,
  responsável pelo preenchimento, data) · detalhes do produto (nome, denominação
  de venda).
- **Campos — blocos de perguntas:** Auditoria de homologação · Certificações
  (ISO 9001/14001…) · Legislações · SGQ · Segurança de alimentos · Controle de
  pragas · etc. Cada item: {Sim, Não, NA} + comentário + **peso/nota**.
- **Campos — resumo (aba):** índice da qualidade do fornecedor (nota → A/B/C/D →
  **Qualificado/Desqualificado**: >90 A; 80–90 B; 70–80 C; <70 D).
- **No sistema:** modelo de questionário **versionado** (catálogo A) +
  respostas (B) com cálculo de score → atualiza `qualidade.homologacoes.status`.

### FOR-02 — Avaliação de Fornecedores de Insumos (FOR-COP-001) + anexos
- **Função:** questionário de qualificação para **insumos** (não-MP), com 3 abas:
  Questionário, **Alergênicos** (F-2), **OGM** (F-3). Inclui lista de documentos
  obrigatórios (alvará, licença sanitária/ambiental, vistoria bombeiros) e status
  por item {Implementado total/parcial/não/NA}.
- **No sistema:** mesma estrutura de questionário versionado; os anexos
  Alergênicos/OGM são FOR-03/FOR-05 abaixo (reaproveitar).

### FOR-03 — Declaração de Alergênicos (FOR-COP-002 / Questionário de alergênicos)
- **Função:** declarar, por produto, presença de cada alergênico (RDC 26/2015):
  presente no produto · na mesma planta/linha · risco de contaminação cruzada.
- **Campos:** produto · lista fixa de ~17 alergênicos (trigo, crustáceos, ovos,
  peixes, amendoim, soja, leite, castanhas…) cada um com {Sim/Não} em 3 colunas +
  "se sim, quais".
- **No sistema (A+B):** catálogo `qualidade.alergenicos` (lista RDC 26) +
  `qualidade.declaracoes_alergenicos` (fornecedor_id/produto_id, alergenico,
  presente, mesma_linha, risco_cruzado). **Reutilizável** para o próprio rótulo.

### FOR-04 — Declaração OGM (FOR-COP-003)
- **Função:** declarar se o produto é/contém **organismos geneticamente
  modificados** (Decreto 4680/2003).
- **Campos:** empresa · endereço · CNPJ · produto · {é/não é OGM} · gene doador ·
  local · data · assinatura responsável técnico.
- **No sistema (B):** `qualidade.declaracoes` com `tipo='ogm'` (ver FOR-08, tabela
  genérica de declarações de fornecedor).

### FOR-05 — Qualificação Halal (FOR-COP-007)
- **Função:** declarar contato com substâncias não-halal e risco de contaminação
  cruzada.
- **Campos:** substância · está contido {Sim/Não} · possibilidade de resíduo/
  contaminação cruzada {Sim/Não} · esclarecimentos.
- **No sistema:** `qualidade.declaracoes` `tipo='halal'`.

### FOR-06 — Perigos Radiológicos (FOR-COP-023)
- **Função:** questionário de perigos radiológicos do fornecedor (declaração).
- **No sistema:** `qualidade.declaracoes` `tipo='radiologico'`.

> **FOR-04/05/06 (e Glúten, Pesticidas)** seguem o mesmo formato "declaração
> assinada por produto". Modelar **uma** tabela `qualidade.declaracoes`
> (fornecedor_id, produto_id?, tipo enum {ogm, halal, radiologico, gluten,
> pesticidas, alergenicos}, conteudo jsonb, declarado_em, valido_ate, anexo_url).

### FOR-07 — Avaliação de Desempenho de Fornecedor (FOR POP07 1.2)
- **Função:** avaliar **periodicamente (semestral)** cada fornecedor de MP/produto
  por critérios ponderados. Uma aba por fornecedor.
- **Campos:** fornecedor · responsável pela avaliação · período · critérios:
  **Cotação** {Bom/Praticável/Ruim → 1/2/3} · **Prazo de entrega** {no prazo / 2
  dias / >2 dias} · **Atendimento** {Bom/Moderado/Ruim} · **Nº de não
  conformidades** {≤3 / 3–7 / >7} → pontuação → resultado {Aceitável/…}.
- **No sistema (B):** `qualidade.avaliacoes_fornecedor` (fornecedor_id, periodo,
  criterios jsonb, pontuacao, classificacao, avaliador_id). Cruza com NC-01 para
  contar não conformidades automaticamente.

### FOR-08 — Pré-qualificação / Visita Técnica (POP09 Check List)
- **Função:** **homologação por visita** ao fornecedor — checklist extenso
  (itens legais, edificações, equipamentos, manipulação, fluxo, SGQ,
  almoxarifado, meio ambiente/segurança) com nota e relatório final
  {Aprovado/Em análise/Reprovado}.
- **Campos:** capa (razão social, contato, CNPJ, produtos, RT) · checklist
  (item · {S/N/NA} · observações/NC) · relatório (data, auditores, nota,
  resultado, necessidade de reavaliação no ano).
- **No sistema (A+B):** catálogo de itens `qualidade.checklist_itens`
  (`contexto='prequalif_fornecedor'`) + registro
  `qualidade.visitas_fornecedor` (fornecedor_id, data, nota, resultado) com filha
  de respostas. Resultado "Aprovado" → `core.fornecedores.homologado = true`.

### FOR-09 — Checklist de Boas Práticas Agrícolas (FOR POP07 1.8)
- **Função:** homologação de **produtor rural** (mandioca): área de plantio,
  variedade, defensivos, etc.
- **Campos:** nome/razão social · CPF/IE/CNPJ/CGC-MAPA · endereço/coordenadas ·
  produto vegetal · variedade · itens avaliados {Sim/Não/Não aplica}.
- **No sistema:** mesma `qualidade.visitas_fornecedor` com
  `contexto='bpa'` e `core.fornecedores.tipo='produtor_rural'`.

### FOR-10 — Matriz de Fornecedores + Base de Documentações (FOR-POP 7 2.0)
- **Função:** (1) **Matriz**: lista de fornecedores por tipo (produtos, serviços,
  equipamentos, transportes) com status {Homologado…}. (2) **Análise de risco**
  do fornecedor/MP (severidade × probabilidade → significativo/não). (3) **Base
  de documentações**: quais documentos cada categoria de fornecedor deve enviar
  antes da 1ª compra.
- **No sistema:**
  - Matriz = **listagem** de `core.fornecedores` (tipo + homologado). Não recriar.
  - Análise de risco = catálogo `qualidade.riscos_fornecimento`.
  - Base de documentações = catálogo `qualidade.documentos_exigidos`
    (categoria_fornecedor, documento, obrigatorio) + checklist de entrega por
    fornecedor.

---

## 2.2 Recebimento de MP / Insumos / Embalagens (POP08, POP09)

### REC-01 — Checklist de Inspeção de Matéria-Prima (FOR POP09 1.5)
- **Função:** inspeção da **carga de mandioca** no recebimento (antes da pesagem/
  descarga).
- **Frequência:** a cada recebimento. **Liga em:** `producao.recebimentos` (já
  existe!) e `core.fornecedores` (produtor).
- **Campos — cabeçalho:** data · placa do veículo · nome do produtor · variedade
  da raiz · horário de inspeção · ticket nº.
- **Campos — itens (1..n):** item avaliado (carga coberta; corpo estranho;
  impurezas visíveis; mandioca podre/fermentada; …) · {Conforme / Não Conforme /
  N/A} · observações.
- **No sistema (A+B):** catálogo `qualidade.checklist_itens`
  (`contexto='inspecao_mp'`) + registro `qualidade.inspecoes_recebimento`
  (recebimento_id→`producao.recebimentos`, produtor_id, variedade, ticket, placa)
  com filha de respostas. NC gera NC-01.

### REC-02 — Checklist de Recebimento de Pallets (FOR POP09 1.4)
- **Função:** inspeção de **pallets** recebidos, com **plano de amostragem** por
  quantidade.
- **Campos:** data · NF · transportadora · placa · fornecedor · plano de
  amostragem (até 50 → todos; 51–200 → 20; >200 → 40) · itens de avaliação ·
  ação em caso de desvio (ampliar e segregar).
- **No sistema:** `qualidade.inspecoes_recebimento` `tipo='pallets'`. O plano de
  amostragem é regra de cálculo (catálogo `qualidade.planos_amostragem`).

### REC-03 — Controle de Embalagens (FOR-POP09 1.1)
- **Função:** recebimento e inspeção de **embalagens** (bags, sacaria) com plano
  de amostragem AQL.
- **Campos:** data de recebimento · NF · fornecedor · qtd recebida · tipo de
  embalagem · lote · plano de amostragem (faixas: até 25→3 amostras; 26–90→5;
  91–280→8; 281–1200→13; 1201–10000→20; reprovar a partir de 1–2).
- **No sistema:** `qualidade.inspecoes_recebimento` `tipo='embalagem'`,
  reusando `qualidade.planos_amostragem`.

### REC-04 — Controle de Estoque de Insumos do Laboratório (FOR POP09 1.3)
- **Função:** controle de **estoque dos insumos do laboratório** e necessidade de
  compra.
- **Campos:** insumo · tipo de insumo · especificação · quantidade necessária ·
  quantidade em estoque · **precisa solicitar compra? {Sim/Não}** · foi
  solicitado? · observação.
- **No sistema (B):** `qualidade.estoque_insumos_lab` (insumo, especificacao,
  qtd_minima, qtd_estoque, solicitar_compra calculado, solicitado). Pode evoluir
  para o módulo de estoque (`producao.movimentos_estoque`) no futuro.

### REC-05 — Controle de Renda e Impurezas (FOR-POP08 1.8)
- **Função:** medir, no recebimento, a **renda** (rendimento amido/farinha da
  raiz) e **impurezas** por produtor/variedade. Determina pagamento e qualidade.
- **Campos:** data · hora · produtor · variedade · renda 1..5 · total · impureza
  · ticket.
- **No sistema (B):** `producao.recebimentos` **já tem `renda` e `rosca`**
  (migration 0008) — estender ali com `impureza` + filha
  `recebimento_rendas` (5 leituras) **ou** tabela `qualidade.renda_impureza`
  (recebimento_id, leituras jsonb, total, impureza). Reusar o recebimento, não
  duplicar produtor/variedade.
