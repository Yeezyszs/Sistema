# Módulo 01 — Não Conformidades, PPHO/Higienização e Laboratório

> Detalhamento técnico dos modelos. Convenções, dados-mestre e tipos (A/B/C/M) no
> [README](./README.md) §3–§4. Campos marcam **(obrig.)** quando o registro não
> faz sentido sem eles. "No sistema" = proposta de tabela + tela.

---

## 1.1 Não Conformidades & Ações

### NC-01 — Relatório de Não Conformidade / Gestão de Ações (FOR PO12 1.1 · FOR-SGQ08.06)
- **Função:** registrar um desvio (NC), investigar causa-raiz, definir correção e
  ação corretiva, e avaliar eficácia. É o **coração do SGSA**.
- **Origem:** PO12 (Gestão de não conformidades). Modelos: `FOR PO12 1.1` e o
  legado `FOR-SGQ08.06`. Abas: `Cont Doc` (versão), `formulario de ação`,
  `liberação e disposição`.
- **Frequência:** por evento. **Quem preenche:** emitente (qualquer setor).
  **Quem valida/avalia eficácia:** SGQ/Gerente de Qualidade; aprovação Diretoria.
- **Campos — identificação:** emitente (obrig.) · **RNC nº** (sequencial, obrig.)
  · data (obrig.) · **origem** {Ocorrência interna, Fornecedor, SAC, Auditoria
  interna, Auditoria externa, Cliente, Análise de risco, Desvio PCC/medida de
  controle decisiva, Outras} · reincidência {sim/não} + nº RNC reincidente · se
  auditoria: norma/requisito · cliente externo · nº NC do cliente · fornecedor
  externo.
- **Campos — detalhamento:** descrição (obrig.) · "ação encaminhada para / data".
- **Campos — correções imediatas (1..n):** correção · data implementação ·
  responsável · status/acompanhamento. + envolvidos na decisão · quem aprova ·
  quem acompanha · avaliação da eficácia {Eficaz/Ineficaz} · prazo p/ avaliação.
- **Campos — causa-raiz (checklist 5 porquês / 6M):** desvios em
  processo/método · material · mão de obra · (máquina/medição/meio) — cada um
  {sim/não} + "quais".
- **Campos — disposição (aba liberação):** decisão sobre o produto
  {liberar, retrabalhar/torrar, segregar, devolver ao fornecedor, descartar} +
  quantidade não conforme (kg) + lote(s) afetado(s).
- **Estados:** `aberta → em_andamento → concluída` (+ `eficácia_pendente`).
- **Relaciona com:** `producao.lotes` (lote afetado), `core.fornecedores`
  (origem fornecedor), `core` clientes, `core.funcionarios` (emitente/responsável),
  e **PCC** (`qualidade.pontos_controle`) quando origem = desvio de PCC.
- **No sistema (B):** `qualidade.nao_conformidades` (id, org_id, numero serial
  por org, origem, reincidencia_de, lote_id?, fornecedor_id?, cliente_id?,
  descricao, qtd_nao_conforme_kg?, disposicao, status, eficacia, datas, created_by)
  + filhas `nc_correcoes` e `nc_causa_raiz`. **Tela:** lista filtrável + ficha com
  abas (Identificação / Correções / Causa-raiz / Disposição / Eficácia).
  **Integra o gate:** `liberar_lote` deve barrar lote com NC aberta ligada a ele
  (estender a função atual, que hoje só checa `monitoramentos.conforme=false`).
- **Cópias:** ~103 arquivos "FOR PO12 …" + 39 "Notificação de Ocorrência" são
  **instâncias deste modelo** (ver NC-02).

### NC-02 — Notificação de Ocorrência (N.O / NO Externa)
- **Função:** variante "leve" da NC voltada a **ocorrências com fornecedor/cliente**
  (ex.: bag rasgado, fragmento metálico, mandioca podre, bag molhado). Numeração
  própria (`NO Externa 650`, `N.O 02`).
- **Campos:** item nº · matéria-prima/produto · cliente · unidade · data da
  ocorrência · data de produção · NF · data de recebimento · qtd entregue · qtd
  não conforme · lote (próprio e do cliente) · descrição do material NC ·
  descrição da não conformidade (texto livre) · evidências (fotos).
- **No sistema:** **mesma tabela** `qualidade.nao_conformidades` com
  `tipo = 'notificacao_ocorrencia'` e `origem in (fornecedor, cliente)`. Não criar
  entidade separada. **Cópias:** ~39 instâncias.

