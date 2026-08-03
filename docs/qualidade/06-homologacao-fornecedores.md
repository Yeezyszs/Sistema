# Brief — Homologação de Fornecedores (integração ao ERP)

> Documento de partida para o Claude Code **neste repositório** (`Sistema`).
> Descreve **o que construir** e **em que ordem** para trazer a gestão documental
> de homologação de fornecedores para dentro do ERP/MES.
>
> **Princípio que rege tudo: integrar, não recriar.** Existe hoje um sistema
> standalone que resolve este problema (ver §12). Ele é **referência de regra de
> negócio**, não código para copiar. O ERP já tem fornecedores, homologações,
> documentos e Storage — este brief **estende** o que existe. Nenhuma tabela,
> tela ou paleta do standalone deve ser trazida como está.
>
> O que está em "Fora de escopo" (§11) não deve ser implementado, mesmo que
> pareça uma boa ideia.

---

## 1. Contexto

- **Empresa:** Indústria e Comércio Alimentos Sumaré (fécula/farinha de mandioca).
- **Dono do processo:** Qualidade (SGSA), com apoio de Compras.
- **Lente:** **segurança de alimentos / FSSC 22000** — alvará, licenças sanitária
  e ambiental, AVCB, food grade, certificações, laudos. **Não** é compliance
  fiscal: CND, FGTS e CNDT ficam de fora.
- **Fonte documental:** planilha `FOR-POP 7 2.0 — Matriz de Fornecedores + Base
  de Documentações`, já catalogada como **FOR-10** em
  [`02-fornecedores-recebimento.md`](./02-fornecedores-recebimento.md). Este brief
  é a implementação daquele item.
- **Problema a resolver:** hoje o ERP registra homologação como uma **decisão
  manual** (`qualidade.homologacoes.status`) e aceita laudos avulsos. Falta o
  **checklist documental por atividade** — quais documentos cada tipo de
  fornecedor precisa entregar, quais estão em dia, quais venceram — e o **alerta
  de vencimento**.
- **Operação:** 100% interna. O usuário de Qualidade/Compras cadastra o
  fornecedor, sobe os documentos e informa as validades. **Não há portal do
  fornecedor.**

---

## 2. O que JÁ existe no ERP — **não recriar**

Antes de escrever qualquer migration, leia estes artefatos. Recriar qualquer um
deles é erro.

### Banco

| Objeto | Onde | O que é |
| --- | --- | --- |
| `core.fornecedores` | `20260626120001_core_schemas_e_rls.sql` | Dados-mestre: `razao_social`, `cnpj`, `tipo` (`fornecedor \| produtor_rural \| transportadora`), `homologado` (bool) |
| `qualidade.homologacoes` | `20260626120018_fase3_...sql` | Decisão de qualificação: `status` (`em_analise \| qualificado \| desqualificado`), `pontuacao`, `classificacao`, `validade` |
| `qualidade.avaliacoes_fornecedor` | `20260626120018` | Avaliação periódica de desempenho (critérios em `jsonb`) |
| `qualidade.documentos_fornecedor` | `20260717120000_qualidade_documentos_fornecedor.sql` | Documentos/laudos com `validade`, `resultado` (`aprovado\|reprovado\|pendente`), `arquivo_path` |
| `qualidade.inspecoes_recebimento` | `20260626120018` | Inspeção de MP/pallets/embalagem no recebimento |
| Bucket `fornecedores` | `20260717120000` | Storage **privado** dos PDFs, com políticas para `authenticated` |
| `qualidade.homologacao_atualiza_fornecedor()` | `20260626120018` / `20260717120000` | Trigger que sincroniza `core.fornecedores.homologado` a partir de `homologacoes.status` |
| `core.set_org_id()` · `core.current_org()` | `core` | Multi-tenant: trigger de `org_id` + função usada na RLS |

### Domínio e front

