# Reformulação da Qualidade — Levantamento, lote 2

Arquivos analisados (5): FOR PQSA 11 1.2 (detector de metais), FOR PQSA 09 1.3 (ímãs), FOR POP 14 1.1 (checklist de expedição), Laudo interno físico-químico, FOR POP 08 1.6 (teste de rastreabilidade — .docx).

---

## 1. FOR PQSA 11 1.2 — Verificação do detector de metais (Ver 02)

Uma folha por detector/linha por mês (este é o **DM 1 — Ensaque 01**).

**Quando testar** (regras do próprio formulário):
- início e fim da produção, **a cada 2 h**, após parada > 8 h, a cada troca de produto, após manutenção no detector;
- sem produção → registrar **"NHP"** no horário;
- troca de produto → anotar horário e novo produto em observações;
- tolerância de **15 min** no horário do teste.

**Linha do registro:** data, horário, tipo de teste (início / após parada / após manutenção / troca de produto · durante · final), resultado para cada corpo de prova — **ferroso 1,2 mm, não ferroso 1,2 mm, inox 1,5 mm** — como *Detecta, alarma e rejeita* ou *Não detecta*, operador.
Bloco da Qualidade: reteste com **ferroso 1,5 / não ferroso 1,5 / inox 1,5 mm** e validação.

**Verso — atividade de correção:**
- Falha num corpo de prova: líder informado, linha parada?, manutenção informada?, produção do período **retida**?, precisou validar o equipamento?, responsável CQ pela retenção.
- **Mais de 5 partículas metálicas em 1 hora**: líder informado, investigação, produção da hora retida?, responsável CQ.
- Manutenção corretiva: hora início/fim, causa, correção, manutentor.

**No sistema hoje:** `detectores_metais` (linha, ferroso/não ferroso/inox mm) e `verificacoes_dm` (tipo de teste, 3 resultados, conforme, ação corretiva, lote).
**Falta:** NHP; alerta quando passar 2 h + 15 min sem teste; validação da Qualidade; formulário de correção do verso; contagem de rejeições/hora (regra das 5 partículas); vínculo com O.S. de manutenção.
**Proposta:** falha → abre a correção na hora, pergunta "reter produção desde o último teste OK?" e já cria o **retido** (lote 1 §5) com os lotes do período. Manutenção do verso vira **O.S.** (já existe com risco à segurança de alimentos).

---

## 2. FOR PQSA 09 1.3 — Verificação e limpeza dos ímãs (Ver 01/02)

Frequência **1× ao dia** (início ou fim de turno, ou com setor parado). Sem produção → **NHP**. Nenhum campo pode ficar em branco.

Pontos de ímã por área (abas):

| Área | Pontos |
|---|---|
| Extração | PPRO 1 — Saída do lavador (rosca 1 e rosca 2); PPRO 2 — Entrada da cevadeira |
| Secagem | Forno 1, Resfriador 1, Forno 2, Resfriador 2 |
| Ensaque 01 | Saída da caixa do padronizador, Saída do padronizador, Moinho, Bocal de saída do bag |
| Ensaque 02 | Peneira 1, 2, 3, Bocal de saída do bag, Rosca do moinho, Rosca da saída das peneiras |
| PPROs (resumo) | PPRO 1 Extração esteira, PPRO 2 Desintegração/moagem, PPRO 3.1/3.2 Saída forno 1/2, PPRO 4.1/4.2 Resfriador 1/2 |

**Linha:** data, hora, local, peso (g), material encontrado (sim/não + qual), ação corretiva, responsável. Rodapé: observação + **validação da Qualidade**.

**No sistema hoje:** `imas` (setor, local) e `verificacoes_ima` (peso, material, ação, responsável).
**Falta:** cadastrar os ~20 pontos acima; NHP; "material sim/não"; validação da Qualidade; aviso de ponto sem verificação no dia.
**Proposta:** tela por área com todos os pontos do dia numa grade — o operador preenche em sequência; ponto em branco fica pendente no painel.

---

## 3. FOR POP 14 1.1 — Checklist de expedição (Ver 05)

A **cada carregamento**. Responsável: **Logística**, com inspeção final da **Qualidade**.

Cabeçalho: data, horário, NF, cliente, produto, lote, quantidade (kg), placa, motorista, transportadora, **último produto transportado**.

| Seção | Quem | Itens |
|---|---|---|
| 1. Inspeção veicular | Logística | limpo; sem indício de químicos; sem indício de alérgenos; vedado (sem infiltração); pallets íntegros e secos |
| 2. Produto | Logística | inspecionado em todas as etapas; etiquetas (data, lote, validade, produto) batem com o pedido; bags lacrados e identificados; sobre pallets limpos; bags inspecionados em todas as faces |
| 3. Inspeção veicular | Qualidade | limpo; sem indício de alérgenos; sem odores |
| 4. Produto | Qualidade | bags limpos/sem rasgo; sem contaminantes/pragas; sem odor; **acompanha laudo?** (com N/A) |

Resultado: **Aprovado / Aprovado com restrição** (exige justificativa + responsável) **/ Reprovado**; responsável pela liberação.

**No sistema hoje:** tela de Expedição (pedidos/posições) — sem checklist.
**Falta:** tudo do checklist.
**Proposta:** checklist dentro do carregamento da Expedição (cabeçalho preenchido sozinho com pedido/NF/cliente/lote). Seções 1–2 para Logística, 3–4 só para Qualidade. **Carga só sai com "Aprovado"**; "Acompanha laudo?" verifica se o lote tem laudo interno emitido.

