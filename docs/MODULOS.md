# Módulos

Referência de tela: rota, código de módulo (o que o `ModuloGuard` e o menu
usam), pasta e principais tabelas. O código de módulo e quem o acessa estão em
`packages/domain/src/value-objects/Perfil.ts`.

---

## Painel

`/painel` · módulo `painel` · `features/painel/`

Cockpit operacional do dia: produção e rendimento de hoje, raiz recebida,
real × meta da semana, produção por linha contra a meta programada, lotes por
status, fila de "precisa de ação" por severidade, bloco comercial e bloco de
documentos vencendo.

Cada bloco lê a sua fonte. O de documentos carrega em consulta própria: se ela
falhar, mostra o erro em vez de sumir — ver `ARQUITETURA.md §3`.

---

## Produção

| Tela | Rota | Módulo | Pasta |
| --- | --- | --- | --- |
| Programação | `/programacao` | `pcp` | `features/pcp/` |
| Apontamento | `/apontamento` | `pcp` | `features/pcp/` |
| Ordens de produção | `/ordens` | `ordens` | `features/ordens/` |
| Lotes | `/lotes` | `lotes` | `features/lotes/` |
| Produtos | `/produtos` | `produtos` | `features/produtos/` |
| Retidos (reprocesso) | `/reprocesso` | `reprocesso` | `features/retidos/` |

**Programação × Apontamento.** A programação define a meta por linha e dia
(`producao.programacao`); o apontamento registra o que saiu
(`producao.apontamentos`). A coluna `programacao.real_kg` é **derivada**: o
trigger `apontamento_sync_real` a reescreve como a soma dos apontamentos
vinculados àquela linha de programação. Ela existiu por um tempo sem ninguém
alimentar, mostrando meta sem realizado — não edite à mão.

**Ordem de produção → lote.** Relação 1:1. A OP nasce, recebe o lote e a
produção começa. A OP tem impressão em paisagem, uma folha (`window.print()`
com CSS `@page`).

**Lote** tem ciclo `em_processo → aguardando_liberacao → liberado → expedido`,
mais `bloqueado` e `cancelado`. Liberar passa pelo gate `liberar_lote`, que
recusa se houver não conformidade aberta. Lote **não se apaga**: cancela.

---

## Almoxarifado

| Tela | Rota | Módulo | Pasta |
| --- | --- | --- | --- |
| Consumíveis | `/almoxarifado` | `almoxarifado` | `features/almoxarifado/` |
| Embalagens | `/embalagens` | `almoxarifado` | `features/embalagens/` |
| Pallets | `/pallets` | `pallets` | `features/pallets/` |

Consumíveis controla peças, limpeza e EPI com quantidade **e** custo
(`producao.almox_itens`, `almox_movimentos`).

Embalagens é uma tela dedicada, com o que a operação pediu: quantidade em
estoque, em uso, em reparo e em posse de terceiros, valor total em posse da
empresa e gasto com manutenção. Cada evento move a embalagem de um estado para
outro (`producao.embalagem_evento`), e a produção consome automaticamente via
`posicao_consome_embalagem`.

---

## Logística

| Tela | Rota | Módulo | Pasta |
| --- | --- | --- | --- |
| Estoque | `/estoque` | `estoque` | `features/estoque/` |
| Expedição | `/expedicao` | `expedicao` | `features/expedicao/` |

Estoque ficou aqui — é a Logística que controla os lotes armazenados.
Carregamento efetivado baixa o estoque; cancelado devolve.

---

## Suprimentos

| Tela | Rota | Módulo | Pasta |
| --- | --- | --- | --- |
| Recebimentos | `/recebimentos` | `recebimentos` | `features/recebimentos/` |
| Fornecedores & Recebimento | `/fornecedores` | `fornecedores` | `features/fornecedores/` |

**Duas abas:** inspeção de recebimento (checklist da carga que chega, por tipo)
e homologação por **nota** (0–100 → classe A–D, com validade). Guarda também os
laudos laboratoriais de matéria-prima.

> Esta homologação é a da carga e do fornecedor por avaliação. Não confundir com
> a homologação **documental**, que é outro módulo — ver abaixo.

---

## Comercial

| Tela | Rota | Módulo | Pasta |
| --- | --- | --- | --- |
| Carteira | `/carteira` | `comercial` | `features/comercial/` |
| Pedidos | `/pedidos` | `pedidos` | `features/pedidos/` |
| Análise de vendas | `/analise-vendas` | `comercial` | `features/comercial/` |
| Clientes | `/clientes` | `comercial` | `features/comercial/` |

Um produto por pedido e preço digitado por pedido — decisão tomada no
levantamento, porque a fábrica negocia caso a caso e não trabalha com tabela.

---

## Gestão de Documentos

`/gestao-documentos` · módulo `documentos` · `features/documentos/`

Homologação **documental** de fornecedores: alvará, licenças, certificações,
formulários FOR-POP 7. Nada a ver com o QA de matéria-prima em Fornecedores &
Recebimento — uma habilita o fornecedor a fornecer, a outra julga a carga que
chegou. Produtor rural fica de fora (é acompanhado pela inspeção de
recebimento).