### NC-03 — Controle/Registro de RNCs (FOR PO 12 1.5)
- **Função:** índice/planilha que lista todas as RNCs e seu andamento.
- **No sistema:** **não é tabela nova** — é a *própria listagem* de
  `qualidade.nao_conformidades` (view/tela de lista com KPIs: abertas, em atraso,
  reincidências, % eficácia).

### NC-04 — Plano de Ação (genérico)
- **Função:** quando a ação não vem de uma NC formal (melhoria, auditoria).
  Mesma estrutura de "gestão de ações" do FOR-SGQ08.06.
- **No sistema:** tabela `qualidade.planos_acao` (5W2H: o quê, por quê, quem,
  quando, onde, como, quanto) **ou** reutilizar `nc_correcoes` desacoplada. Recomendo
  uma `qualidade.acoes` central (origem polimórfica: nc | auditoria | indicador |
  reuniao) para não espalhar planos de ação por vários módulos.

---

## 1.2 PPHO & Higienização (POP01, POP02, POP03)

### HIG-01 — Ficha PPHO por equipamento (PPHO-EXT/SEC/ENS-NNN)
- **Função:** procedimento padrão de higienização **de cada equipamento/área**:
  o que limpar, com qual químico, concentração, EPIs, segurança e fluxograma.
- **Frequência:** a ficha define a frequência da limpeza (ex.: SEMANAL). É
  **documento (template)**, não registro de execução.
- **Campos:** código PPHO (obrig.) · equipamento/área (obrig.) · setor
  {Extração, Secagem, Ensaque, Armazém, Caldeira, Laboratório…} · frequência ·
  **produtos químicos** (nome · tipo {alcalino clorado…} · concentração ·
  aplicação) · referência FDS/ficha técnica · materiais e utensílios · EPIs ·
  segurança no processo (4 categorias) · procedimento/fluxograma de etapas ·
  observações · elaborado/aprovado por+data.
- **No sistema (A + B):**
  - Catálogo `qualidade.pphos` (codigo, equipamento_id→`core.equipamentos`,
    setor_id, frequencia, quimicos jsonb, epis jsonb, etapas jsonb, versao,
    aprovado_por/em).
  - Registro de execução `qualidade.higienizacoes` (ppho_codigo, data, turno,
    responsavel_id, validado_por, conforme, observacao) — alimentado pelos
    checklists CHK-EXT-POP01-NNN.
- **Cópias:** ~48 fichas (uma por equipamento) → **registros do catálogo**, não
  telas. Há ~14 PPHO-EXT, ~14 PPHO-SEC e várias PPHO por área.

### HIG-02 — Validação de Limpeza (PLAN POP 01)
- **Função:** comprovar a eficácia da higienização por **análise microbiológica
  de swabs** em pontos definidos. Duas abas: **Cronograma** (plano de pontos) e
  **Avaliação de Resultados**.
- **Frequência:** semestral (por ponto).
- **Campos — cronograma (A):** microrganismo avaliado {Enterobacteriaceae,
  E. coli, Salmonella} · área de amostragem · ponto de coleta (nº) · método de
  limpeza {úmida, úmida controlada, seca} · classificação de zona (1/2/3) ·
  descrição do ponto · frequência · momento ideal (após limpeza) · data de envio
  (colunas mês a mês).
- **Campos — resultados (B):** mês/hora/responsável da coleta · local · tipo de
  análise · ensaio · resultado · limite · **status {Conforme/Não Conforme}** ·
  responsável. Regra: fora do limite → registrar NC + nova coleta + ação corretiva.
- **No sistema:** `qualidade.pontos_amostragem` (catálogo) +
  `qualidade.swabs_validacao` (registro). Liga em NC-01 quando NC.

### HIG-03 — Resultados SWAB mãos e uniformes (FOR-POP03 1.2)
- **Função:** higiene pessoal — swab de **mãos e uniformes** dos colaboradores.
- **Frequência:** trimestral.
- **Campos:** data · patógeno {Mesófilos, Coliformes totais} · colaborador (cód)
  · local da coleta {mãos, uniformes} · resultado coliformes (limite <3 NMP/Swab)
  · resultado mesófilos (limite ≤5×10³ UFC/cm²) · **resultado {Aprovado/Reprovado}**.
- **No sistema (B):** `qualidade.swabs_pessoais` (colaborador_id→`core.funcionarios`,
  data, tipo {maos|uniforme}, ensaio, resultado, limite, aprovado). Tela: registro
  trimestral + histórico por colaborador.

### HIG-04 — Resultados da Água Potável (FOR-POP02 1.1)
- **Função:** monitorar potabilidade (Portaria GM/MS 888/2021). Duas abas:
  **Mensal** (micro + FQ) e **Semestral/P888** (lista extensa de parâmetros
  químicos: agrotóxicos, metais, etc.).
