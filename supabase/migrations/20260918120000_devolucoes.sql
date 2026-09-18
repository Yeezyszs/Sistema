-- ============================================================================
-- Devoluções de cliente.
--
-- A devolução existia só na planilha de faturamento, como linha de valor
-- negativo misturada às vendas. Aqui ela é registro próprio: o sinal deixa de
-- ser a regra de negócio, e o motivo — que a planilha não guardava — passa a
-- existir, porque devolução por avaria no transporte e devolução por desvio de
-- qualidade pedem ações diferentes.
--
-- A devolução aponta para o carregamento quando ele é conhecido. Nem sempre é:
-- carga de antes do sistema volta do mesmo jeito, e recusar o registro por
-- falta de vínculo seria perder o dado que interessa.
-- ============================================================================

create table if not exists producao.devolucoes (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references core.organizacoes(id),
  numero          integer,
  data            date not null default current_date,
  cliente_id      uuid references core.clientes(id),
  produto_id      uuid references core.produtos(id),
  carregamento_id uuid references producao.carregamentos(id) on delete set null,
  lote_id         uuid references producao.lotes(id) on delete set null,
  peso_kg         numeric check (peso_kg is null or peso_kg > 0),
  -- Preço por quilo praticado na venda; o total é calculado, nunca digitado.
  valor_rs        numeric check (valor_rs is null or valor_rs >= 0),
  valor_total_rs  numeric generated always as (coalesce(peso_kg, 0) * coalesce(valor_rs, 0)) stored,
  motivo          text not null default 'outro'
                    check (motivo in ('qualidade','avaria_transporte','erro_pedido','recusa_cliente','outro')),
  nota_fiscal     text,
  observacao      text,
  created_at      timestamptz not null default now(),
  created_by      uuid references core.usuarios(id)
);

create index if not exists idx_devolucoes_data on producao.devolucoes (org_id, data desc);
create index if not exists idx_devolucoes_cliente on producao.devolucoes (cliente_id);

alter table producao.devolucoes enable row level security;
create policy tenant_isolation on producao.devolucoes
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
create trigger trg_set_org_id before insert on producao.devolucoes
  for each row execute function core.set_org_id();

-- Numeração sequencial por organização, como nos demais documentos.
create or replace function producao.set_devolucao_numero()
returns trigger language plpgsql security invoker set search_path = producao, public as $$
begin
  if NEW.numero is null then
    select coalesce(max(numero), 0) + 1 into NEW.numero
      from producao.devolucoes where org_id = NEW.org_id;
  end if;
  return NEW;
end; $$;

create trigger trg_zz_devolucao_numero before insert on producao.devolucoes
  for each row execute function producao.set_devolucao_numero();

grant select, insert, update, delete on producao.devolucoes to authenticated;
