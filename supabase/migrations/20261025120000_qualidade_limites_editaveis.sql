-- ============================================================================
-- Qualidade: limites dos pontos de controle editáveis pela Qualidade.
--
-- Limite de PCC é decisão do plano APPCC: só o perfil qualidade altera, e toda
-- alteração fica registrada (antes, depois, quem, quando e o motivo) — a
-- auditoria pergunta por que o limite mudou.
-- ============================================================================
create table if not exists qualidade.pontos_controle_historico (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null references qualidade.pontos_controle(codigo),
  limite_min_ant numeric,
  limite_max_ant numeric,
  limite_min     numeric,
  limite_max     numeric,
  acao_ant       text,
  acao           text,
  motivo         text not null,
  alterado_por   uuid references core.usuarios(id),
  alterado_em    timestamptz not null default now()
);
alter table qualidade.pontos_controle_historico enable row level security;
create policy pch_read on qualidade.pontos_controle_historico for select to authenticated using (true);
grant select on qualidade.pontos_controle_historico to authenticated;

-- Altera limites e grava o histórico numa operação só.
create or replace function qualidade.alterar_limite_pc(
  p_codigo text, p_min numeric, p_max numeric, p_acao text, p_motivo text
) returns void language plpgsql security definer set search_path = qualidade, core, public as $$
declare atual qualidade.pontos_controle;
begin
  if not ('qualidade' = any(core.meus_perfis())) then
    raise exception 'Só a Qualidade pode alterar limites de ponto de controle.' using errcode = '42501';
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'Informe o motivo da alteração.' using errcode = '23514';
  end if;
  if p_min is not null and p_max is not null and p_min > p_max then
    raise exception 'Limite mínimo maior que o máximo.' using errcode = '23514';
  end if;
  select * into atual from qualidade.pontos_controle where codigo = p_codigo for update;
  if not found then raise exception 'Ponto de controle % não existe.', p_codigo; end if;
  insert into qualidade.pontos_controle_historico
    (codigo, limite_min_ant, limite_max_ant, limite_min, limite_max, acao_ant, acao, motivo, alterado_por)
  values (p_codigo, atual.limite_min, atual.limite_max, p_min, p_max, atual.acao_corretiva, p_acao, trim(p_motivo),
          (select u.id from core.usuarios u where u.auth_user_id = auth.uid()));
  update qualidade.pontos_controle
     set limite_min = p_min, limite_max = p_max, acao_corretiva = p_acao
   where codigo = p_codigo;
end $$;
grant execute on function qualidade.alterar_limite_pc(text, numeric, numeric, text, text) to authenticated;