- **Frequência:** mensal e semestral.
- **Campos:** mês/hora/responsável da coleta · local {Extração, Saída de
  tratamento…} · tipo {Micro, FQ} · ensaio {Coliformes totais, E. coli, pH,
  Cloro, Cor, Turbidez, + ~50 químicos no semestral} · resultado · limite (por
  ensaio) · **status {Conforme/Não Conforme}** · responsável.
- **No sistema (A+B):** catálogo `qualidade.parametros_agua` (ensaio, limite,
  unidade, frequencia, referencia_legal) + registro `qualidade.analises_agua`
  (data, local, parametro, resultado, conforme). Reutilizável p/ qualquer matriz.

### HIG-05 — Cloro Residual & pH (FOR-POP02 1.2)
- **Função:** controle **diário** do cloro livre (0,2–5,0 ppm) e pH (6,0–8,0) da
  água de processo.
- **Campos:** mês · data · hora · ponto de coleta · cloro residual (ppm) · pH ·
  aspecto (límpida/alterada) · **status** · responsável · validação da Qualidade.
- **No sistema (B):** mesma `qualidade.analises_agua` com `tipo='cloro_ph'`, ou
  tabela enxuta `qualidade.cloro_ph_diario`. Liga em PRP-01 (`pontos_controle`).

### HIG-06 — Higienização de Exaustores e Climatizadores (FOR PQSA10 1.0)
- **Função:** controle trimestral da limpeza de exaustores/climatizadores por
  setor.
- **Campos:** mês · setor · equipamento {Climatizador/Exaustor NN} · data da
  higienização · próxima data · colaborador responsável · validação do encarregado.
- **No sistema (B):** `qualidade.higienizacao_ar` (equipamento_id, data,
  proxima_data, responsavel_id, validado_por). Gera alerta na "próxima data".

---

## 1.3 Laboratório & Laudos

### LAB-01 — Laudo Interno Físico-Químico (modelo)
- **Função:** laudo emitido pelo **laboratório interno por lote**: umidade e
  granulometria (peneiras), com valores de referência por tipo de farinha.
- **Frequência:** por lote. **Quem preenche:** laboratorista.
- **Campos — cabeçalho:** empresa/contato/endereço (fixos) · **produto** (obrig.)
  · **lote** (obrig.) · quantidade (kg) · data fabricação · data validade ·
  shelf life.
- **Campos — ensaios (linhas):** ensaio (Teor de umidade; Granulometria peneira
  10/18/200) · resultado · unidade · **valor de referência** (ex.: umidade máx
  5,0%; peneira 10 vazar 100%; peneira 18 reter máx 10%; peneira 200 vazar máx
  3,0%) · referência de metodologia (IN MAPA 52/2011).
- **No sistema (A+B):** catálogo `qualidade.especificacoes_ensaio` (produto_id,
  ensaio, limite_min/max, unidade, metodologia) + registro
  `qualidade.laudos_internos` (lote_id, produto_id, emitido_em, laudo_numero) com
  filhas `laudo_resultados` (ensaio, resultado, conforme calculado vs limite).
  **Liga no gate:** laudo com qualquer ensaio fora de referência → lote não libera.
- **Cópias:** ~23 instâncias (1 por lote). Numeração sequencial → ver LAB-07.

### LAB-02 — Relatório de Verificação Visual
- **Função:** triagem visual por **peneiramento manual** procurando pragas/
  sujidades (insetos, fragmentos, ovos/fezes) — exigência de cliente (Codex
  CAC/RCP 1-1969).
- **Campos:** cliente · NF · produto/marca · lote · quantidade · data fab/val ·
  descrição da amostragem (ex.: 200 g/big bag) · ensaio {Insetos inteiros,
  Fragmentos de insetos, Ovos/fezes} · resultado {Ausente, Não identificado} ·
  referência {Ausência} · metodologia.
- **No sistema (B):** `qualidade.verificacoes_visuais` (lote_id, cliente_id, nf,
  itens jsonb resultado/limite). **Cópias:** ~6 instâncias.

### LAB-03 — Controle de Envio de Análises por Lote (CLASP/LANALI/ALAX/NQAC)
- **Função:** rastrear **amostras enviadas a laboratório externo, lote a lote**.
  Há uma planilha por laboratório/cliente.
- **Campos:** data de envio · lote da amostra · produto · cliente · unidade do
  cliente · **motivo da análise** {Requisito de cliente, monitoramento, …} · tipo
  de análise {Físico-Química, Microbiológica, …} · **status {Aprovado, Reprovado,
  Aguardando liberação}** · responsável pelo envio · observações (motivo de
  reprovação, reenvio).
