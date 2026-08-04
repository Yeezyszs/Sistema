# Banco de dados

Projeto Supabase `xglbppuiwdfuxdmyvbix` (região BR). PostgreSQL com RLS,
Storage e Auth. 55 migrations versionadas em `supabase/migrations/`.

---

## 1. Schemas

O schema `public` está **vazio de propósito**. Tudo vive em schemas nomeados —
quem abre o Table Editor do Supabase precisa trocar o seletor de schema.

| Schema | Tabelas | O que guarda |
| --- | --- | --- |
| `core` | 10 | Dados-mestre: organizações, usuários, perfis, produtos, clientes, fornecedores, setores, equipamentos, funcionários |
| `producao` | 23 | PCP, lotes, apontamentos, estoque, pallets, pedidos, expedição, almoxarifado, reprocesso |
| `qualidade` | 42 | FSSC 22000: PCC, PPHO, NCs, laudos, especificações, calibração, contraprovas, auditoria, ambiental, homologação documental |
| `manutencao` | 17 | PCM: equipamentos, componentes, ferramentas, planos, preventiva, lubrificação, paradas, custos |

---

## 2. Multi-tenant: `org_id` + RLS

Toda tabela de dados carrega `org_id` e três peças que andam juntas:

```sql
-- 1. trigger preenche o org_id do usuário logado
create trigger trg_set_org_id before insert on <schema>.<tabela>
  for each row execute function core.set_org_id();

-- 2. RLS isola por organização
alter table <schema>.<tabela> enable row level security;
create policy tenant_isolation on <schema>.<tabela>
  for all to authenticated
  using (org_id = core.current_org())
  with check (org_id = core.current_org());

-- 3. grants
grant select, insert, update, delete on <schema>.<tabela> to authenticated;
```

`core.current_org()` lê o claim `org_id` do JWT. **Nenhuma tabela fica sem RLS**
— hoje são 92 tabelas e 107 políticas.

Exceções legítimas (catálogos globais, sem `org_id`): `core.organizacoes`,
`core.perfis`, `producao.etapas`, `qualidade.pontos_controle`.

**Pendência conhecida:** `core.produtos`, `core.setores`, `core.funcionarios` e
`core.equipamentos` têm `org_id NOT NULL` mas **não** têm o trigger. Inserir
nelas exige passar `org_id` na mão. Nenhuma tela insere nessas tabelas hoje, mas
a próxima que inserir vai quebrar se não souber disso.

---

## 3. Regras de negócio no Postgres

O front não recalcula regra. As funções abaixo são a fonte da verdade.

### Numeração sequencial
`set_op_numero`, `set_pedido_numero`, `set_nc_numero`, `set_laudo_numero`,
`set_carregamento_numero`, `set_recebimento_numero`, `set_reprocesso_numero`,
`set_auditoria_numero`, `set_contraprova_numero`, `set_analise_processo_numero`,
`set_os_numero`, `set_ordem_pcm_numero` — todas triggers `before insert`.

### Produção
| Função | Papel |
| --- | --- |
| `liberar_lote` | Gate: valida não conformidades antes de liberar |
| `apontamento_prepara` / `apontamento_sync_real` | Apontamento alimenta o "real" da programação |
| `almox_aplicar_movimento` | Entrada/saída atualiza o saldo do item |
| `embalagem_evento_aplica` | Evento move a embalagem entre estoque/uso/reparo/terceiros |
| `posicao_consome_embalagem` | Produção consome embalagem automaticamente |
| `movimento_pallet_aplica` | Movimento atualiza a posição do pallet |
| `carregamento_efetiva` / `carregamento_cancela` | Carga baixa (ou devolve) o estoque |

### Qualidade
| Função | Papel |
| --- | --- |
| `dm_falha_abre_nc` | Falha no detector de metais abre NC automaticamente |
| `auditoria_gera_ncs` | Item não conforme da auditoria vira NC |
| `monitoramento_agua_avalia` / `calibracao_phmetro_avalia` | Classificam o resultado na hora do insert |
| `homologacao_atualiza_fornecedor` | Homologação por nota marca `fornecedores.homologado` |

### Homologação documental
| Função | Papel |
| --- | --- |
| `checklist_fornecedor(uuid)` | Estado de cada item exigido: `ok` / `faltando` / `aguardando` / `vencido`, com os arquivos vigentes em `jsonb` |
| `checklist_geral()` | O mesmo para **todos** os fornecedores, numa consulta — alimenta dashboard e relatórios |
| `status_documental_fornecedor(uuid)` | `ok` / `pendente` / `sem_documentos` (só obrigatórios contam) |
| `status_documental_geral()` | Versão de conjunto, com contagem de pendências |
| `recalcular_status_documental(uuid)` | Grava o resultado em `core.fornecedores.status_documental` |
| `documento_fornecedor_versiona` | Ao inserir, arquiva a versão anterior nos tipos de arquivo único |
| `excluir_documento_fornecedor(uuid, text)` | Soft delete com motivo obrigatório; promove a versão anterior |
| `documentos_vencendo(dias)` | Vencidos e a vencer — mesma regra para painel e e-mail |
| `alertas_documento_pendentes(dias)` | O que ainda não foi avisado |
| `registrar_alerta_documento(uuid, text)` | Marca como avisado (só depois do envio) |

Três triggers mantêm `status_documental` em dia: mudou documento, mudou o
vínculo fornecedor↔segmento, ou mudou o checklist do segmento.

---

## 4. Storage

Um bucket **privado**: `fornecedores`. Guarda os PDFs de laudo e de documento de
homologação. O acesso é sempre por URL assinada com validade curta
(`urlAssinadaDocumento`), nunca por link público.

---

## 5. Como aplicar migrations

O CLI do Supabase não roda neste ambiente. As migrations são aplicadas no
projeto cloud e os arquivos `.sql` ficam versionados aqui como fonte da verdade.
Com o CLI instalado localmente:

```bash
supabase link --project-ref xglbppuiwdfuxdmyvbix
supabase db push
```

Convenções:

- Nome: `AAAAMMDDHHMMSS_escopo_descricao.sql`, em snake_case.
- **Arquivo aplicado é imutável.** Correção entra em migration nova.
- Toda tabela nova sai com trigger de `org_id`, RLS, policy e grants — não deixe
  para depois.
- Funções nascem com `revoke ... from anon` e `grant ... to authenticated`.

### Verificar como um usuário da organização

```sql
do $$
declare v_org uuid;
begin
  select id into v_org from core.organizacoes order by created_at limit 1;
  perform set_config('request.jwt.claim.org_id', v_org::text, true);
  -- consultas aqui enxergam o que o usuário enxergaria
end $$;
```

### Testar sem sujar o banco

Um bloco `do $$ ... $$` que monta o cenário e termina com
`raise exception '%', relatorio` deixa o relatório na mensagem de erro e
**desfaz tudo** — não sobra fixture para limpar depois. Foi assim que a suíte de
casos de borda da homologação foi validada.

---

## 6. Diagnóstico

`get_advisors` do Supabase, na última verificação:

- **Segurança:** 1 aviso — proteção contra senha vazada desligada (Auth →
  Password protection).
- **Performance:** 2 políticas reavaliam `auth.uid()` por linha (`core.perfis`,
  `producao.etapas`); 199 chaves estrangeiras sem índice; 27 índices sem uso.
  Irrelevante no volume atual — vira problema na casa das dezenas de milhares de
  linhas.
