-- ============================================================================
-- 0012 — Falha no detector de metais abre NC automaticamente (origem desvio_pcc)
--         O gate liberar_lote já barra lote com NC aberta → bloqueia o lote.
-- ============================================================================
create or replace function qualidade.dm_falha_abre_nc()
returns trigger
language plpgsql
security invoker
set search_path = qualidade, producao, core, public
as $$
begin
  if NEW.conforme = false then
    insert into qualidade.nao_conformidades
      (org_id, tipo, origem, lote_id, descricao, status)
    values (
      NEW.org_id,
      'rnc',
      'desvio_pcc',
      NEW.lote_id,
      'Falha no detector de metais (verificação reprovada). Segregar a produção do período e investigar.'
        || coalesce(' Ação: ' || NEW.acao_corretiva, ''),
      'aberta'
    );
  end if;
  return NEW;
end;
$$;

create trigger trg_dm_falha_nc after insert on qualidade.verificacoes_dm
  for each row execute function qualidade.dm_falha_abre_nc();
