# BRIEFING DE QUALIDADE — DOCUMENTO CONSOLIDADO

> Compilacao unica dos 6 arquivos de docs/qualidade/. Gerado para repasse ao Claude Code.
> Versoes individuais (recomendado versionar) ficam em docs/qualidade/.


<!-- ============================ README.md ============================ -->

# Briefing de Qualidade — das planilhas para o Sistema

> Documento-fonte para implementar o módulo de **Gestão da Qualidade e Segurança
> de Alimentos (SGSA / FSSC 22000)** dentro do ERP/MES de Sumaré. Foi gerado a
> partir da engenharia reversa das planilhas de produção da empresa (drives
> `Z:\1. Gestão da Qualidade` e `Z:\2. Controle de Qualidade`).

## O que é isto

A empresa hoje opera a qualidade em **planilhas Excel** (≈ 2.600 arquivos no
drive, dos quais ≈ 580 ativos e o resto obsoleto/backup). Quase tudo é um
**formulário codificado** (FOR, POP, PQSA, PO, PLA, IT, PPHO…) preenchido com
uma frequência definida. Este briefing **destila essas planilhas em ~70 modelos
distintos**, agrupados por função, e descreve cada um no detalhe necessário para
virar **entidade + tela + tabela** no sistema.

Princípio que guiou a compilação (conforme pedido):

- **Modelos distintos → detalhamento técnico** (campos, tipos, frequência,
  responsável, estados, relações, proposta de tabela/tela). É o que o Claude
  Code vai usar para programar.
- **Cópias / instâncias do mesmo modelo → visão geral** (quantas existem e o que
  representam). Ex.: as 103 "RNC", 87 "Laudos de Carregamento", 57
  "Especificações por cliente" e 48 "PPHO por equipamento" **não** são 295
  telas — são **4 modelos** com muitos registros.

## Como ler / ordem dos arquivos

| Arquivo | Conteúdo |
| --- | --- |
| **README.md** (este) | Visão geral, sistema de codificação, convenções de domínio, mapa para a arquitetura, índice-mestre e roadmap. |
| `01-nc-ppho-laboratorio.md` | Não conformidades & ações, PPHO/higienização, laboratório/laudos/análises. |
| `02-fornecedores-recebimento.md` | Homologação/qualificação de fornecedores e recebimento de MP/insumos/embalagens. |
| `03-pessoas-auditoria-fooddefense.md` | Treinamento/cultura/BPF pessoal, auditoria interna & verificação de PPR, food defense & food fraud. |
| `04-ambiental-pcc-manutencao.md` | Monitoramento ambiental & pragas, PCC físico (detector de metais/imãs/vidros), manutenção & calibração. |
| `05-mudancas-documentacao-indicadores-expedicao.md` | Gestão de mudanças, controle documental, indicadores/APPCC, expedição & especificações de produto. |

---

## 1. Contexto do negócio

- **Empresa:** Indústria e Comércio de Alimentos Sumaré (marca Bepi Mataruco) —
  **farinheira de mandioca**.
- **Produtos:** farinha de mandioca *crua* (5% e 13% de umidade), *torrada*,
  *especial/panificável*, classificadas por granulometria (peneiras 10/18/200).
- **Processo (etapas):** Descarga → Extração (lavagem, prensagem) → Secagem
  (forno/torra) → Classificação (peneira) → Ensaque (big bag) → Armazenagem →
  Expedição. Já modelado no schema `producao` (`etapas`, `lotes`, etc.).
- **Clientes B2B exigentes:** General Mills, Amafil, Podium, Cassava, Zaya,
  Gluten Free, Pinduca — cada um com especificações e exigências próprias
  (laudos por lote, COA, análises periódicas).
- **Norma de referência:** FSSC 22000 v6 (ISO 22000 + ISO/TS 22002-1), APPCC,
  BPF, RDC 275, IN MAPA 52/2011, Portaria GM/MS 888/2021. Isso explica **por que
  cada planilha existe**: são evidências exigidas por auditoria.

## 2. Sistema de codificação documental (decifrado)

Os nomes de arquivo seguem um padrão. Entendê-lo é a chave para organizar o
módulo:

| Prefixo | Significa | Exemplos |
| --- | --- | --- |
| **POP** | Procedimento Operacional Padrão (PPR — pré-requisito) | POP01 Higienização, POP02 Água, POP03 Higiene pessoal, POP05 Manutenção, POP06 Contraprovas, POP07 Fornecedores, POP08 Renda/impurezas, POP09 Recebimento, POP10 Treinamento |
| **PQSA** | Programa de Qualidade e Segurança de Alimentos | PQSA05 Auditoria, PQSA06 Expedição, PQSA07 Visitantes, PQSA09 Imãs/Vidros, PQSA10 Ar/Climatização, PQSA11 Detector de metais, PQSA13 Shelf life, PQSA15/16 Food Defense, PQSA20 pHmetro |
| **PO / PO12 / PO17** | Procedimento Operacional (sistema de gestão) | PO04 Contatos regulatórios, PO06 Contraprovas, PO10 Monitoramento ambiental, **PO12 Não conformidades**, **PO17 Gestão de mudanças** |
| **PLA / PLAN** | Planejamento / Plano | PLA-SGQ01 Indicadores, PLA-SGQ-05 Manutenção preventiva, PLAN-POP10 Plano de treinamento |
| **FOR** | Formulário/registro (o que se preenche) | FOR-POP09 1.5 Checklist MP, FOR PQSA11 Detector de metais |
| **IT** | Instrução de Trabalho | IT DES 01 Descarga, IT LAB 01 Coleta de amostras, IT CAL 01 Caldeira |
| **PPHO** | Procedimento Padrão de Higiene Operacional (ficha por equipamento) | PPHO-EXT-001 Roscas, PPHO-SEC-004 Forno |
| **CHK** | Checklist nomeado (registro de higienização) | CHK-EXT-POP01-001 |
| **COP / SGQ / SGSA** | Codificações legadas (corporativo/consultoria) | FOR-COP-003 OGM, FOR-SGQ08.06 Ações |

