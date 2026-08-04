# Sistema — ERP/MES Sumaré

Sistema de gestão da Indústria de Alimentos Sumaré (farinha de mandioca):
produção, qualidade, manutenção, logística, comercial e documentação de
fornecedores, sob a lente da **FSSC 22000**.

Monorepo **TypeScript ponta a ponta** — o domínio é definido uma vez em
`packages/domain` e importado por backend e frontend.

## Estado atual

| Área | Situação |
| --- | --- |
| Banco (Supabase/Postgres) | 92 tabelas em 4 schemas, RLS em todas · 55 migrations |
| Frontend (`apps/web`) | 41 telas em 20 módulos · ~23 mil linhas |
| Domínio (`packages/domain`) | 41 entidades + 3 value-objects |
| Backend (`apps/api`) | **stub** — só `/health`. O front fala com o Supabase direto |
| Edge Function | `alertas-documentos` (implantada; falta cadastrar os secrets) |

## Stack

| Camada | Tecnologia |
| --- | --- |
| Dados | PostgreSQL / Supabase (RLS multi-tenant, Storage, Auth) |
| Regras críticas | SQL / plpgsql — moram no banco, não no front |
| Frontend | React + Vite + TypeScript + Tailwind (HashRouter) |
| Backend | Node.js + Fastify (reservado para regras com gate) |

## Módulos

| Grupo | Telas |
| --- | --- |
| **Produção** | Programação, Apontamento, Ordens de produção, Lotes, Produtos, Retidos |
| **Almoxarifado** | Consumíveis, Embalagens, Pallets |
| **Logística** | Estoque, Expedição |
| **Suprimentos** | Recebimentos, Fornecedores & Recebimento (inspeção + homologação por nota) |
| **Comercial** | Carteira, Pedidos, Análise de vendas, Clientes |
| **Gestão de Documentos** | Homologação documental de fornecedores (checklist FOR-POP 7) |
| **Qualidade** | PCC físico, PPHO, Não conformidades, Especificações, Calibração, Contraprovas, Análise de risco, Auditoria, Ambiental, Água, Insumos do lab |
| **Manutenção** | Ordens de serviço, Preventiva, Lubrificação, Indicadores, Checklist de ferramentas, Cadastros |
| **Administração** | Usuários & perfis |

Cada módulo é visível conforme o perfil do usuário (`gestao`, `operador`,
`qualidade`, `manutencao`) — ver `packages/domain/src/value-objects/Perfil.ts`.

## Estrutura

```
raiz/
├─ packages/
│  └─ domain/          # domínio puro — fonte única de tipos e regras sem I/O
├─ apps/
│  ├─ api/             # backend Fastify (stub)
│  └─ web/             # frontend React
│     └─ src/
│        ├─ app/       # rotas (App.tsx) e navegação (Layout.tsx)
│        ├─ components/# UI compartilhada (ui.tsx, icons, Toast)
│        ├─ features/  # uma pasta por módulo
│        └─ lib/       # db.ts (acesso a dados), auth, format, useAsync
└─ supabase/
   ├─ migrations/      # SQL versionado: schemas, RLS, funções, triggers
   ├─ seed/            # catálogos iniciais
   └─ functions/       # Edge Functions
```

## Setup

```bash
pnpm install
cp .env.example .env          # preencha as chaves do Supabase

pnpm dev:web                  # http://localhost:5173
pnpm dev:api                  # http://localhost:3333/health
pnpm typecheck && pnpm build  # antes de qualquer commit
```

O frontend precisa de `apps/web/.env.local` com `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` (não versionado).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Como o código é organizado e por quê — camadas, padrões, decisões |
| [`docs/BANCO.md`](docs/BANCO.md) | Schemas, multi-tenant, funções, triggers, como aplicar migrations |
| [`docs/MODULOS.md`](docs/MODULOS.md) | O que cada módulo faz, rota, permissão e tabelas |
| [`docs/qualidade/`](docs/qualidade/) | Briefings originais da Qualidade (FSSC 22000) |
| [`supabase/functions/alertas-documentos/`](supabase/functions/alertas-documentos/) | Alerta de vencimento: secrets e agendamento |

## Acesso (desenvolvimento)

Quatro logins de exemplo, um por perfil, na organização Indústria Sumaré.
As credenciais estão com a equipe — **não são versionadas**.

> Hoje é um login por área, não por pessoa. Para uso real em auditoria, cada
> operador precisa do próprio usuário: senão não há como saber quem lançou o quê.

## Pendências conhecidas

- Cadastrar os secrets da Edge Function de alerta (`RESEND_API_KEY` e afins) e
  agendar o cron — instruções em `supabase/functions/alertas-documentos/README.md`.
- `core.produtos`, `core.setores`, `core.funcionarios` e `core.equipamentos` não
  têm o trigger `set_org_id`: inserir nelas exige passar `org_id` explicitamente.
- Backend (`apps/api`) permanece stub. Só vale construir quando surgir regra que
  o RLS não resolva.
