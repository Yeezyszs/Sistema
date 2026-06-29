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