---

## 4. Laudo interno físico-químico (modelo — Farinha crua)

Cabeçalho da empresa; produto; lote, quantidade, fabricação, validade (shelf life 1 ano).

| Ensaio | Unidade | Referência | Metodologia |
|---|---|---|---|
| Teor de umidade | % base úmida | máx. 5,0 % | IN MAPA 52/2011 (estufa 105 °C) |
| Granulometria peneira 10 | % | vazar 100 % | IN MAPA 52/2011 |
| Granulometria peneira 18 | % | reter máx. 10 % | IN MAPA 52/2011 |
| Granulometria peneira 200 (fundo) | % | vazar máx. 3,0 % | IN MAPA 52/2011 |
| Acidez | % | máx. 3,0 % | IN MAPA 52/2011 (titulável) |

Microbiológicas: laboratório externo acreditado ISO/IEC 17025.

**No sistema hoje:** `laudos_internos` + `laudo_resultados` (ensaio, resultado, unidade, limites, conforme) e especificações por produto. Já cobre a estrutura.
**Falta:** coluna de metodologia; tipo de limite "vazar/reter"; anexar o laudo micro externo; PDF no layout da empresa.
**⚠ Conferir o modelo:** no exemplo, umidade **9,5 %** com referência **máx. 5,0 %** e fundo **96,31 %** com "vazar máx. 3,0 %" — ou o modelo tem valores de teste, ou a referência está trocada. Também conflita com o forno (13 %) e o sistema (14 %). **A Qualidade precisa fixar os limites de umidade por produto.**

---

## 5. FOR POP 08 1.6 — Teste de rastreabilidade e recolhimento (.docx)

O documento que mostra o **objetivo final** de tudo: provar, numa auditoria, de onde veio e para onde foi um lote.

Exemplo real (lote **MH2739**, Farinha crua 5 %, General Mills):
- **Produção:** 28/08/2026, 05:30–12:03, Ensaque 2, 24 bags, big bag.
- **Para trás (MP):** NFs de entrada de 3 produtores → bags 1–14 Eduardo Rigoni (Paraguaia), 15–21 Marcos Fidelis (Paraguaia), 22–24 José Benedito Gonçalves (Olho Junto).
- **Para frente:** NF de saída 11.741, 18.000 kg vendidos.
- **Registros consultados** (10): NF de entrada · ficha de descarga · monitoramento do forno · ordem de produção (PCP nº 641) · controle de retidos · detector de metais · controle de produção do laboratório (FOR CQ 001) · checklist de expedição · NF de saída · laudo interno.
- **Tempo:** rastreabilidade em 1 h; recolhimento com o cliente — resposta em 6 min, 10.500 kg ainda no cliente; total 43 min; % de eficácia do recolhimento.

**Como o sistema deve responder:** uma tela **"Rastrear lote"** que, digitando o lote, monta sozinha esse relatório:
1. **MP:** cargas → produtor, variedade, NF de entrada, ticket, checklist de carga — **e quais bags vieram de qual carga**;
2. **Processo:** OP, horário, linha, forno (PCC), detector, ímãs do dia, retidos que entraram/saíram, análises do laboratório, laudo;
3. **Saída:** pedidos, NF, cliente, kg, checklist de expedição;
4. botão **"Registrar teste"**: hora de início/fim, contato com o cliente, kg recuperáveis, % eficácia → gera o FOR POP 08 1.6 em PDF.

**Ponto crítico:** o vínculo **bag ↔ carga de MP** (bags 1–14 → produtor X). Hoje existe `lote_recebimentos` (lote ↔ recebimento com quantidade), mas não por faixa de bag. Precisamos confirmar como a produção sabe essa divisão (por horário de descarga? por rosca/cancha?).

---

## Resumo do lote 2

| Arquivo | Já existe | Ação |
|---|---|---|
| Detector de metais | cadastro + verificações | Regras de frequência, NHP, correção → retido/O.S., validação Qualidade |
| Ímãs | cadastro + verificações | Cadastrar ~20 pontos, grade diária, NHP, validação |
| Checklist de expedição | — | Novo, dentro da Expedição; bloqueia saída sem aprovação |
| Laudo interno | estrutura completa | Metodologia, limites vazar/reter, PDF, anexo micro — **conferir limites** |
| Teste de rastreabilidade | partes soltas | Tela "Rastrear lote" que junta tudo + registro do teste |

## Ligação com o lote 1
O teste de rastreabilidade cita a ficha de descarga, o forno e os retidos (lote 1) — confirma que os dois eixos são **carga** e **lote**. Citados mas ainda não recebidos: **FOR PCP 001 (Ordem de produção)** e **FOR CQ 001 (Controle e monitoramento de produção — laboratório)**.

## Dúvidas para a Qualidade
1. Limites de umidade por produto: 5 % (laudo), 13 % (forno) ou 14 % (sistema)? E o fundo da peneira 200 no modelo está correto?
2. Como se sabe hoje que os **bags 1–14 vieram do produtor X**? (ordem de descarga, horário, cancha?)
3. Detector: além do DM 1 Ensaque 01, quantos detectores existem (Ensaque 02)? Quem conta as "5 partículas por hora" — o próprio detector tem contador?
4. Expedição "Aprovado com restrição": quem pode aprovar? Só Qualidade?
5. Podem mandar o **FOR CQ 001** e o **FOR PCP 001** no próximo lote?

*Aguardando o próximo lote para compilar.*
