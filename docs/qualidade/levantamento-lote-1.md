# Reformulação da Qualidade — Levantamento, lote 1

Planilhas analisadas (5): FOR POP 09 1.2, FOR POP 09 1.5, FOR POP 07 1.1/1.8, FOR PQSA 8, FOR PQSA 08 1.2/1.3.
Objetivo: entender o que cada uma registra, o que o sistema já cobre, e o que falta — para compilar com os próximos lotes antes de programar.

---

## 1. FOR POP 09 1.2 — Ficha de acompanhamento da descarga (Ver 02)

**O que é:** uma linha por carga descarregada.

| Campo | Tipo | Observação |
|---|---|---|
| Data, Hora, Turno | data/hora/turno | |
| Produtor | cadastro | |
| Variedade | texto/lista | |
| Renda 1 a 5 | número | 5 amostras de renda |
| Renda média | **calculado** | média das 5 |
| Toneladas | número | |
| Impureza | número (%) | |
| Ticket | texto | nº do ticket da balança |
| Rosca | texto | rosca de descarga |
| Responsável | usuário | |

**No sistema hoje:** a *Chegada da carga* (`producao.recebimentos`) já tem produtor, variedade, quantidade, ticket, renda/preço, cancha (antiga "rosca") e data.
**Falta:** as 5 rendas individuais (hoje só a final), impureza %, turno, hora separada.
**Proposta:** não criar tela nova — **acrescentar esses campos na Chegada da carga** (mesma decisão já tomada com o comprador). A ficha vira um relatório/impressão da própria chegada.

---

## 2. FOR POP 09 1.5 — Checklist de inspeção de carga de mandioca (Ver 02)

**O que é:** inspeção visual feita pelo operador da descarga, por carga.

Cabeçalho: tipo de MP (Convencional / Orgânica), data, placa, produtor, variedade, horário, ticket.

Itens (Conforme / Não conforme):
1. Carga coberta, protegida de chuva e sujeira no transporte
2. Corpos estranhos (plástico, madeira, metal…)
3. Impurezas em excesso (terra, folhas, galhos…)
4. Mandioca podre, fermentada ou deteriorada
5. Odor anormal (azedo, fermentado, mofado…)
6. Pragas, animais ou sinais de infestação

Rodapé: observações, responsável pelo recebimento.
Regra do formulário: **em caso de NC, registrar em observações e comunicar encarregado e Qualidade.**

**No sistema hoje:** já existe `qualidade.inspecoes_recebimento` (placa, ticket, variedade, conforme, observação, vínculo com o recebimento) e o motor de checklists (`qualidade.checklists` por contexto).
**Falta:** cadastrar estes 6 itens como checklist do contexto "recebimento"; campo tipo de MP (orgânica/convencional); aviso automático à Qualidade quando houver item NC.
**Proposta:** checklist preenchido **dentro da Chegada da carga** (mesmo registro, mesma placa/ticket — sem digitar duas vezes). Item NC → abre NC (ou alerta) para a Qualidade.

---

## 3. FOR POP 07 1.1 — Questionário de homologação de fornecedores (Ver 01)

**O que é:** auditoria/visita ao produtor de mandioca antes de comprar.

Cabeçalho: produtor, propriedade, código do produtor, localização, variedades cultivadas, comprador, tipo de produção (orgânica/convencional), área cultivada, data da avaliação.

40 itens em 8 blocos (Conforme / Não conforme / Não aplicável):

| Bloco | Itens |
|---|---|
| Identificação e controle da propriedade | 1–5 (alguns pedem texto: "uso anterior da área", "culturas próximas") |
| Produção e boas práticas agrícolas | 6–11 |
| Insumos e perigos químicos | 12–16 (16 pede quais agrotóxicos) |
| Colheita, qualidade e contaminação | 17–22 |
| Transporte e carregamento | 23–27 |
| Produção orgânica — quando aplicável | 28–36 (só se orgânico) |
| Rastreabilidade e documentos | 37–38 |
| Não conformidades e conclusão | 39–40 |

Declaração final: lista de **agrotóxicos permitidos** (Metribuzin, Bacillus thuringiensis, Beta-ciflutrina, Clethodim, Clomazone, Dimetenamida-p, Lufenuron, Ametryn, ou Não aplicável), proibição de isoxaflutol (Fordor 750 WG, Provence 750 WG), e assinaturas de comprador e produtor.

**No sistema hoje:** existe `qualidade.homologacoes` (status, pontuação, classificação, validade) e a Avaliação de desempenho (FOR POP 07) já feita.
**Falta:** o questionário em si (40 itens com N/A e campos "citar"), bloco orgânico condicional, agrotóxicos declarados, assinaturas/anexo do documento assinado.
**Proposta:** questionário dentro do cadastro do fornecedor → aba Homologação. Itens em N/A não contam; bloco orgânico só aparece se tipo = orgânica. Upload do PDF/foto assinado. Fornecedor só fica "Homologado" com o questionário concluído.

---

## 4. FOR PQSA 8 — Registro de monitoramento do forno (Rev. 10)

**O que é:** registro do **PCC** de torra/secagem, preenchido pelo operador do forno, por lote.

