# Reformulação da Qualidade — Plano de desenvolvimento

Compilação dos levantamentos dos lotes 1 e 2 (10 formulários). Os detalhes campo a campo continuam em `levantamento-lote-1.md` e `levantamento-lote-2.md`.

---

## 1. A ideia central

A auditoria pergunta uma coisa: **"de onde veio e para onde foi este lote?"** Hoje a resposta exige cruzar à mão 10 registros em papel e planilha (teste de rastreabilidade FOR POP 08 1.6: 1 h de trabalho).

Todos os formulários se penduram em **dois eixos**:

```
 CARGA DE MP ─────────────► LOTE ─────────────► CARREGAMENTO
 (chegada)                  (produção)          (expedição)
 · ficha de descarga        · forno (PCC)       · checklist de expedição
 · checklist da carga       · detector de metais· NF de saída
 · produtor homologado      · ímãs              · laudo interno
                            · retidos / resíduos
```

Regra de projeto: **cada registro nasce ligado à carga ou ao lote**. Assim, a tela "Rastrear lote" só junta o que já está ligado — nada é digitado duas vezes.

---

## 2. Inventário: formulário → onde vai no sistema

| # | Formulário | Hoje no sistema | O que fazer |
|---|---|---|---|
| 1 | FOR POP 09 1.2 Ficha de descarga | Chegada da carga (parcial) | + 5 rendas, impureza %, turno, hora |
| 2 | FOR POP 09 1.5 Checklist de carga | `inspecoes_recebimento` + motor de checklist | 6 itens dentro da Chegada; NC avisa Qualidade |
| 3 | FOR POP 07 1.1 Homologação de fornecedor | `homologacoes` (só status) | Questionário de 40 itens, bloco orgânico, agrotóxicos, anexo assinado |
| 4 | FOR PQSA 8 Monitoramento do forno | `pontos_controle` genérico | Tela por lote; PCC temp. ≥ 60 °C e umidade; validação Qualidade |
| 5 | FOR PQSA 08 1.2/1.3 Retidos, resíduos, tipo 2 | `reprocessos` (parcial) | Registro único com destino; códigos de desvio; lote final; importar ~780 linhas |
| 6 | FOR PQSA 11 1.2 Detector de metais | `detectores_metais` + `verificacoes_dm` | Frequência 2 h ± 15 min, NHP, correção → retido + O.S., validação |
| 7 | FOR PQSA 09 1.3 Ímãs | `imas` + `verificacoes_ima` | Cadastrar ~20 pontos; grade diária por área; NHP; validação |
| 8 | FOR POP 14 1.1 Checklist de expedição | — | Novo, dentro da Expedição; carga só sai aprovada |
| 9 | Laudo interno físico-químico | `laudos_internos` + `laudo_resultados` | Metodologia, limites vazar/reter, PDF, anexo micro |
| 10 | FOR POP 08 1.6 Teste de rastreabilidade | partes soltas | Tela "Rastrear lote" + registro do teste de recolhimento |

---

## 3. Padrões que valem para todos

Para não construir 10 telas diferentes, cada formulário usa as mesmas peças:

| Padrão | Onde aparece | Como fica |
|---|---|---|
| **Conforme / Não conforme / N/A** | carga, homologação, expedição | Motor de checklist já existente (`qualidade.checklists` por contexto) |
| **NHP — Não Houve Produção** | detector, ímãs | Botão "NHP" no dia/horário: conta como preenchido, não como falha |
| **Validação da Qualidade** | forno, detector, ímãs, expedição | Mesmo esquema da liberação de O.S.: botão só para o perfil qualidade, grava quem e quando |
| **Fora do limite → ação** | forno, detector, ímãs | Valor fica vermelho, exige ação corretiva e oferece "reter produção" (cria retido) |
| **Pendências no painel** | detector, ímãs, forno | "Detector sem teste há 2 h 15", "3 ímãs sem verificação hoje" |
| **Fotos/anexos** | homologação, expedição, retidos | Mesmo componente de anexos das O.S. |
| **PDF no layout do formulário** | todos | Código e versão do formulário (ex.: "FOR PQSA 8 Rev. 10") no cabeçalho, para auditoria |

---

## 4. Fases de desenvolvimento

