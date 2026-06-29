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