> **Notação de versão:** sufixos como `1.2`, `Ver 01`, `Rev. 04`. Todo formulário
> tem cabeçalho com **ID, Data, Revisão, Elaborado/Revisado/Aprovado por**. Isso
> vira **controle de versão de template** no sistema (ver §4).

## 3. Anatomia comum de uma planilha (o "molde")

Quase todos os modelos têm a **mesma estrutura de 3 blocos** — reproduzir isso
no sistema padroniza tudo:

1. **Cabeçalho de documento** (canto superior): Razão social · Nome do documento
   · **Código** (ex. `FOR PQSA 11 1.2`) · **Versão** · **Frequência** (DIÁRIO,
   SEMANAL, MENSAL, TRIMESTRAL, SEMESTRAL, ANUAL, A CADA EVENTO) · Elaborado em /
   por · Aprovado em / por.
2. **Bloco de identificação do registro**: data, hora, turno, lote, operador,
   setor/equipamento, NF, placa do veículo, fornecedor — conforme o caso.
3. **Tabela de itens/medições**: linhas de checklist (Conforme / Não Conforme /
   N/A) **ou** medições (valor + limite + status) **ou** itens avaliados com
   nota. Termina em **Status** e, muitas vezes, **Ação corretiva / Responsável /
   Validação da Qualidade**.

Padrões de valor que se repetem (vire **enums/value-objects**):

- **Conformidade:** `Conforme | Não Conforme | N/A` (e variações
  `Aprovado|Reprovado`, `OK|Não OK`, `S|N|NA`).
- **Status de fluxo:** `Em dia | Em atraso | Em andamento | Concluído |
  Aguardando liberação | Encerrada`.
- **Eficácia (ações):** `Eficaz | Ineficaz | Não se aplica`.
- **Avaliação de risco:** nota `1/2/3` em eixos (Severidade × Probabilidade,
  Acessibilidade × Detecção × Reconhecibilidade) → `Tolerável | Moderado | Não
  tolerável` / `Significativo | Não significativo`.

## 4. Mapa para a arquitetura do Sistema

O repo já tem schemas `core`, `producao`, `qualidade` (Fase 2) e `manutencao`
(Fase 3), multi-tenant com `org_id` + RLS e o gate `public.liberar_lote`. Este
módulo **estende `qualidade`** e parte de `manutencao`.

**Dados-mestre que já existem e devem ser reusados (NÃO recriar):**

| Conceito nas planilhas | Entidade existente |
| --- | --- |
| Lote / amostra (MD2309…) | `producao.lotes` |
| Etapa do processo | `producao.etapas` / `producao.etapas_lote` |
| Cliente (General Mills…) | `core` (clientes — ver migration 0006) |
| Fornecedor / produtor rural / transportadora | `core.fornecedores` (já tem `homologado`, `tipo`) |
| Produto (farinha tipo X) | `core.produtos` |
| Colaborador / operador / responsável | `core.funcionarios` |
| Equipamento (rosca, forno, balança…) | `core.equipamentos` (tem `tag`, `setor_id`) |
| Setor (extração, secagem, ensaque…) | `core.setores` |
| Ponto de controle / PCC / PPR | `qualidade.pontos_controle` (já existe) |
| Medição por lote | `qualidade.monitoramentos` (já existe) |

**Três formatos de tabela se repetem.** Padronize a implementação em torno deles:

- **A) Catálogo/template** (`codigo` PK, global ou por org, só leitura p/
  usuário comum): tipos de checklist, pontos de amostragem, itens de inspeção,
  planos. Ex.: `qualidade.pontos_controle`.
- **B) Registro append-only** (uuid + `org_id` + FK + `registrado_em` +
  `created_by`, `revoke update/delete`): toda evidência preenchida no chão de
  fábrica (checklists, medições, laudos, NC). Segue `qualidade.monitoramentos`.
- **C) Documento versionado** (cabeçalho do §3): template com `codigo`,
  `versao`, `frequencia`, `elaborado_por/em`, `aprovado_por/em`, `vigente`.
  Sugestão: tabela transversal `qualidade.documentos` + `qualidade.documento_versoes`
  alimentando a **Lista Mestra** (ver módulo 05).

