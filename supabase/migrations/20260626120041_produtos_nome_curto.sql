-- ============================================================================
-- 0041 — Produtos: nome_curto (apelido) para exibição compacta (ex.: quadro
--   de programação). Editável; semeado com uma abreviação derivada do nome
--   (peneira Pxx + variação + dica de embalagem).
-- ============================================================================
alter table core.produtos add column if not exists nome_curto text;

update core.produtos p
   set nome_curto = trim(both ' ' from concat_ws(' ',
     -- Peneira: "PENEIRA 16" ou "P. 10" -> "P16"/"P10"
     case
       when substring(p.nome from 'PENEIRA\s+(\d+)') is not null then 'P' || substring(p.nome from 'PENEIRA\s+(\d+)')
       when substring(p.nome from 'P\.\s*(\d+)') is not null then 'P' || substring(p.nome from 'P\.\s*(\d+)')
     end,
     -- Variação
     case
       when p.nome ilike '%5%\%%' escape '\' then '5%'
       when p.nome ilike '%P/ TORRAR%' or p.nome ilike '%PARA TORRAR%' then 'p/ Torrar'
       when p.nome ilike '%TORRADA%' then 'Torrada'
       when p.nome ilike '%CRUA%' then 'Crua'
       when p.nome ilike '%ESPECIAL%' then 'Especial'
       when p.nome ilike '%PANIFIC%' then 'Panif.'
       when p.nome ilike '%FILTRADO%' then 'Pó filtr.'
     end,
     -- Dica de embalagem (diferencia sacos de 25/50 kg)
     case
       when p.nome ilike 'SACO DE 25%' then '(sc 25)'
       when p.nome ilike 'SACO DE 50%' then '(sc 50)'
     end
   ))
 where p.tipo = 'produto_acabado' and (p.nome_curto is null or p.nome_curto = '');

-- Fallback: onde não deu para derivar, usa o código.
update core.produtos set nome_curto = codigo
 where tipo = 'produto_acabado' and (nome_curto is null or nome_curto = '');