- **No sistema (B):** `qualidade.envios_laboratorio` (lote_id, laboratorio,
  cliente_id, motivo, tipo_analise, enviado_em, status, responsavel_id, obs). O
  **laboratório** vira catálogo `qualidade.laboratorios` (CLASP, LANALI, ALAX,
  NQAC, Hidrolife…). **Cópias:** várias planilhas (uma por lab) → 1 tabela
  filtrável por `laboratorio`.

### LAB-04 — Análises Periódicas (Mensal/Anual) por cliente
- **Função:** consolida resultados de **análises periódicas exigidas por
  contrato** (mensal/semestral/anual): cinzas, amido, fibra, Bacillus cereus,
  E. coli, Salmonella, metais pesados, agrotóxicos (MRA), ácaros.
- **Campos:** data/horário de envio · lote · produto · cliente · laboratório ·
  motivo {mensal/anual} · tipo {FQ, Micro, Microscopia, Metais} · **ensaio** ·
  **limite** · **resultado** · status · responsável · observação (mês).
- **No sistema (B):** **mesma** `qualidade.envios_laboratorio` + filha
  `envio_resultados` (ensaio, limite, resultado, conforme). A diferença para
  LAB-03 é só `periodicidade`. Não criar duas tabelas.

### LAB-05 — Cronograma/Frequência de Envio de Amostras
- **Função:** **plano** de quais análises cada produto/cliente exige, com que
  frequência, método, limite e laboratório (matriz com colunas de meses para
  marcar o que já foi enviado).
- **Campos (A):** produto · análise · **frequência {Mensal/Semestral/Anual}** ·
  limite · unidade · **COA? {sim/não}** · método (IN 60/2019, Codex VR 0075…) ·
  laboratório/acreditação · observações · grade mês a mês (planejado/realizado).
- **No sistema (A):** catálogo `qualidade.plano_analises` (produto_id, cliente_id,
  ensaio, frequencia, limite, metodo, laboratorio, exige_coa). É o **gerador de
  pendências**: cruza com `envios_laboratorio` para mostrar o que está vencendo.

### LAB-06 — Controle de Contraprovas (FOR PO06 1.0)
- **Função:** rastrear amostras de **contraprova** guardadas em estoque por
  cliente e seu prazo de descarte.
- **Campos:** data de lançamento · nº da caixa · lote(s) · cliente · local de
  estoque · em estoque {sim/não} · observação. Aba auxiliar: tempo de estoque por
  cliente (regra de descarte).
- **No sistema (A+B):** catálogo `qualidade.tempo_contraprova` (cliente_id, dias)
  + registro `qualidade.contraprovas` (lote_id, caixa, cliente_id, local,
  em_estoque, descartar_apos). Alerta de descarte.

### LAB-07 — Numeração de Laudos
- **Função:** sequência de números de laudo emitidos (data + número).
- **No sistema:** **não é tabela** — é um **serial por org** (`laudo_numero`) na
  tabela de laudos (LAB-01). Listagem cobre a necessidade.

### LAB-08 — CEP — Controle Estatístico de Peso (General Mills)
- **Função:** controle de **peso dos big bags** no ensaque (limites menor/maior).
- **Campos:** data · lote · produto · inspeção (nº) · bags · hora · peso · menor ·
  maior · nº dos lacres · responsável · fornecedor (do bag).
- **No sistema (B):** `qualidade.controle_peso` (lote_id, bag_seq, peso,
  limite_min, limite_max, conforme, responsavel_id, lacre). Liga em PCC de ensaque.

### LAB-09 — Estudo de Shelf Life (FOR PQSA13 1.1)
- **Função:** coleta de dados de processo do forno por lote para **estudo de
  vida-de-prateleira** (uma aba por lote estudado).
- **Campos:** fornecedor/produto · variedade da raiz · renda média · data · lote
  · linhas por hora: pressão/temperatura de saída e entrada do forno, inversores
  (ciclone/forno/exaustor/dosador), pressão da caldeira, **umidade, acidez,
  vazamento por peneira (10/18/200)**, nº do bag, responsável. Marca **PCC1**.
- **No sistema (B):** `qualidade.estudos_shelflife` (lote_id, variedade, renda) +
  filha `shelflife_leituras` (hora, parâmetros de processo). Relaciona com os
  parâmetros já no `qualidade.pontos_controle` (CCP-01 temperatura secagem,
  CCP-02 umidade ensaque).