**Convenções a manter** (iguais às migrations atuais):

- Toda tabela tenant: `org_id uuid not null references core.organizacoes(id)` +
  trigger `core.set_org_id` + RLS `org_id = core.current_org()`.
- Registros de evidência: **append-only** (`revoke update, delete`), com
  `registrado_em`, `created_by`.
- Catálogos globais: sem `org_id`, policy de leitura para `authenticated`.
- Nomes em **pt-BR**, snake_case, igual ao domínio existente.
- Tipos no `packages/domain` espelham as tabelas (uma entidade por tabela de
  registro/catálogo relevante).

## 5. Índice-mestre dos modelos

Legenda de **Tipo no sistema**: **A** catálogo/template · **B** registro
append-only · **C** documento versionado · **M** dado-mestre (reusa `core`).

| # | Módulo | Modelos distintos (resumo) | Tipo | Frequência típica |
| --- | --- | --- | --- | --- |
| 01 | **Não Conformidades & Ações** | RNC (FOR PO12) · Notificação de Ocorrência · Controle/registro de RNC · Plano de Ação (FOR-SGQ08.06) | B | Por evento |
| 01 | **PPHO & Higienização** | Ficha PPHO por equipamento · Validação de limpeza (cronograma+resultados) · SWAB mãos/uniformes · Resultados água potável · Cloro residual & pH · Higienização exaustores | A+B | Diário→Semestral |
| 01 | **Laboratório & Laudos** | Laudo interno físico-químico · Verificação visual · Controle de envio p/ lab (por lote) · Análises periódicas (mensal/anual) · Frequência de envio (cronograma) · Contraprovas · Numeração de laudos · CEP peso · Shelf life | A+B | Por lote / periódico |
| 02 | **Fornecedores** | Autoavaliação (FQ-178) · Avaliação insumos (FOR-COP-001) · OGM · Halal · Alergênicos · Radiológicos · Desempenho semestral · Pré-qualificação (visita) · BPA agrícola · Matriz de fornecedores · Base de documentações | A+B+M | Homologação / semestral |
| 02 | **Recebimento MP/Insumos** | Checklist inspeção de MP (mandioca) · Recebimento de pallets · Controle de embalagens · Controle de estoque de insumos (lab) · Renda & impurezas | A+B | A cada recebimento |
| 03 | **Pessoas / Treinamento / Cultura** | Lista de presença · Controle de treinamentos · Plano de treinamentos · Avaliação de cultura · Indicador de engajamento · Descrição de cargos/funções · Checklist asseio pessoal | A+B | Por evento / mensal |
| 03 | **Auditoria & Verificação PPR** | Checklist auditoria interna (ISO 22000/TS 22002) · Cronograma · Plano · Programa · Verificação de PPRs · Autoinspeção BPF (RDC 275) | A+B+C | Anual / mensal |
| 03 | **Food Defense & Fraude** | Checklist Food Defense (estrutura) · Análise de risco Food Defense · Plano de vulnerabilidade (Food Fraud) · Avaliação estrutural mensal | A+B | Trimestral / anual |
| 04 | **Ambiental & Pragas** | Cronograma de monitoramento ambiental · Identificação de risco microbiológico (zonas) · Monitoramento do ar · Avaliação de tendência de pragas | A+B | Trim./Semestral/mensal |
| 04 | **PCC Físico** | Detector de metais (FOR PQSA11) · Verificação/limpeza de imãs · Registro de quebra de vidros | B | A cada 2h / diário / evento |
| 04 | **Manutenção & Calibração** | Ordem de serviço · Plano de manutenção preventiva · Plano de lubrificação · Inventário de ferramentas · Monitoramento da caldeira · Avaliação de certificados de calibração · Calibração do pHmetro | A+B | Diário→anual |
| 05 | **Gestão de Mudanças** | Formulário de gestão de mudanças (FOR PO17) | B | Por evento |
| 05 | **Documentação & Indicadores** | Lista mestra de documentos · Lista mestra de registros · Controle de documentos/matriz fornecedores · Controle de pendências de registros · Indicadores da política & objetivos · Indicador de resíduos · Satisfação de clientes · Contatos regulatórios · Plano APPCC | A+B+C | Anual / mensal |
| 05 | **Expedição & Especificações** | Laudo de carregamento · Checklist de expedição · Controle de acesso de visitantes · Especificação de produto por cliente (ficha técnica) | A+B | A cada carregamento |

## 6. Quadro de "cópias" (visão geral — NÃO viram telas separadas)

Estes são os modelos com muitas instâncias no drive. No sistema, **um template +
muitos registros**:

