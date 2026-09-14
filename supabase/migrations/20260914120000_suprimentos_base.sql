-- ============================================================================
-- Suprimentos — a compra de mandioca.
--
-- O comprador planeja a semana em CARGAS (quantas cada produtor manda em cada
-- dia) e a balança registra a chegada em QUILOS. A tonelagem varia por
-- produtor, então não existe conversão fixa entre os dois: a previsão compara
-- carga com carga, e todo cálculo de dinheiro usa o peso real.
--
--   · core.fornecedores        ganha os campos do produtor (cidade, contato…)
--   · suprimento_parametros    preço da renda, da farinha e teto, por semana
--   · suprimento_previsao      a linha da grade: produtor × semana
--   · suprimento_previsao_dias a célula: quantas cargas naquele dia
--   · producao.recebimentos    ganha o vínculo com a previsão e os parâmetros
--
-- As tabelas ficam em `producao` de propósito: é o schema que já contém
-- recebimentos e já está exposto no PostgREST.
-- ============================================================================

-- ── Produtor: os campos que o comprador precisa ───────────────────────────
alter table core.fornecedores
  add column if not exists contato         text,
  add column if not exists cidade          text,
  add column if not exists uf              text,
  add column if not exists distancia_km    numeric,
  add column if not exists variedades      text[],
  add column if not exists pagamento_padrao text
    check (pagamento_padrao is null or pagamento_padrao in ('30_dias','avista','adiantamento')),
  add column if not exists observacao      text,
  -- Quem decide quem está na lista é o comprador. A "situação" calculada pela
  -- entrega é informação; isto aqui é a chave que ele vira.
  add column if not exists ativo           boolean not null default true;

comment on column core.fornecedores.ativo is
  'Decisão do comprador: entra ou não na lista de trabalho. Excluir de verdade quebraria o histórico de cargas.';

-- ── Parâmetros da semana ──────────────────────────────────────────────────
-- Preço da renda muda por semana; guardar o histórico é o que impede o custo
-- de uma carga de agosto de se reescrever quando o preço de setembro muda.
create table if not exists producao.suprimento_parametros (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references core.organizacoes(id),
  semana_inicio  date not null,                     -- segunda-feira
  preco_renda    numeric not null,                  -- R$ por grama de renda, por tonelada
  preco_farinha  numeric not null,                  -- R$ por tonelada
  teto_pct       numeric not null default 58,       -- % do preço da farinha
  created_at     timestamptz not null default now(),
  created_by     uuid references core.usuarios(id),
  unique (org_id, semana_inicio),
  check (preco_renda > 0 and preco_farinha > 0 and teto_pct > 0 and teto_pct <= 100)
);

-- ── Previsão: a linha da grade ────────────────────────────────────────────
create table if not exists producao.suprimento_previsao (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references core.organizacoes(id),
  semana_inicio date not null,
  fornecedor_id uuid not null references core.fornecedores(id) on delete cascade,
  variedade     text,
  pagamento     text check (pagamento is null or pagamento in ('30_dias','avista','adiantamento')),
  confirmado    boolean not null default false,
  observacao    text,
  created_at    timestamptz not null default now(),
  created_by    uuid references core.usuarios(id),
  unique (org_id, semana_inicio, fornecedor_id)
);

-- ── Previsão: a célula (cargas naquele dia) ───────────────────────────────
create table if not exists producao.suprimento_previsao_dias (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references core.organizacoes(id),
  previsao_id uuid not null references producao.suprimento_previsao(id) on delete cascade,
  data        date not null,
  cargas      integer not null check (cargas >= 0),
  unique (previsao_id, data)
);

create index if not exists idx_prev_semana on producao.suprimento_previsao (org_id, semana_inicio);
create index if not exists idx_prev_dias   on producao.suprimento_previsao_dias (previsao_id, data);