Quatro abas:

| Aba | Conteúdo |
| --- | --- |
| Visão geral | KPIs, fila de ação por urgência, fornecedores por segmento, recentes |
| Fornecedores | Lista com busca e filtros (situação, risco), cadastro e detalhe com o checklist |
| Relatórios | Vencimentos dos próximos 6 meses, situação por segmento, exportação CSV |
| Catálogo | Segmentos, tipos de documento e a montagem do checklist — só `gestao` |

**O modelo.** O *segmento* (a atividade: "Controle de pragas", "Transportadora")
carrega o checklist. O fornecedor recebe um ou mais segmentos, e o checklist
dele é a união — com `obrigatorio` prevalecendo sobre `condicional` quando o
mesmo documento aparece em dois segmentos.

**Estado de cada item** (calculado no banco):

| Estado | Quando |
| --- | --- |
| `faltando` | nenhum arquivo vigente |
| `ok` | tipo sem validade, **ou** ao menos um arquivo dentro do prazo |
| `aguardando` | há arquivo, o tipo controla validade e a data não foi informada |
| `vencido` | há arquivos com data e **todos** já venceram |

**Situação do fornecedor:** só os obrigatórios contam. Condicional faltando não
impede `ok`.

**Substituir arquiva, não apaga.** Tipos marcados `permite_multiplos` (ficha
técnica, laudos, certificações) aceitam vários arquivos vigentes — basta um
válido. **Excluir exige motivo** e mantém o registro com autor, data e razão;
nos tipos de arquivo único, a versão anterior volta a valer.

Alerta diário de vencimento por e-mail: Edge Function `alertas-documentos`
(ver `supabase/functions/alertas-documentos/README.md`).

---

## Qualidade

| Tela | Rota | Módulo |
| --- | --- | --- |
| Qualidade (visão) | `/qualidade` | `qualidade` |
| Acompanhamento de processo | `/acompanhamento` | `acompanhamento` |
| Cloro & pH (água) | `/monitoramento-agua` | `monitoramento_agua` |
| PCC Físico | `/pcc-fisico` | `pcc_fisico` |
| PPHO & Higiene | `/ppho` | `ppho` |
| Especificações | `/especificacoes` | `especificacoes` |
| Calibração | `/calibracao` | `calibracao` |
| Calibração pHmetro | `/calibracao-phmetro` | `calibracao` |
| Insumos do laboratório | `/insumos-lab` | `insumos_lab` |
| Contraprovas | `/contraprovas` | `contraprovas` |
| Análise de risco | `/analise-risco` | `analise_risco` |
| Auditoria & PPR | `/auditoria` | `auditoria` |
| Ambiental & Pragas | `/ambiental` | `ambiental` |
| Não conformidades | `/nao-conformidades` | `nao_conformidades` |

Pontos que valem saber: falha no detector de metais **abre NC sozinha**
(`dm_falha_abre_nc`); item não conforme de auditoria também
(`auditoria_gera_ncs`); monitoramento de água e calibração de pHmetro são
classificados no insert, não na tela.

Os briefings originais que geraram estas telas estão em `docs/qualidade/`.

---

## Manutenção (PCM)

| Tela | Rota | Pasta |
| --- | --- | --- |
| Ordens de serviço | `/manutencao` | `features/pcm/` |
| Preventiva | `/preventiva` | `features/pcm/` |
| Lubrificação | `/lubrificacao` | `features/pcm/` |
| Indicadores | `/pcm-indicadores` | `features/pcm/` |
| Checklist de ferramentas | `/pcm-checklist` | `features/pcm/` |
| Cadastros | `/pcm-cadastros` | `features/pcm/` |

Todas sob o módulo `manutencao`. É o módulo com mais dado real hoje: 68
equipamentos, 391 componentes, 102 ferramentas. Indicadores calcula MTBF, MTTR e
disponibilidade a partir de paradas e horas de produção.

> Em `manutencao` existem quatro pares de nomes próximos —
> `ordens`/`ordens_servico`, `planos`/`plano_preventivo`,
> `preventiva`/`execucoes_preventiva`, `lubrificacao`/`lu_execucoes`. As oito
> estão referenciadas pelo código, então não são sobras óbvias, mas parecem duas
> gerações do mesmo conceito. Vale confirmar antes de mexer.

---

## Administração

`/usuarios` · módulo `usuarios` · `features/usuarios/`

Usuários e atribuição de perfis. Criar login envolve `auth.users` +
`core.usuarios` + `core.usuario_perfis`.

> **Armadilha conhecida:** inserir em `auth.users` por SQL deixa colunas de token
> como `NULL`, e o GoTrue não consegue ler — o login falha com "e-mail ou senha
> inválidos" sem explicar por quê. As colunas de token precisam de `''` (string
> vazia) e `identity_data` precisa de `email_verified: true`.