| Modelo | Instâncias ativas (aprox.) | No sistema |
| --- | --- | --- |
| Laudo de Carregamento (`NF - … - LOTE`) | **87** | 1 template de laudo + N registros por lote/NF (módulo 05) |
| Especificação de produto por cliente | **57** | 1 entidade `especificacao` (produto × cliente) + N fichas (módulo 05) |
| PPHO por equipamento (EXT/SEC/ENS…) | **48** | 1 catálogo de fichas PPHO + registros de execução (módulo 01) |
| Notificação de Ocorrência (N.O / NO Externa) | **39** | mesmo modelo de NC, origem "fornecedor/cliente" (módulo 01) |
| Questionários de fornecedor (homologação) | **26** | 1 conjunto de questionários versionados por fornecedor (módulo 02) |
| RNC / Relatório de Não Conformidade (FOR PO12) | **23 + variações** | 1 entidade `nao_conformidade` + N registros (módulo 01) |
| Checklist Estrutural (PQSA05) | **22** | 1 template + N execuções mensais (módulo 03) |
| Laudo interno físico-químico | **23** | 1 template + N laudos por lote (módulo 01) |
| Gestão de Mudanças (PO17) | **15** | 1 entidade `mudanca` + N registros (módulo 05) |
| Lista de presença (treinamentos) | **13** | 1 template + N por treinamento (módulo 03) |

> Total: a maioria dos 441 "nomes distintos" do drive colapsa nestes ~70 modelos.
> Os documentos `.docx`/procedimentos-texto (POPs descritivos) **não** são
> planilhas e ficam fora deste briefing — entram como "documento" na Lista Mestra.

## 7. Roadmap sugerido de implementação

Ordem por valor + dependência (o gate de liberação de lote já existe e é o
coração do MES):

1. **Laboratório & Laudos por lote** + **NC/Ações** → fecham o ciclo do lote e
   plugam direto no `liberar_lote` (lote só libera sem laudo reprovado e sem NC
   aberta de PCC). *Maior valor imediato.*
2. **PCC Físico** (detector de metais, imãs, vidros) e **PPHO/Higienização** →
   evidências diárias dos PPRs/PCCs; alimentam `qualidade.monitoramentos`.
3. **Recebimento MP/Insumos** + **Fornecedores** → qualificação e entrada da
   cadeia (liga em `core.fornecedores.homologado`).
4. **Auditoria, Food Defense, Ambiental, Manutenção/Calibração** → programas
   periódicos com cronograma e status.
5. **Documentação/Indicadores/Mudanças/Expedição/Especificações** → camada de
   governança (Lista Mestra, versão de documentos, KPIs, expedição).

Cada modelo nos arquivos 01–05 traz a seção **"No sistema"** com a tabela e a
tela propostas, prontas para o Claude Code implementar seguindo as convenções do
§4.


---

<!-- ============================ 01-nc-ppho-laboratorio.md ============================ -->

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


---

<!-- ============================ 02-fornecedores-recebimento.md ============================ -->

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


---

<!-- ============================ 03-pessoas-auditoria-fooddefense.md ============================ -->

# Módulo 03 — Pessoas/Treinamento, Auditoria e Food Defense

> Detalhamento técnico. Convenções e tipos (A/B/C/M) no [README](./README.md).

---

## 3.1 Pessoas, Treinamento e Cultura (POP03, POP10)

### PES-01 — Lista de Presença em Treinamentos (FOR-POP03 1.2 / FOR-POP.0)
- **Função:** registrar presença em um treinamento/integração.
- **Campos:** conteúdo programático · local · data · horário · instrutor · linhas
  (nome do participante · assinatura).
- **No sistema (B):** `qualidade.treinamentos` (tema, conteudo, instrutor, data,
  local, carga_horaria) + filha `treinamento_participantes`
  (treinamento_id, funcionario_id→`core.funcionarios`, presente, assinatura_url).
- **Cópias:** ~13 listas (por treinamento) → registros.

### PES-02 — Controle de Treinamentos (FOR POP10 1.2)
- **Função:** matriz consolidada de **quem fez quais treinamentos** e validade.
  *(arquivo não abriu na extração; estrutura inferida do PES-01 + Lista Mestra)*
- **No sistema:** **view/tela** sobre `qualidade.treinamentos` +
  `treinamento_participantes`, cruzando com PES-03 (plano) para apontar pendências
  e reciclagens vencidas. Não é tabela nova.

### PES-03 — Plano de Treinamentos (PLAN-POP10 1.1)
- **Função:** **planejar** treinamentos por requisito do SGSA (Food Defense, Food
  Fraud, Monitoramento Ambiental, etc.) e a quem se destinam.
- **Campos:** item-requisito · descrição/escopo · responsável de monitoramento/
  área-alvo.
- **No sistema (A):** catálogo `qualidade.plano_treinamento` (requisito, escopo,
  publico_alvo, periodicidade). Gera as pendências de PES-02.

### PES-04 — Avaliação de Cultura (Questionários Cultural)
- **Função:** avaliar a **cultura de segurança de alimentos** dos colaboradores
  (produção/adm) com notas 1/2/3 por pergunta (FSSC v6 exige cultura).
- **Campos:** data · colaborador/responsável · avaliação por pergunta {nota
  1/2/3} · descrição/evidências. Abas mensais → histórico.
- **No sistema (A+B):** catálogo `qualidade.cultura_perguntas` (publico:
  produção/adm) + registro `qualidade.avaliacoes_cultura` (data, avaliador_id,
  colaborador_id) com filha de respostas. Alimenta o indicador de cultura (PLA SGQ
  01, módulo 05).

