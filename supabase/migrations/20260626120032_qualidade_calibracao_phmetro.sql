-- ============================================================================
-- 0032 — Qualidade: Calibração diária do pHmetro (FOR-PQSA20 Anexo 1.1).
--   Log de verificação com as duas soluções tampão:
--     pH 4,0 aceitável 3,80–4,00  e  pH 7,0 aceitável 6,80–7,00.
--   Conformidade calculada por trigger. Frequência: sempre que necessário.
--   Separado da tabela de calibrações externas (certificados/validade).
-- ============================================================================
create table qualidade.calibracoes_phmetro (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references core.organizacoes(id),
  data         date not null default current_date,
  hora         time,
  tampao_ph4   numeric,   -- aceitável 3,80 a 4,00
  tampao_ph7   numeric,   -- aceitável 6,80 a 7,00
  conforme     boolean not null default true,
  responsavel  text,
  validado_por text,      -- validação da Qualidade
  observacao   text,
  created_at   timestamptz not null default now(),
  created_by   uuid references core.usuarios(id)
);
create index on qualidade.calibracoes_phmetro (org_id, data);

create or replace function qualidade.calibracao_phmetro_avalia()
returns trigger language plpgsql set search_path = qualidade, public as $$
begin
  NEW.conforme :=
    (NEW.tampao_ph4 is null or (NEW.tampao_ph4 >= 3.80 and NEW.tampao_ph4 <= 4.00))
    and (NEW.tampao_ph7 is null or (NEW.tampao_ph7 >= 6.80 and NEW.tampao_ph7 <= 7.00));
  return NEW;
end; $$;

create trigger trg_set_org_id before insert on qualidade.calibracoes_phmetro
  for each row execute function core.set_org_id();
create trigger trg_calibracao_phmetro_avalia before insert or update on qualidade.calibracoes_phmetro
  for each row execute function qualidade.calibracao_phmetro_avalia();

alter table qualidade.calibracoes_phmetro enable row level security;
create policy tenant_isolation on qualidade.calibracoes_phmetro
  for all using (org_id = core.current_org()) with check (org_id = core.current_org());
grant select, insert, update, delete on qualidade.calibracoes_phmetro to authenticated;
