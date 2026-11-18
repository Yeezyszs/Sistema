-- Trilha de alterações: toda inclusão, alteração e exclusão nas tabelas do
-- sistema fica registrada com quem fez, quando e o valor antes/depois.
--
-- * Gravada por gatilho no próprio banco — vale para a tela, para a API e
--   para qualquer outro caminho; ninguém "esquece" de registrar.
-- * Ninguém altera nem apaga a trilha pelo sistema: usuários só leem, e só
--   Gestão, Qualidade e Administrador.
-- * Alteração que não muda nada (salvar sem editar) não gera linha.

create table if not exists core.auditoria (
  id           bigint generated always as identity primary key,
  org_id       uuid,
  em           timestamptz not null default now(),
  esquema      text not null,
  tabela       text not null,
  registro_id  text,
  acao         text not null check (acao in ('inclusao','alteracao','exclusao')),
  usuario_id   uuid,
  usuario_nome text,
  campos       text[],
  antes        jsonb,
  depois       jsonb
);
create index if not exists auditoria_org_em on core.auditoria (org_id, em desc);
create index if not exists auditoria_tabela on core.auditoria (esquema, tabela, registro_id);

alter table core.auditoria enable row level security;
create policy leitura_gestao_qualidade on core.auditoria
  for select to authenticated
  using (org_id = core.current_org() and core.tem_perfil(array['gestao','qualidade','administrador']));
revoke all on core.auditoria from anon, authenticated;
grant select on core.auditoria to authenticated;

create or replace function core.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = core, public
as $$
declare
  v_antes  jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  v_depois jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  v_campos text[];
  v_usuario core.usuarios%rowtype;
begin
  if tg_op = 'UPDATE' then
    select array_agg(k order by k) into v_campos
      from jsonb_object_keys(v_depois) k
     where v_antes -> k is distinct from v_depois -> k
       and k not in ('updated_at');
    if v_campos is null then return null; end if;
  end if;

  select * into v_usuario from core.usuarios where auth_user_id = auth.uid() limit 1;

  insert into core.auditoria (org_id, esquema, tabela, registro_id, acao, usuario_id, usuario_nome, campos, antes, depois)
  values (
    coalesce((coalesce(v_depois, v_antes) ->> 'org_id')::uuid, v_usuario.org_id),
    tg_table_schema, tg_table_name,
    coalesce(v_depois, v_antes) ->> 'id',
    case tg_op when 'INSERT' then 'inclusao' when 'UPDATE' then 'alteracao' else 'exclusao' end,
    v_usuario.id,
    coalesce(v_usuario.nome, case when auth.uid() is null then 'Sistema (automático)' end),
    v_campos, v_antes, v_depois
  );
  return null;
end $$;
revoke execute on function core.registrar_auditoria() from public, anon, authenticated;

-- Liga a trilha em todas as tabelas com org_id dos quatro esquemas, menos as
-- de controle interno de envio de alerta.
do $$
declare t record;
begin
  for t in
    select c.table_schema s, c.table_name n
      from information_schema.columns c
      join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
                                       and tb.table_type = 'BASE TABLE'
     where c.column_name = 'org_id'
       and c.table_schema in ('core','producao','qualidade','manutencao')
       and c.table_name not in ('auditoria','alertas_documento_enviados','alertas_calibracao_enviados')
  loop
    execute format('drop trigger if exists trg_zz_auditoria on %I.%I', t.s, t.n);
    execute format('create trigger trg_zz_auditoria after insert or update or delete on %I.%I
                    for each row execute function core.registrar_auditoria()', t.s, t.n);
  end loop;
end $$;