| Artefato | Caminho |
| --- | --- |
| Entidade `Fornecedor` | `packages/domain/src/entities/Fornecedor.ts` |
| Entidade `DocumentoFornecedor` | `packages/domain/src/entities/DocumentoFornecedor.ts` |
| Módulo `fornecedores` (permissão) | `packages/domain/src/value-objects/Perfil.ts` — já em `MODULO` e no perfil `qualidade` |
| Tela | `apps/web/src/features/fornecedores/FornecedoresPage.tsx` — abas **Inspeções de recebimento** e **Homologação** |
| Rota | `/fornecedores`, com `<ModuloGuard modulo="fornecedores">` em `apps/web/src/app/App.tsx` |
| Item de menu | grupo **Suprimentos** em `apps/web/src/app/Layout.tsx` ("Fornecedores & QA") |
| Acesso a dados | funções em `apps/web/src/lib/db.ts` (`listHomologacoes`, `enviarDocumentoFornecedor`, `urlAssinadaDocumento`…) |

---

## 3. O que falta — escopo deste brief

1. **Catálogo de segmentos** (a atividade que carrega o checklist: "Controle de
   pragas", "Calibração", "Transportadora"…).
2. **Catálogo de documentos exigidos** por segmento, com exigência
   `obrigatorio | condicional`.
3. **Vínculo fornecedor ↔ segmentos** (N:N — um fornecedor pode atuar em vários).
4. **Status documental calculado** no Postgres a partir do checklist.
5. **Múltiplos arquivos vigentes** para um mesmo tipo de documento.
6. **Exclusão de documento lançado errado** (soft delete com motivo).
7. **Alerta de vencimento** (rotina diária + e-mail ao responsável).
8. **Aba de Homologação reformulada** na tela que já existe, mostrando o checklist.

---

## 4. Decisões de integração (já resolvidas — siga-as)

### 4.1 Dois status, que **não** se confundem

Esta é a decisão mais importante do brief. O ERP e o sistema standalone chamam de
"status" coisas diferentes:

| | Significado | Origem | Onde vive |
| --- | --- | --- | --- |
| **Status documental** | "a papelada exigida está em dia?" | **Calculado** pelo checklist | novo: `qualidade.status_documental_fornecedor()` |
| **Status de homologação** | "a Qualidade qualificou este fornecedor?" | **Decisão humana**, com pontuação e parecer | `qualidade.homologacoes.status` (já existe) |

**Regras:**

- O status documental **não** grava em `homologacoes.status` nem em
  `core.fornecedores.homologado`. O trigger existente continua mandando neles —
  **não altere `homologacao_atualiza_fornecedor()`**.
- A tela mostra os dois lado a lado. São informações complementares: um
  fornecedor pode estar `qualificado` e com documentação vencida — e é
  exatamente esse o caso que o sistema precisa evidenciar.
- Ao registrar uma nova homologação com status `qualificado`, se o status
  documental não estiver `ok`, **avisar** o usuário (texto claro no modal). Não
  bloquear: o sistema é painel, informa e não trava a decisão.

### 4.2 Estender `documentos_fornecedor`, **não** criar tabela nova

A tabela `qualidade.documentos_fornecedor` já guarda arquivo, validade e
resultado. Adicione colunas a ela (§5.4). Criar uma segunda tabela de documentos
fragmentaria o histórico e quebraria a tela atual.

### 4.3 Multi-tenant desde a primeira linha

Toda tabela nova **obrigatoriamente**:

- tem `org_id uuid not null references core.organizacoes(id)`;
- tem `create trigger trg_set_org_id before insert ... execute function core.set_org_id()`;
- tem RLS habilitada com a policy padrão da casa:

```sql
create policy tenant_isolation on qualidade.<tabela>
  for all to authenticated
  using (org_id = core.current_org())
  with check (org_id = core.current_org());
```

O sistema standalone é single-tenant e **não** tem isso. Não copie o modelo dele.

### 4.4 O documento conta como válido quando…

Combina a regra do standalone com o campo `resultado` que já existe no ERP:

> existe documento **vigente** (`is_atual`), **não excluído**, com
> `resultado <> 'reprovado'` e — se o tipo controla validade —
> `validade >= current_date`.

---

## 5. Modelo de dados

Schema `qualidade`. Nomes em **pt-BR**. Toda tabela com `id uuid pk default
gen_random_uuid()`, `org_id`, `created_at timestamptz default now()` e
`created_by uuid references core.usuarios(id)`, salvo indicação.

### 5.1 `qualidade.segmentos_fornecedor`
A atividade que carrega o checklist.
- `nome text not null`
- `categoria text not null check (categoria in ('produto','servico','equipamento','transporte'))`
- `ativo boolean not null default true`

### 5.2 `qualidade.documentos_exigidos`
Catálogo único de tipos de documento. **Este nome já foi definido no FOR-10** —
mantenha-o.
- `nome text not null`
- `tem_validade boolean not null default false` — liga o monitoramento de vencimento
- `origem text not null default 'fornecedor' check (origem in ('fornecedor','interno'))`
- `permite_multiplos boolean not null default false` — aceita vários arquivos vigentes
- `ativo boolean not null default true`

### 5.3 `qualidade.segmento_documentos`
Checklist por segmento.
- `segmento_id uuid not null references qualidade.segmentos_fornecedor(id) on delete cascade`
- `documento_exigido_id uuid not null references qualidade.documentos_exigidos(id) on delete cascade`
- `exigencia text not null check (exigencia in ('obrigatorio','condicional'))`
- `unique (segmento_id, documento_exigido_id)`

### 5.4 `qualidade.fornecedor_segmentos`
Vínculo N:N.
- `fornecedor_id uuid not null references core.fornecedores(id) on delete cascade`
- `segmento_id uuid not null references qualidade.segmentos_fornecedor(id) on delete cascade`
- `unique (fornecedor_id, segmento_id)`

### 5.5 Alterações em `qualidade.documentos_fornecedor`

```sql
alter table qualidade.documentos_fornecedor
  add column if not exists documento_exigido_id uuid references qualidade.documentos_exigidos(id),
  add column if not exists is_atual        boolean not null default true,
  add column if not exists excluido_em     timestamptz,
  add column if not exists excluido_por    uuid references core.usuarios(id),
  add column if not exists motivo_exclusao text;
```

- `documento_exigido_id` é **nullable**: os laudos já cadastrados não pertencem a
  nenhum item de checklist e continuam válidos como estão.
- Índice parcial para as consultas quentes:

```sql
create index if not exists idx_docforn_vigentes
  on qualidade.documentos_fornecedor (fornecedor_id, documento_exigido_id)
  where is_atual and excluido_em is null;
```

### 5.6 `qualidade.alertas_documento_enviados`
Evita reenviar o mesmo alerta todo dia.
- `documento_id uuid not null references qualidade.documentos_fornecedor(id) on delete cascade`
- `tipo text not null check (tipo in ('proximo_vencimento','vencido'))`
- `enviado_em timestamptz not null default now()`
- `unique (documento_id, tipo)`

---

## 6. Regras de negócio

Todas as regras críticas moram no **Postgres**, como já é a convenção do repo
(ex.: gate `liberar_lote`). O front **consome**, não recalcula.

### 6.1 Versionamento e múltiplos arquivos

Trigger `before insert` em `documentos_fornecedor`: ao inserir um documento
vigente cujo tipo **não** permite múltiplos, marcar os anteriores do mesmo
`(fornecedor_id, documento_exigido_id)` como `is_atual = false`. Se o tipo
permite múltiplos, todos convivem vigentes.

**Nunca apagar versão antiga.** Substituir arquiva; não deleta.

Tipos que nascem com `permite_multiplos = true`: ficha técnica, laudo de
migração, laudo de análise, certificações.

### 6.2 Estado de cada item do checklist

Função `qualidade.checklist_fornecedor(p_fornecedor_id uuid)` retornando uma
linha por documento exigido (união dos segmentos do fornecedor; `obrigatorio`
prevalece sobre `condicional` quando o mesmo tipo aparece em vários segmentos):

| Estado | Quando |
| --- | --- |
| `faltando` | nenhum arquivo vigente |
| `ok` | tipo sem validade, **ou** ao menos um arquivo dentro do prazo |
| `aguardando` | há arquivo, o tipo tem validade e a data não foi informada |
| `vencido` | há arquivos com data e **todos** já venceram |

Regra dos tipos com múltiplos arquivos: **basta um válido**. É consistente com
"existe documento vigente e não vencido".

A função deve devolver também os arquivos vigentes agregados (`jsonb`), para a
tela listar e permitir excluir cada um.

### 6.3 Status documental do fornecedor

Função `qualidade.status_documental_fornecedor(p_fornecedor_id uuid)`:

1. Montar o checklist **obrigatório** (condicionais **não** entram).
2. Sem nenhum documento → `sem_documentos`.
3. Todos os obrigatórios `ok` → `ok`.
4. Caso contrário → `pendente`.

Materialize o resultado onde for necessário para listagem (coluna em
`core.fornecedores` **não** — evite alterar a tabela de dados-mestre; prefira uma
função de conjunto `qualidade.status_documental_geral()` que devolve todos os
fornecedores de uma vez, para alimentar listagem e painel com **uma** consulta).

### 6.4 Exclusão de documento lançado errado — **soft delete**

Função `qualidade.excluir_documento_fornecedor(p_documento_id uuid, p_motivo text)`:

- **motivo obrigatório** — rejeitar vazio com `raise exception`;
- grava `excluido_em = now()`, `excluido_por = auth.uid()`, `motivo_exclusao`, `is_atual = false`;
- se era o vigente de um tipo **single**, promove a versão anterior não excluída;
- o registro **permanece** no banco: a rastreabilidade é requisito de auditoria
  FSSC 22000. Nunca faça `delete` físico.

Todas as consultas de documento passam a filtrar `excluido_em is null`.

### 6.5 Alertas de vencimento

Rotina diária que seleciona documentos vigentes, não excluídos, com
`tem_validade` e `validade` entre hoje e hoje+30 (`proximo_vencimento`) ou
`< hoje` (`vencido`); para cada, se ainda não houver registro em
`alertas_documento_enviados`, envia e-mail ao responsável interno e grava.

E-mail objetivo: fornecedor, documento, data de vencimento, estado. Sem link
para o fornecedor.

> **Atenção:** o repo **ainda não usa `pg_cron` nem Edge Functions**. Esta é a
> primeira. Introduza a extensão e a função em migration própria, isolada, e
> deixe a chave do provedor de e-mail em variável de ambiente (`.env.example`).
> Se o agendamento não puder ser habilitado no projeto, entregue a função SQL
> pronta e documente como agendar — não deixe pela metade sem avisar.

---

## 7. Telas

**Não crie tela nova.** Tudo entra em
`apps/web/src/features/fornecedores/FornecedoresPage.tsx`, que já tem abas.

### 7.1 Aba "Homologação" (reformular)
Lista de fornecedores com: razão social, tipo, **status de homologação** (pill),
**status documental** (pill, paleta distinta), próximo vencimento. Filtros por
status e busca por nome/CNPJ.

### 7.2 Detalhe do fornecedor (expandir ou modal)
- Dados, segmentos vinculados, homologação vigente.
- **Checklist**: cada documento exigido com estado, exigência, validade e a lista
  de arquivos vigentes.
- Ações por item: **enviar / substituir / + adicionar arquivo** (conforme
  `permite_multiplos`), **ver** (URL assinada), **excluir** (modal com motivo
  obrigatório), **histórico** de versões.

### 7.3 Nova aba "Catálogo"
CRUD de `segmentos_fornecedor` e `documentos_exigidos` + montagem do checklist
(associar documentos ao segmento com exigência). Restrito ao perfil `gestao`.

### 7.4 Painel
Acrescentar ao `PainelPage` um bloco de documentos vencidos / vencendo em 30
dias, seguindo o padrão dos blocos que já existem.

> **Se a consulta do checklist falhar, a tela não pode exibir "tudo em dia".**
> Mostre o erro. Num painel de compliance, afirmar conformidade a partir de uma
> consulta que falhou é pior do que não mostrar nada.

---

## 8. Onde cada coisa vai

```
packages/domain/src/entities/
  SegmentoFornecedor.ts        # Segmento, CategoriaSegmento + labels
  DocumentoExigido.ts          # DocumentoExigido, Exigencia, EstadoItemChecklist + labels
  DocumentoFornecedor.ts       # ESTENDER: is_atual, excluido_*, documento_exigido_id
  index.ts                     # exportar os novos

apps/web/src/
  lib/db.ts                    # ESTENDER com as funções de acesso (padrão da casa)
  features/fornecedores/
    FornecedoresPage.tsx       # abas Inspeções | Homologação | Catálogo
    ChecklistFornecedor.tsx    # componente do checklist + upload + exclusão
    CatalogoFornecedores.tsx   # CRUD de segmentos e documentos exigidos

supabase/migrations/
  20260803120000_qualidade_homologacao_catalogo.sql    # 5.1–5.4 + RLS + grants
  20260803120001_qualidade_documentos_checklist.sql    # 5.5 + trigger de versionamento
  20260803120002_qualidade_checklist_funcoes.sql       # 6.2–6.4
  20260803120003_qualidade_alertas_vencimento.sql      # 5.6 + 6.5

supabase/seed/
  homologacao_catalogo.sql     # catálogo inicial (§9)
```

---

## 9. Catálogo inicial (seed)

Fonte: `FOR-POP 7 2.0`. Deixar em arquivo editável — é ponto de partida, a
Qualidade refina depois. O conteúdo completo (33 tipos de documento, 20
segmentos e 4 checklists de exemplo) está pronto no repositório de referência
(§12), em `supabase/seed/seed.sql` — **traduza** para os nomes de tabela deste
brief, não copie o arquivo.

- **Categorias:** `produto`, `servico`, `equipamento`, `transporte`.
- **Segmentos (20):** Laboratório de análises, Controle de pragas, Serviços
  ambientais, Limpeza de caixa d'água, Consultoria em segurança de alimentos,
  Refeição coletiva, Higienização de big bags, Coleta e destinação de resíduos,
  Calibração, Matéria-prima/produtor rural, Produtos químicos (caldeira, água
  potável, higienização), Lubrificantes, Embalagens primárias, Filme
  stretch/sacos, EPIs, Equipamentos, Material de manutenção, Transportadora.
- **Documentos (33):** alvará, licenças sanitária e ambiental, AVCB, responsável
  técnico, ficha técnica, FISPQ, food grade/NSF, controle de pragas, ISO 17025,
  certificações ISO/FSSC/BPF/NSF, laudos de análise e migração, calibração
  RBC/Inmetro, declarações (OGM/alérgenos, legislação), formulários internos
  FOR-POP, IBAMA, ATTIPP, ART, MTR, etc.
- **Checklists de exemplo:** Calibração, Controle de pragas, Transportadora,
  Matéria-prima/produtor rural.

---

## 10. Ordem de implementação (milestones)

| # | Escopo | Entregável |
| --- | --- | --- |
| 1 | **Catálogo** — migrations 5.1–5.4 + seed | Tabelas com RLS + dados iniciais |
| 2 | **Documentos** — 5.5 + trigger de versionamento | `documentos_fornecedor` estendida, múltiplos arquivos funcionando |
| 3 | **Funções** — 6.2, 6.3, 6.4 | Checklist, status documental e exclusão testados com casos de borda |
| 4 | **Domínio** — entidades em `packages/domain` | Tipos exportados |
| 5 | **Catálogo (UI)** — aba Catálogo | CRUD + montagem do checklist |
| 6 | **Checklist (UI)** — aba Homologação | Upload, substituir, adicionar, excluir, histórico |
| 7 | **Painel** | Bloco de vencimentos |
| 8 | **Alertas** | Rotina diária + e-mail |

Cada milestone entra em **um commit**, com `pnpm typecheck` e `pnpm build`
passando. Não empilhe milestones num commit só.

**Casos de borda a testar no milestone 3** (foram todos exercitados no sistema de
referência e cada um pegou um bug real):

- fornecedor sem nenhum documento → `sem_documentos`;
- obrigatório faltando → `pendente`; obrigatório vencido → `pendente`;
- condicional faltando **não** impede `ok`;
- tipo multi com 1 vencido + 1 válido → item `ok`;
- excluir o válido → item vira `vencido`;
- excluir o vigente de um tipo single → a versão anterior volta a ser vigente;
- motivo de exclusão vazio → exceção;
- documento `resultado = 'reprovado'` **não** satisfaz o item.

---

## 11. Convenções obrigatórias

- **Migrations:** `AAAAMMDDHHMMSS_escopo_descricao.sql`, sempre aditivas.
  Nunca editar migration já aplicada.
- **Multi-tenant:** `org_id` + `core.set_org_id()` + RLS `tenant_isolation` em
  toda tabela nova. `grant select, insert, update, delete ... to authenticated`.
- **Grants de função:** funções `security definer` devem ser revogadas de `anon`
  **explicitamente** (`revoke execute on function ... from anon`). O Supabase
  concede `EXECUTE` a `anon` por default privileges — `revoke from public`
  **não** basta. Trigger functions não devem ser executáveis pela API.
- **Domínio:** tipos em `packages/domain`, importados por api e web. A regra de
  dependência do repo vale: `web` importa **só** tipos de `domain`.
- **Acesso a dados no front:** funções em `lib/db.ts` + `useAsync`. **Não**
  introduza camada de repositórios/interfaces no `web` — o standalone usa esse
  padrão, este repo não.
- **UI:** usar `components/ui` (`PageHeader`, `Card`, `Button`, `Field`,
  `TextInput`, `Select`, `Modal`, `EmptyState`, `Spinner`), `components/icons` e
  `useToast`. Não criar um segundo design system.
- **Cores:** a marca do ERP é o **azul `brand-*` (#000F89)**. O sistema de
  referência usa verde `#1F5B3F` — **não traga essa paleta**. Status e severidade
  seguem o que já está em uso no repo (`sucesso`/`alerta`/`erro`).
- **Idioma:** tabelas, colunas, enums e código em pt-BR.
- **Testes:** o que tem regra (funções SQL de checklist e status) precisa dos
  casos do §10.

---

## 12. Fora de escopo (não implementar)

- **Portal do fornecedor** — nenhum acesso externo; quem sobe documento é o
  usuário interno.
- **Curadoria em duas etapas** (aprovar/rejeitar o documento como fluxo). O campo
  `resultado` já existe e é preenchido por quem cadastra; não construir workflow
  de aprovação em cima dele.
- **Análise de risco APPCC completa** (severidade × probabilidade). O FOR-10
  prevê `qualidade.riscos_fornecimento` — é **outro** item, não entra aqui.
- **Risco alterando o checklist** — o checklist é definido pelo segmento, ponto.
- **Migrar o banco do sistema standalone.** O ERP é a fonte da verdade; o
  standalone tem 1 fornecedor de teste. Recadastrar é mais barato e mais seguro
  do que migrar entre projetos e modelos diferentes.
- **Trocar o status manual de homologação por cálculo automático.** Ver §4.1.
- Compra emergencial, integração com ERP externo, bloqueio de compra.

---

## 13. Referência: o sistema standalone

Implementação completa e funcionando do mesmo problema, single-tenant:

- **Repositório:** `Yeezyszs/Homologa-o`
- **Serve como:** referência de **regra de negócio** e de **casos de borda** —
  principalmente `supabase/migrations/` (funções de checklist, status,
  versionamento e soft delete) e `supabase/seed/seed.sql` (catálogo real).
- **Não serve como:** fonte de código para copiar. Ele é single-tenant, tem
  paleta e design system próprios, usa camada de repositórios no front e nomeia
  as tabelas sem schema. Tudo isso conflita com as convenções deste repo.

Diferenças que **precisam** ser traduzidas, não copiadas:

| Standalone | Aqui |
| --- | --- |
| `fornecedores` (schema public) | `core.fornecedores` (já existe, multi-tenant) |
| sem `org_id` | `org_id` + `core.current_org()` em tudo |
| `tipos_documento` | `qualidade.documentos_exigidos` |
| `segmentos` | `qualidade.segmentos_fornecedor` |
| `documentos` | `qualidade.documentos_fornecedor` (estender) |
| status calculado sobrescreve o do fornecedor | dois status independentes (§4.1) |
| RLS `using (true)` para autenticado | `tenant_isolation` por `org_id` |
| repositórios + interfaces no front | funções em `lib/db.ts` |
| verde `#1F5B3F` | azul `brand-*` (#000F89) |
