-- Avaliação de fornecedor passa da média 1–3 (1 = melhor) para 0–100
-- (100 = tudo em ordem). As faixas de cada critério continuam guardadas como
-- 1, 2, 3 em `criterios`; aqui só recalculamos pontuação e classificação das
-- avaliações já lançadas: faixa 1 = 25, 2 = 15, 3 = 0 pontos.
update qualidade.avaliacoes_fornecedor a
   set pontuacao = s.pontos,
       classificacao = case when s.pontos >= 80 then 'aceitavel'
                            when s.pontos >= 60 then 'aceitavel_com_restricao'
                            else 'nao_aceitavel' end
  from (
    select id,
           (select sum(case v::int when 1 then 25 when 2 then 15 else 0 end)
              from jsonb_each_text(criterios) as e(k, v)
             where k in ('cotacao', 'prazo_entrega', 'atendimento', 'nao_conformidades')) as pontos
      from qualidade.avaliacoes_fornecedor
     where criterios is not null
  ) s
 where s.id = a.id;
