-- ============================================================================
-- Documentos vencidos / a vencer — alimenta o bloco do painel e, depois, a
-- rotina de alerta (que reusa exatamente esta regra, para o e-mail e a tela
-- nunca discordarem).
--
-- Só entram documentos VIGENTES, não excluídos, de tipos que controlam
-- validade e que ainda são exigidos por algum segmento do fornecedor.
-- ============================================================================
create or replace function qualidade.documentos_vencendo(p_dias integer default 30)
returns table (
  documento_id  uuid,
  fornecedor_id uuid,
  fornecedor    text,
  documento     text,
  validade      date,
  dias          integer,
  estado        text          -- 'vencido' | 'proximo_vencimento'
)
language sql
stable
security invoker
set search_path = qualidade, core, public
as $$
  select
    d.id,
    f.id,
    f.razao_social,
    de.nome,
    d.validade,
    (d.validade - current_date)::int,
    case when d.validade < current_date then 'vencido' else 'proximo_vencimento' end
  from qualidade.documentos_fornecedor d
  join qualidade.documentos_exigidos de on de.id = d.documento_exigido_id
  join core.fornecedores f              on f.id  = d.fornecedor_id
  where d.is_atual
    and d.excluido_em is null
    and d.resultado <> 'reprovado'
    and de.tem_validade
    and de.ativo
    and d.validade is not null
    and d.validade <= current_date + p_dias
    -- Produtor rural fica fora da homologação documental: quem entrega raiz é
    -- acompanhado pela inspeção de recebimento, não por alvará e licença.
    and f.tipo <> 'produtor_rural'
    and exists (
      select 1
        from qualidade.fornecedor_segmentos fs
        join qualidade.segmento_documentos sd on sd.segmento_id = fs.segmento_id
       where fs.fornecedor_id = d.fornecedor_id
         and sd.documento_exigido_id = d.documento_exigido_id
    )
  order by d.validade;
$$;

revoke execute on function qualidade.documentos_vencendo(integer) from anon;
grant execute on function qualidade.documentos_vencendo(integer) to authenticated;