Cabeçalho: produto, peneira, lote, cliente, embalagem.
Linhas (até 34 por folha): data, hora, **temperatura de saída do forno (PCC mín. 60 °C)**, temperatura de entrada, inversor de frequência da dosadeira (Hz), **umidade final (PCC máx. 13 %)**, nº da embalagem, responsável.
Rodapé: observações de ocorrências e **validação da Qualidade**.

**No sistema hoje:** `qualidade.monitoramentos` + `pontos_controle` com CCP-01 "Temperatura de secagem" 60–80 °C e CCP-02 "Umidade do produto ensacado" **máx. 14 %**.
**⚠ Divergência:** a planilha diz **13 %**, o sistema está com **14 %**. A Qualidade precisa confirmar qual vale.
**Falta:** leitura agrupada (temp. saída + entrada + Hz + umidade + nº embalagem numa linha só, por lote), validação da Qualidade no fim do lote.
**Proposta:** tela "Monitoramento do forno" por lote, uma linha por leitura; valor fora do limite fica vermelho e pede ação corretiva na hora; botão "Validar" só para Qualidade.

---

## 5. FOR PQSA 08 1.2 / 1.3 — Controle de retidos e resíduos (Ver 00)

Planilha mais pesada (**~780 linhas** de retidos desde dez/2025). Abas:

### 5a. Controle de retidos / reprocesso
Dados da produção: turno, data de produção, produto, lote, lacre, embalagem (big bag/sacaria), quantidade (kg), onde pode ser reprocessado, descrição da ocorrência, shelf life (anos), data limite.
Dados do reprocesso: colaborador do laboratório, status (Reprocessado / em estoque…), data do reprocesso, **lote final** (lote onde entrou), horário da diluição, turno, colaborador da secagem.

### 5b. Legenda — códigos de desvio
Tabela padronizada, cada código já diz **onde pode reprocessar**:

| Grupo | Códigos |
|---|---|
| Start de linha — mescla | RF-MESCL-001/002/003 (003 = **não reprocessa**) |
| Start de linha — cor/pontos | RF-COR-001/002, RF-PP-001, RF-PI-001 |
| Umidade | PR-UM-001 (>5 %), PR-UM-002 (>12 %) |
| Cor no processo | PR-COL-001…004 |
| Processo contínuo | PR-GRAN-001, PR-PES-001, PR-ACZ-001, PR-RASG-001, PR-TOR-001 |
| Armazenamento | ARM-UM-TRAD-002, ARM-IDNT-001, ARM-SENS-001 (a aba de totais ainda cita ARM-UM-TRAD-001, ARM-UM-ESP-001, ARM-PG-001) |

### 5c. Controle de resíduos (FOR PQSA 08 1.3)
Produto que **não volta** ao processo (varredura, contaminação química, bolor, bag rasgado): data, produto, lote, lacre, kg, desvio/motivo, status. Aba separada para o **evento climático de 14/12/2025**.

### 5d. Retido para tipo 2
Produto desclassificado: data, produto, lacre, kg, destino (TIPO 02), lote, status.

### 5e. Totais
"Qt produto em estoque" e "Qt por desvio" — **a aba por desvio está quebrada (#REF!)**, ou seja, hoje não existe indicador confiável por código.

**No sistema hoje:** `producao.reprocessos` (lote, produto, bags, kg, motivo, origem, NC, status, destino, data, resolvido_em) e a tela Reprocesso.
**Falta:** lacre, embalagem, código de desvio (com a tabela da legenda), shelf life/data limite, **lote final** (rastreio de qual lote recebeu o retido), horário de diluição, colaboradores lab/secagem, destinos "Resíduo" e "Tipo 2".
**Proposta:** um só registro de **Retido** com destino = Reprocesso | Resíduo | Tipo 2 (em vez de 3 planilhas). Código de desvio em lista, já sugerindo onde reprocessar e bloqueando quando "não reprocessa". Ao reprocessar, escolher o **lote final** → rastreabilidade de ida e volta para auditoria. Totais por produto e por desvio calculados (substitui as abas com #REF!). Importar as ~780 linhas históricas.

---

## Resumo do lote 1

| Planilha | Já existe no sistema | Ação |
|---|---|---|
| Ficha de descarga | Chegada da carga (parcial) | Acrescentar campos |
| Checklist de carga | inspeções + motor de checklist | Cadastrar itens e ligar à chegada |
| Homologação | homologacoes (só status) | Construir questionário |
| Forno (PCC) | pontos de controle genéricos | Tela dedicada + **confirmar 13 % vs 14 %** |
| Retidos/resíduos | reprocessos (parcial) | Ampliar + códigos de desvio + importar histórico |

**Padrão que aparece:** quase tudo se pendura em dois eixos — **a carga (chegada)** e **o lote**. Se mantivermos isso, a auditoria consegue ir de um big bag até o produtor e a inspeção da carga.

## Dúvidas para a Qualidade
1. Umidade final do forno: **13 %** (planilha) ou **14 %** (sistema)?
2. Checklist de carga com item NC: só alerta, ou já abre NC automaticamente?
3. Homologação: tem validade (ex.: refazer a cada 12 meses)?
4. Retidos: os códigos ARM-UM-TRAD-001, ARM-UM-ESP-001 e ARM-PG-001 ainda valem? (estão nos totais mas não na legenda)
5. Importar o histórico de retidos/resíduos (inclusive o evento climático)?

*Aguardando o próximo lote de planilhas para compilar.*