A ordem segue o fluxo físico (carga → lote → expedição) e termina na tela que junta tudo.

### Fase 1 — Entrada da matéria-prima
1. Chegada da carga: + 5 rendas (média calculada), impureza %, turno, hora.
2. Checklist de carga (6 itens + tipo convencional/orgânica) **no mesmo registro**; item NC → alerta/NC para a Qualidade.
3. Homologação: questionário de 40 itens com N/A, bloco orgânico condicional, agrotóxicos declarados (lista permitida), anexo do documento assinado. Fornecedor só fica "Homologado" com questionário concluído.

### Fase 2 — Controles do processo (PCC / PPRO)
4. Monitoramento do forno por lote (temp. saída/entrada, Hz da dosadeira, umidade, nº embalagem) + validação.
5. Detector de metais: grade de horários, NHP, reteste da Qualidade, formulário de correção (líder, linha parada, manutenção → **O.S.**, produção retida → **retido**), regra de > 5 partículas/hora.
6. Ímãs: cadastro dos ~20 pontos por área, grade diária, NHP, validação.

### Fase 3 — Retidos, resíduos e tipo 2
7. Registro único de retido: lacre, embalagem, kg, **código de desvio** (tabela da legenda; RF-MESCL-003 bloqueia reprocesso), shelf life, destino (Reprocesso / Resíduo / Tipo 2).
8. Ao reprocessar: data, horário de diluição, colaboradores e **lote final** (rastreio de ida e volta).
9. Totais por produto e por desvio (substitui as abas com #REF!).
10. Importação do histórico (~780 retidos + resíduos + evento climático de 14/12/2025).

### Fase 4 — Saída
11. Checklist de expedição dentro do carregamento: cabeçalho automático (pedido, NF, cliente, lote, placa); seções 1–2 Logística, 3–4 Qualidade; Aprovado / Aprovado com restrição (justificativa) / Reprovado — **sem aprovação a carga não sai**.
12. Laudo interno: metodologia, limites vazar/reter, anexo micro externo, PDF; "Acompanha laudo?" da expedição verifica se existe.

### Fase 5 — Rastreabilidade
13. Tela **"Rastrear lote"**: para trás (cargas, produtores, NFs, checklists, quais bags de qual carga), processo (OP, forno, detector, ímãs, retidos, laboratório, laudo) e para frente (pedidos, NF, cliente, kg).
14. "Registrar teste": horários, contato com o cliente, kg recuperáveis, % de eficácia → PDF do FOR POP 08 1.6.

---

## 5. Decisões pendentes da Qualidade

Bloqueiam a fase indicada. Quanto antes, melhor.

| # | Pergunta | Fase |
|---|---|---|
| 1 | **Limites de umidade por produto:** laudo diz 5 %, forno 13 %, sistema 14 %. Qual vale para cada produto? O modelo de laudo (umidade 9,5 % vs máx. 5 %; fundo 96 % vs máx. 3 %) está correto? | 2 e 4 |
| 2 | **Como se sabe que os bags 1–14 vieram do produtor X?** (ordem de descarga, horário, cancha?) — elo mais crítico da rastreabilidade | 1 e 5 |
| 3 | Checklist de carga com item NC: só alerta ou abre NC automática? | 1 |
| 4 | Homologação tem validade (ex.: refazer a cada 12 meses)? | 1 |
| 5 | Quantos detectores de metais existem? As "5 partículas/hora" vêm de contador do equipamento? | 2 |
| 6 | Os códigos ARM-UM-TRAD-001, ARM-UM-ESP-001, ARM-PG-001 ainda valem? | 3 |
| 7 | Importar o histórico de retidos/resíduos? | 3 |
| 8 | "Aprovado com restrição" na expedição: só a Qualidade pode? | 4 |

**Formulários citados e ainda não recebidos:** FOR PCP 001 (Ordem de produção) e FOR CQ 001 (Controle e monitoramento de produção — laboratório). Necessários para a Fase 5.

---

## 6. Proposta para começar

**Fase 1** já pode começar: a Chegada da carga e o checklist de carga não dependem de nenhuma decisão em aberto (exceto a #3, que tem um padrão seguro — alerta agora, NC automática depois). A pergunta #2 (bag ↔ carga) deve ser respondida durante a Fase 1, porque define como a chegada se liga ao lote.
