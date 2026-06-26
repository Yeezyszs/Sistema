# Sistema — ERP/MES Sumaré

Monorepo do sistema de produção e rastreabilidade (FSSC 22000) da unidade de
Sumaré. **TypeScript ponta a ponta**: o domínio é definido uma vez em
`packages/domain` e importado pelo backend e pelo frontend.

## Stack

| Camada          | Tecnologia                              |
| --------------- | --------------------------------------- |
| Dados           | PostgreSQL / Supabase (RLS multi-tenant) |
| Regras críticas | SQL / plpgsql (gate `liberar_lote`)     |
| Backend         | Node.js + TypeScript + Fastify          |
| Frontend        | React + Vite + TypeScript + Tailwind    |

## Estrutura

```
raiz/
├─ packages/
│  └─ domain/        # domínio puro (entities, value-objects) — fonte única de tipos
├─ apps/
│  ├─ api/           # backend Clean Architecture (application/infra/presentation/main)
│  └─ web/           # frontend React (features/components/lib/app)
└─ supabase/
   ├─ migrations/    # SQL versionado: schemas, RLS, funções
   └─ seed/          # etapas, pontos de controle, perfis
```

**Regra de dependência (Clean Architecture):** `domain` não importa ninguém ·
`application` importa `domain` · `infrastructure`/`presentation` importam
`application` · `web` importa **só** tipos de `domain`.

## Setup

```bash
pnpm install           # instala todo o workspace
cp .env.example .env   # preencha as chaves do Supabase

pnpm dev               # sobe api + web em paralelo
pnpm dev:api           # só o backend (http://localhost:3333/health)
pnpm dev:web           # só o frontend (http://localhost:5173)
```

## Roadmap de implementação

| Etapa | Escopo                                                              | Status |
| ----- | ------------------------------------------------------------------ | ------ |
| 1     | Estrutura do monorepo (pnpm workspaces, TS, configs)               | ✅      |
| 2     | Banco: schemas `core`/`producao`, tabelas Fase 1, RLS, seeds      | ✅      |
| 3     | `packages/domain`: `Lote`, `EtapaLote`, `StatusLote`…             | ✅      |
| 5     | `apps/web`: telas Lotes, Lote (rastreabilidade), Recebimento       | ✅      |
| 4     | `apps/api`: repositórios → use-cases → rotas (regras com gate)      | ⏳      |

> Ordem ajustada: o front acessa o Supabase direto (RLS), então a Etapa 5
> foi feita após a 3. A Etapa 4 (backend) entra para o que tem regra de
> negócio com gate (movimentos, liberação de lote — Fase 2).

### Acesso (ambiente de desenvolvimento)

Login demo: `admin@sumare.com.br` / `sumare1234` (org Indústria Sumaré, com
dados de exemplo). Troque a senha antes de qualquer uso real.

**Fora de escopo agora:** gate completo de liberação (Fase 2, com Qualidade),
PCP (após fluxograma), billing/onboarding SaaS (com 2º cliente).
