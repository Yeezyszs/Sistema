# supabase/

Camada de dados versionada em SQL.

- `migrations/` — schemas, tabelas, RLS e funções (`core.current_org`, futura
  `qualidade.liberar_lote`). Cada arquivo é imutável e numerado por timestamp.
- `seed/` — dados de base: `etapas`, `pontos_controle`, `perfis`,
  `documentos_obrigatorios`.

## Como aplicar (Fase 1)

O CLI do Supabase não está disponível neste ambiente, então as migrations
são aplicadas no projeto cloud **Sistema** (`xglbppuiwdfuxdmyvbix`) e os
arquivos `.sql` ficam versionados aqui como fonte da verdade.

Com o CLI instalado localmente, o fluxo equivalente é:

```bash
supabase link --project-ref xglbppuiwdfuxdmyvbix
supabase db push          # aplica migrations/
```
