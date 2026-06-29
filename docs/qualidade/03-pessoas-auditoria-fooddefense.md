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