### PES-05 — Indicador de Engajamento (FOR-POP03 1.3)
- **Função:** indicador de engajamento dos colaboradores. *(arquivo não abriu;
  estrutura inferida — segue o padrão de "indicador": meses × valor × meta ×
  ações.)*
- **No sistema:** registro no padrão de **indicador** (ver módulo 05, IND-*):
  `qualidade.indicador_medicoes` com `indicador='engajamento'`.

### PES-06 — Descrição de Cargos e Funções (PLAN-POP03 1.0)
- **Função:** descritivo de cada **cargo**: função, papel na segurança de
  alimentos, competência, experiência, formação, treinamentos exigidos.
- **Campos:** cargo · descrição da função · papel na segurança de alimentos ·
  competência · experiência · formação · treinamentos (ex.: NR 01…).
- **No sistema (A):** catálogo `qualidade.cargos` (ou `core.cargos`)
  — referência para `core.funcionarios.funcao` e para PES-03 (treinamentos por
  cargo). É **dado-mestre**.

### PES-07 — Checklist de Asseio Pessoal (FOR POP03 1.1)
- **Função:** inspeção **semanal** de higiene pessoal por colaborador/turno.
- **Campos:** frequência · data · turno · por colaborador: nome · setor · barba
  protegida · uniformes limpos/íntegros · unhas curtas/sem esmalte · higienização
  das mãos · adornos · uso da touca · estado de saúde — cada item
  {Conforme/Não Conforme}.
- **No sistema (A+B):** catálogo `qualidade.checklist_itens`
  (`contexto='asseio'`) + registro `qualidade.inspecoes_asseio` (data, turno,
  funcionario_id) com filha de respostas. NC → ação/NC-01.

---

## 3.2 Auditoria Interna e Verificação de PPRs (PQSA05)

### AUD-01 — Checklist de Auditoria Interna (FOR-PQSA5 1.2)
- **Função:** conduzir **auditoria interna FSSC 22000** contra ISO 22000:2018,
  ISO/TS 22002-1 e requisitos adicionais; consolidar resultado e NCs.
- **Estrutura (abas):** Resumo do relatório · Capa (organização, escopo, data,
  duração) · **ISO 22000** (cláusulas 4..10) · **ISO-TS 22002-1** · Requisitos
  adicionais · Anexo I Rastreabilidade · **Não Conformidades**.
- **Campos por cláusula:** cláusula · requisito · classificação
  {Conforme, NC Crítica, NC Maior, NC Menor, NA} · descrição/evidência.
- **No sistema (A+C+B):** catálogo de requisitos `qualidade.requisitos_norma`
  (norma, clausula, texto) [documento versionado] + registro
  `qualidade.auditorias` (escopo, norma, data, auditor, unidade, resultado) com
  filha `auditoria_itens` (clausula, classificacao, evidencia). Cada NC encontrada
  **gera NC-01** (`origem='auditoria_interna'`).

### AUD-02 — Cronograma de Auditorias (FOR-PQSA5 1.1)
- **Função:** **planejar** auditorias do ano (interna, manutenção, certificação)
  com frequência e status.
- **Campos:** requisito/tipo de auditoria · auditores · frequência (meses) ·
  status {Planejada, Realizada} · grade de meses.
- **No sistema (A):** `qualidade.cronograma_auditorias` (tipo, auditor,
  frequencia, mes_planejado, status). Gera lembretes.

### AUD-03 / AUD-04 — Plano e Programa de Auditoria (modelos)
- **Função:** Plano = roteiro de uma auditoria (itens/horários/setores); Programa
  = visão anual de todas. São **templates de documento**.
- **No sistema:** Plano → derivável de `qualidade.auditorias` + itens; Programa →
  o próprio `cronograma_auditorias`. Não criar tabelas novas.

### AUD-05 — Verificação de PPRs (FOR-PQSA5 1.3)
- **Função:** verificação **mensal** de que cada PPR (POP01..POP10, PQSA05..18)
  está sendo registrado conforme a frequência. Uma aba por programa.
- **Campos:** programa (POP01…) · registro verificado (CHK-EXT-POP01-001…) ·
  frequência do registro {Diário/Semanal…} · data da verificação · situação
  {Conforme/Não Conforme} · ação corretiva · responsável pela verificação.
- **No sistema (B):** `qualidade.verificacoes_ppr` (programa, registro_codigo,
  frequencia, verificado_em, conforme, acao, responsavel_id). É a "auditoria de
  preenchimento" — cruza com a **Lista Mestra de Registros** (módulo 05).

### AUD-06 — Autoinspeção BPF (Anvisa RDC 275 / Check List Inspeção BPF)
- **Função:** autoinspeção de **Boas Práticas de Fabricação** estruturada por
  blocos (edificação, instalações, equipamentos…), com pontuação e classificação.
- **Campos:** item (numerado 1.00.00…) · requisito · {Sim/Não/NA} · pontuação ·
  comentários/NC.
- **No sistema (A+B):** catálogo `qualidade.checklist_itens`
  (`contexto='bpf_rdc275'`, hierárquico) + registro `qualidade.autoinspecoes`
  (data, grupo_auditor, pontuacao, classificacao) com filha de respostas.

---