-- ── Chegada da carga: vínculo com a previsão e parâmetros congelados ──────
alter table producao.recebimentos
  add column if not exists previsao_id   uuid references producao.suprimento_previsao(id) on delete set null,
  add column if not exists preco_renda   numeric,
  add column if not exists preco_farinha numeric,
  add column if not exists teto_pct      numeric;

comment on column producao.recebimentos.preco_renda is
  'Cópia do parâmetro da semana no momento do lançamento. Sem isto, mudar o preço desta semana reescreveria o custo das cargas antigas.';

-- ── A conta ───────────────────────────────────────────────────────────────
-- O rendimento em função da renda é uma reta. A planilha do comprador usava
-- uma tabela de 850 linhas; conferida linha a linha, ela é exatamente
-- 0,0766323226 + 0,0003739932 × renda (erro máximo de 1e-16).
create or replace function producao.rendimento_raiz(p_renda numeric)
returns numeric language sql immutable as $$
  select case when p_renda is null or p_renda <= 0 then null
              else 0.0766323226 + 0.0003739932 * p_renda end;
$$;

comment on function producao.rendimento_raiz(numeric) is
  'Fração de farinha por tonelada de raiz, a partir da renda em gramas (balança hidrostática).';

-- Custo da tonelada de farinha: o que se paga pela raiz dividido pelo que ela
-- rende. É o número que a regra do teto limita.
create or replace function producao.custo_t_farinha(p_renda numeric, p_preco_renda numeric)
returns numeric language sql immutable as $$
  select case when producao.rendimento_raiz(p_renda) is null or p_preco_renda is null then null
              else (p_renda * p_preco_renda) / producao.rendimento_raiz(p_renda) end;
$$;

-- Renda máxima que ainda cabe no teto, ao preço do dia.
--
-- Resolvendo (r·p)/(a + b·r) = T  →  r = T·a / (p − T·b).
-- Quando o denominador é zero ou negativo, o custo nunca alcança o teto: não
-- existe limite, e devolver null é mais honesto do que devolver um número.
create or replace function producao.renda_maxima(
  p_preco_renda numeric, p_preco_farinha numeric, p_teto_pct numeric default 58
)
returns numeric language sql immutable as $$
  select case
    when p_preco_renda is null or p_preco_farinha is null then null
    when p_preco_renda - (p_preco_farinha * p_teto_pct / 100) * 0.0003739932 <= 0 then null
    else ((p_preco_farinha * p_teto_pct / 100) * 0.0766323226)
       / (p_preco_renda - (p_preco_farinha * p_teto_pct / 100) * 0.0003739932)
  end;
$$;

comment on function producao.renda_maxima(numeric, numeric, numeric) is
  'Renda em gramas acima da qual a raiz estoura o teto de custo. Null quando não há limite ao preço informado.';

-- ── org_id automático, RLS e grants (padrão da casa) ──────────────────────
do $$
declare t text;
begin
  foreach t in array array['suprimento_parametros','suprimento_previsao','suprimento_previsao_dias'] loop
    execute format('drop trigger if exists trg_set_org_id on producao.%I', t);
    execute format('create trigger trg_set_org_id before insert on producao.%I
                    for each row execute function core.set_org_id()', t);
    execute format('alter table producao.%I enable row level security', t);
    execute format('drop policy if exists tenant_isolation on producao.%I', t);
    execute format('create policy tenant_isolation on producao.%I
                      for all to authenticated
                      using (org_id = core.current_org())
                      with check (org_id = core.current_org())', t);
    execute format('grant select, insert, update, delete on producao.%I to authenticated', t);
  end loop;
end $$;

revoke execute on function producao.rendimento_raiz(numeric) from anon;
revoke execute on function producao.custo_t_farinha(numeric, numeric) from anon;
revoke execute on function producao.renda_maxima(numeric, numeric, numeric) from anon;
grant execute on function producao.rendimento_raiz(numeric) to authenticated;
grant execute on function producao.custo_t_farinha(numeric, numeric) to authenticated;
grant execute on function producao.renda_maxima(numeric, numeric, numeric) to authenticated;
