# Arquitetura

Como o código está organizado, quais padrões seguir e — mais importante — por
quê. Quem for mexer aqui deveria ler isto antes.

---

## 1. A decisão de fundo: o front fala com o banco

Não há camada de API entre o navegador e o Postgres. O `apps/web` usa
`supabase-js` direto, e o que protege os dados é a **RLS do Postgres**, não um
servidor intermediário.

Isso é deliberado. Uma API que só repassa CRUD seria uma terceira cópia das
mesmas regras (banco, backend, front) — e três cópias divergem. Com RLS, a regra
de quem enxerga o quê existe **uma vez**, no lugar que nenhuma requisição
consegue contornar.

`apps/api` continua no repositório, como stub com `/health`, reservado para o
caso que o RLS não cobre: uma operação que precise de várias escritas
coordenadas com decisão de negócio no meio. Até hoje não apareceu — quando
aparecer, entra por lá.

**Consequência prática:** toda regra de negócio séria mora no Postgres, em
função ou trigger. O front consome e exibe; não recalcula.

---

## 2. Camadas

```
packages/domain  ──▶  não importa ninguém
       ▲
       │
   apps/web      ──▶  importa SÓ tipos e funções puras de domain
   apps/api      ──▶  application → domain; infrastructure/presentation → application
```

### `packages/domain`
Tipos e regras puras: sem React, sem Supabase, sem I/O. É a fonte única da
verdade dos tipos — `Lote` é o mesmo objeto no front, no back e nos testes.

Um arquivo por entidade (`entities/`), mais os value-objects transversais
(`value-objects/`: `StatusLote`, `TipoMovimento`, `Perfil`).

O padrão de cada arquivo:

```ts
export const STATUS_LOTE = ['em_processo', 'liberado', ...] as const;
export type StatusLote = (typeof STATUS_LOTE)[number];
export const STATUS_LOTE_LABEL: Record<StatusLote, string> = { ... };
export interface Lote { ... }
export interface NovoLote { ... }        // o que se envia ao criar
export type AtualizacaoLote = Partial<NovoLote>;
```

A tripla **constante `as const` → tipo derivado → mapa de labels** aparece em
quase toda entidade. Ela dá autocomplete, exaustividade no `switch` e um único
lugar para traduzir o valor do banco em texto de tela.

### `apps/web`

```
src/
├─ app/         App.tsx (rotas + guarda de módulo) · Layout.tsx (rail e navegação)
├─ components/  ui.tsx (Card, Button, Modal, Field…), icons, Toast, StatusChip
├─ features/    uma pasta por módulo, telas e modais dentro
└─ lib/         db.ts · auth.tsx · format.ts · useAsync.ts · supabaseClient.ts
```

---

## 3. Padrões que se repetem

### `lib/db.ts` — todo acesso a dados passa por aqui
Arquivo único, ~240 funções exportadas, agrupadas por módulo com comentários de
seção. Nenhum componente chama `supabase` diretamente.

Helpers internos:

```ts
const core = () => supabase.schema('core');
const producao = () => supabase.schema('producao');
const qualidade = () => supabase.schema('qualidade');
const manutencao = () => supabase.schema('manutencao');

unwrap<T>(res)          // erro vira exceção, dado vira T
mapBy(lista, 'id')      // Map para lookup cruzado em JS
```

Lookups entre schemas são resolvidos **em JS**, não com embedding do PostgREST —
`join` cross-schema no PostgREST é frágil e falha silenciosamente.

### `useAsync` — carregamento com cancelamento

```ts
const { data, loading, error } = useAsync(async () => { ... }, [deps]);
```

Devolve `error` como `string`. Um contador em `useState` no `deps` é o
gatilho de recarga depois de gravar:

```ts
const [recarregar, setRecarregar] = useState(0);
const rec = () => setRecarregar((n) => n + 1);
```

### Modais de edição

```tsx
const [editando, setEditando] = useState<T | null>(null);
// ...
<TextInput name="nome" defaultValue={editando?.nome ?? ''} />
```

Formulários usam `FormData` no submit em vez de estado controlado campo a
campo — menos re-render e menos código.

### Gráficos
Barras são `<div>` com `width` percentual; linhas são `<svg>` escrito à mão.
Não há biblioteca de charts. Para o volume de dados destas telas, uma dependência
de 200 kB não se paga.

### Cores
Semânticas (verde/âmbar/vermelho para situação) são **independentes** do azul da
marca (`brand`, `#000f89`). Risco usa uma terceira paleta (roxo/azul/cinza) de
propósito: risco e situação aparecem lado a lado na mesma tabela e não podem se
confundir.

### Datas
`formatarData` trata `YYYY-MM-DD` como **texto**, sem passar por `Date`. Um
`new Date('2026-07-20')` é meia-noite **UTC** e vira dia 19 no Brasil — esse bug
já jogou produção para o dia anterior uma vez. Para "hoje" existe
`hojeLocalISO()`; nunca use `new Date().toISOString().slice(0,10)`.

### Falha de consulta ≠ tudo em dia
Nas telas de compliance (Gestão de Documentos, Painel), quando a consulta do
checklist falha a tela **mostra o erro**. Nunca exibe zero. Num painel de
conformidade, afirmar que está tudo certo por causa de uma consulta que não
completou é pior do que não mostrar nada.

---

## 4. Permissões

Três peças, todas alimentadas pela mesma lista:

1. `packages/domain/.../Perfil.ts` — `MODULO` (todos os códigos) e
   `MODULOS_POR_PERFIL` (o que cada perfil acessa). `gestao` vê tudo.
2. `apps/web/src/app/App.tsx` — `<ModuloGuard modulo="...">` em cada rota;
   sem acesso, redireciona.
3. `apps/web/src/app/Layout.tsx` — filtra os itens do menu pelo mesmo critério.

Os perfis do usuário vêm da RPC `core.meus_perfis()`. Isso é **conveniência de
navegação**: quem protege de verdade é a RLS. Esconder o menu não impede
ninguém de chamar a API.

Para adicionar um módulo: código em `MODULO` → perfis em `MODULOS_POR_PERFIL` →
rota com `ModuloGuard` → item no `Layout`.

---

## 5. Convenções de código

- **Português no domínio.** Nomes de tabela, coluna, tipo e função descrevem o
  negócio na língua de quem usa: `lote`, `apontamento`, `contraprova`. Só a
  linguagem é inglês.
- **Comentário explica o porquê**, não o quê. Se um trecho é estranho, o
  comentário diz qual problema real ele resolve.
- **Soft delete onde há rastreabilidade.** Lote cancela, não apaga. Documento
  excluído guarda quem, quando e por quê — requisito FSSC 22000.
- **Um commit por entrega**, com `pnpm typecheck` e `pnpm build` passando.

---

## 6. Verificação no navegador

Não há suíte de testes de UI. As telas são verificadas com Playwright
(Chromium em `/opt/pw-browsers/chromium`) interceptando as chamadas ao Supabase
com `page.route`, o que permite montar qualquer cenário sem tocar no banco.

Duas armadilhas já custaram tempo:

- **A última rota registrada vence.** Registre o catch-all `**/rest/v1/**`
  primeiro e as específicas depois, ou a específica nunca é usada.
- O Tailwind emite `rgb(28 36 49)`, não hex — procurar por `#1c2431` no CSS
  gerado não acha nada e parece que a cor sumiu.