## 3.3 Food Defense & Food Fraud (PQSA15, PQSA16)

### FD-01 — Checklist Food Defense — Estrutura (FOR PQSA15 1.1)
- **Função:** verificação **trimestral** das barreiras de segurança patrimonial
  (câmeras, iluminação, cercas, poço/caixas d'água trancados…).
- **Campos:** data · responsável · verificado pelo SGSA · itens (nr · item ·
  requisito relacionado · {marque X se OK / NC} · descrição/evidências). Abas por
  trimestre.
- **No sistema (A+B):** catálogo `qualidade.checklist_itens`
  (`contexto='food_defense'`) + registro `qualidade.checklists_food_defense`
  (data, responsavel_id, validado_por) com filha de respostas. NC → NC-01.

### FD-02 — Análise de Risco Food Defense (ANEXO 4 PQSA16)
- **Função:** **análise de vulnerabilidade a ataque intencional** por
  área/origem (visitantes, colaboradores). Notas em eixos →
  `Risco = Acessibilidade × Detecção × Reconhecibilidade`.
- **Campos:** origem do ataque {visitantes, colaboradores} · área/local · existe
  ameaça? · acessibilidade (1–3) + justificativa · dificuldade de detecção (1–3) +
  justif. · reconhecibilidade (1–3) + justif. · **risco (V×A×R)** · justificativa
  · necessário mitigação? · medidas de controle relacionadas. Escala: <3 tolerável,
  3–8 moderado, ≥9 não tolerável.
- **No sistema (B):** `qualidade.analises_risco` (`tipo='food_defense'`, origem,
  area, eixos jsonb, risco, classificacao, mitigacao). **Tabela genérica de
  análise de risco** — reusada por FD-03, APPCC e ambiental (mesma mecânica).

### FD-03 — Plano de Vulnerabilidade / Food Fraud (PQSA15 / PLSA 15)
- **Função:** **análise de vulnerabilidade a fraude** de insumos e produtos
  (oportunidade × motivação): histórico, facilidade de adulteração, transparência
  da cadeia, valor, demanda, competição, cultura ética.
- **Campos:** insumo/MP ou produto · fornecedor · fraude possível · eixos de
  Oportunidade (características, tecnologia de adulteração, complexidade da cadeia)
  e Motivação (valor, demanda, competição, cultura) — cada um nota + justificativa.
- **No sistema (B):** `qualidade.analises_risco` (`tipo='food_fraud'`) com os
  eixos próprios. Mesma tabela genérica do FD-02.

### FD-04 — Avaliação Estrutural Mensal (Questionários-Estrutura / FOR PQSA05)
- **Função:** checklist **mensal** das condições estruturais (áreas comuns, por
  área produtiva, armazenamento) — limpeza, contaminação cruzada, integridade de
  pisos/forros/vedações. Alimenta o **indicador/avaliação de tendência de pragas**
  (módulo 04).
- **Campos:** setor/área · data · responsável · itens {marque X se cumprir} +
  descrição/evidências · resultados para divulgação (% conformidade).
- **No sistema (A+B):** catálogo `qualidade.checklist_itens`
  (`contexto='estrutural'`) + registro `qualidade.inspecoes_estruturais`
  (area, data, responsavel_id, percentual_conformidade). **Cópias:** ~22
  instâncias (Checklist Estrutural mensal) → registros.


---

<!-- ============================ 04-ambiental-pcc-manutencao.md ============================ -->

# Módulo 04 — Ambiental/Pragas, PCC Físico e Manutenção/Calibração

> Detalhamento técnico. Convenções e tipos (A/B/C/M) no [README](./README.md).

---

## 4.1 Monitoramento Ambiental & Pragas (PO10, POP06)

### AMB-01 — Cronograma de Monitoramento Ambiental (PLAN PO10 1.1)
- **Função:** plano de **monitoramento ambiental microbiológico** (Salmonella,
  Enterobactérias, mesófilos) por ponto/zona, e controle dos envios. Abas:
  Cronograma · Controle de envio · Resultados.
- **Campos — cronograma (A):** patógeno · área de amostragem · ponto de coleta
  (nº) · método de limpeza · **área higiênica/zona** {Alto risco, Alto risco com
  PCC, Fluxo pessoas…} · descrição do ponto · frequência {Semestral, Anual,
  Trimestral} · momento da coleta · grade mês a mês.
- **Campos — controle de envio (B):** patógeno · local · descrição do ponto ·
  data de envio · **limite de envio** (próxima data) · status {Em dia, Em atraso}.
- **Campos — resultados (B):** data · local · ensaio · resultado · limite ·
  status.
- **No sistema (A+B):** catálogo `qualidade.pontos_amostragem`
  (`contexto='ambiental'`, zona, patogeno, frequencia) + registro
  `qualidade.monitoramento_ambiental` (ponto_id, enviado_em, proxima_em,
  resultado, conforme). Pode **unificar com HIG-02** (validação de limpeza) — é a
  mesma mecânica de swab por ponto/zona.

### AMB-02 — Identificação de Risco do Ambiente (PLAN PO10-2)
- **Função:** classificar **zonas de amostragem** (1–4) por probabilidade ×
  severidade → risco → frequência de teste. Fundamenta o AMB-01.
- **Campos:** zona · superfície/área · o que procurar (patógenos) · justificativa
  · probabilidade (estágio do processo) · severidade · **risco** · classificação
  {Alto/Médio} · frequência de teste.
- **No sistema (A):** catálogo `qualidade.zonas_ambientais` (zona, descricao,
  patogeno, probabilidade, severidade, risco, frequencia). Define os pontos do
  AMB-01.

### AMB-03 — Monitoramento do Ar (FOR PQSA10 1.1)
- **Função:** análise **trimestral** da qualidade do ar (contagem de mesófilos)
  por área de ensaque.
- **Campos:** data · patógeno {Contagem total mesófilos} · zona · área · limite
  (100 UFC/placa) · resultado · resultado {Aprovado/Reprovado}.
- **No sistema (B):** `qualidade.monitoramento_ar` (data, area, limite, resultado,
  aprovado). Liga em PQSA10. Pode ser linha de `monitoramento_ambiental` com
  `matriz='ar'`.

### AMB-04 — Avaliação de Tendência — Controle de Pragas (FOR-POP06 1.1)
- **Função:** **indicador anual/semestral** de eficácia do controle de pragas, a
  partir da % de conformidade das inspeções estruturais (FD-04).
- **Campos:** área de processo · responsável · frequência (mensal) · objetivo ·
  método de apuração · por mês: % conformidade · meta (90%) · análise/avaliação ·
  decisão · **eficácia {Eficaz/Ineficaz}** · status {Andamento, Encerrada, Em
  atraso}.
- **No sistema (B):** padrão **indicador** (ver módulo 05) com
  `indicador='controle_pragas'`. Relaciona com os relatórios da dedetizadora e com
  FD-04. Inclui também **mapa de armadilhas** (referenciado em RNCs) → catálogo
  `qualidade.armadilhas` (numero, localizacao) se for digitalizar o mapa.

---

## 4.2 PCC Físico — Detector de Metais, Imãs, Vidros (PQSA09, PQSA11)

### PCC-01 — Registro do Detector de Metais (FOR PQSA11 1.2)
- **Função:** verificar, **a cada 2 horas**, o detector de metais de cada linha
  de ensaque com corpos de prova. É **PCC** (ponto crítico de controle físico).
- **Campos — teste (frente):** mês · data · horário · **tipo de teste** {Início
  produção, Após parada, Após manutenção DM, Troca de produto, Durante a produção,
  Final de produção} · resultado por corpo de prova: **Ferroso 1,2 mm**, **Não
  ferroso 1,2 mm**, **Aço inox 1,5 mm** — cada um {Detecta, alarma e rejeita /
  Não detecta} · operador responsável.
- **Campos — verso (ação corretiva):** manutenção corretiva (hora início/fim,
  causa, correção, manutentor) · atividade de correção quando "não acusa/não
  rejeita" ou ">5 partículas/h": líder informado, linha parada?, manutenção
  informada?, produção do período retida?, investigação.
- **No sistema (B):** catálogo `qualidade.detectores_metais` (equipamento_id,
  linha, corpos_prova: ferroso/nao_ferroso/inox) + registro
  `qualidade.verificacoes_dm` (detector_id, registrado_em, tipo_teste,
  resultado_ferroso/nao_ferroso/inox bool, operador_id) + filha de ação corretiva
  quando reprovado. **É PCC:** falha → segrega produção do período + NC-01 +
  **bloqueia liberação dos lotes do intervalo**. Plugar no gate.
- **Cópias:** uma planilha por linha/detector (DM01-ENS01…) → registros filtrados
  por `detector_id`.

### PCC-02 — Verificação e Limpeza de Imãs (FOR PQSA09 1.3)
- **Função:** verificar/limpar **imãs** (captura de partículas ferrosas)
  **1×/dia** por setor (Extração, Secagem, Ensaque). PPRO.
- **Campos:** mês · data · hora · local/ponto (Saída do lavador, Forno 1,
  Padronizador, Moinho, Bocal de saída do bag…) · **peso (g)** capturado ·
  responsável · **material** encontrado · ação corretiva. Uma aba por setor.
- **No sistema (A+B):** catálogo `qualidade.imas` (setor_id, local) + registro
  `qualidade.verificacoes_ima` (ima_id, registrado_em, peso_g, material,
  responsavel_id, acao).

### PCC-03 — Registro de Quebra de Vidros (FOR-PQSA09 1.4)
- **Função:** registrar **imediatamente** qualquer quebra/trinca de vidro
  (controle de material quebradiço).
- **Campos:** data · hora · local da ocorrência · tipo de vidro quebrado ·
  quantidade estimada · causa · ação imediata tomada · responsável · conclusão/
  ação preventiva.
- **No sistema (B):** `qualidade.quebras_vidro` (registrado_em, local,
  tipo_vidro, quantidade, causa, acao_imediata, responsavel_id, acao_preventiva).
  Quebra sobre linha → avaliar segregação + NC-01.

---

## 4.3 Manutenção & Calibração (POP05, PQSA20)

> O schema `manutencao` já existe vazio (Fase 3). OS e preventiva moram nele;
> calibração é qualidade (afeta medições/PCC). Equipamentos = `core.equipamentos`.

### MAN-01 — Ordem de Serviço de Manutenção (FOR-POP05 1.1)
- **Função:** abrir/registrar uma **OS** (corretiva/solicitação).
- **Campos:** setor · nome do solicitante · nome do equipamento · serviço
  solicitado · serviço realizado · (datas, responsável, status).
- **No sistema (B):** `manutencao.ordens_servico` (equipamento_id, setor_id,
  solicitante_id, descricao_solicitada, descricao_realizada, status {aberta,
  em_execucao, concluida}, datas). Liga em NC quando a OS nasce de um desvio.

### MAN-02 — Plano de Manutenção Preventiva (FOR-POP05 1.2 / PLA-SGQ-05)
- **Função:** **plano preventivo por equipamento** (uma aba por equipamento, ~55)
  com componentes a verificar e datas planejada/realizada por trimestre.
- **Campos:** equipamento · componente (ex.: "MANCAL F 213", "ROLAMENTO UC
  213"…) · por trimestre: data planejada · data realizada · realizado por.
- **No sistema (A+B):** catálogo `manutencao.plano_preventivo` (equipamento_id,
  componente, periodicidade) + registro `manutencao.execucoes_preventiva`
  (plano_item_id, planejada_em, realizada_em, executor). **Cópias:** ~55 abas =
  itens do catálogo por equipamento, não telas.

### MAN-03 — Plano de Lubrificação (FOR-POP05 1.3)
- **Função:** plano de **lubrificação industrial** por setor/equipamento (P=
  planejado, R=realizado, grade semanal/mensal).
- **Campos:** TAG · equipamento · item a lubrificar · lubrificante · nº de
  bombadas · frequência {Semanal, Quinzenal, Mensal, Trimestral} · grade
  (semanas).
- **No sistema (A+B):** catálogo `manutencao.plano_lubrificacao` (tag,
  equipamento_id, item, lubrificante, bombadas, frequencia) + registro de
  execução. Mesmo padrão do MAN-02.

### MAN-04 — Inventário de Ferramentas (FOR-POP05 1.7)
- **Função:** inventário das **caixas de ferramentas** (verde/vermelha) por área
  — controle de material que pode virar contaminante físico.
- **Campos:** item · ferramenta · quantidade · área · (conferência/assinatura).
- **No sistema (A):** catálogo `manutencao.ferramentas` (caixa, ferramenta,
  quantidade_padrao, area) + registro de conferência periódica.

### MAN-05 — Monitoramento da Caldeira (FOR-POP05 1.8)
- **Função:** checklist **diário** da caldeira (briquete/gás): inspeção visual,
  combustão, e leituras horárias.
- **Campos — checklist:** data · turno · operador · pressão de trabalho · horário
  início/fim · itens {área limpa, sem vazamentos, sem ruídos, isolamento, pressão
  do gás, sem odor, chama estável, exaustão…} marcáveis.
- **Campos — leituras (horária):** hora · pressão vapor · temp. vapor · nível de
  água · temp. água alimentação · pressão combustível · consumo combustível ·
  purga realizada {Sim/Não}.
- **No sistema (A+B):** catálogo de itens + registro `qualidade.monitor_caldeira`
  (data, turno, operador_id) com filha de leituras horárias. Liga em IT CAL 01/02/03.

### MAN-06 — Avaliação de Certificados de Calibração (FOR-POP05 01.04)
- **Função:** controlar **calibração dos instrumentos** (balanças, etc.):
  certificado, validade, incerteza, critério de aceitação → status. Abas:
  Verificação (interna periódica) e Calibração (certificados externos).
- **Campos:** equipamento · área/local · nº de série · **código do equipamento**
  (BL01…) · data de calibração · empresa que calibrou · nº do certificado ·
  **validade** · informações do certificado {C/NC} · faixa de uso · faixa de
  medição · critério de aceitação · somatória de incerteza · **status {OK/…}** ·
  obs.
- **No sistema (A+B):** catálogo `qualidade.instrumentos` (codigo, equipamento_id,
  faixa, criterio_aceitacao) + registro `qualidade.calibracoes` (instrumento_id,
  calibrado_em, valido_ate, empresa, certificado_numero, incerteza, conforme,
  anexo_url). **Alerta de validade** + bloqueio: instrumento com calibração
  vencida invalida medições/PCC associados.

### MAN-07 — Calibração do pHmetro (FOR-PQSA20 / FOR-POP02 1.2)
- **Função:** registro de **calibração/ajuste do pHmetro** com soluções tampão.
- **Campos:** data · hora · solução tampão pH 4,0 (3,80–4,00) · solução tampão pH
  7,0 (6,80–7,00) · **conforme/não conforme** · responsável · validação da
  Qualidade. Frequência: sempre que houver necessidade.
- **No sistema (B):** `qualidade.calibracoes` `tipo='phmetro'` (registro de
  verificação diária do instrumento de medição de pH usado em HIG-05).


---

<!-- ============================ 05-mudancas-documentacao-indicadores-expedicao.md ============================ -->

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


---

