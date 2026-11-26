-- PDF de cada documento regulatório da empresa. Bucket privado próprio:
-- todos os usuários logados abrem; só Qualidade, Gestão e Administrador
-- enviam, trocam ou apagam — a mesma regra da tabela.
alter table core.documentos_empresa
  add column if not exists arquivo_path text,
  add column if not exists arquivo_nome text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos-empresa', 'documentos-empresa', false, 20971520,
        array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy doc_empresa_read on storage.objects for select to authenticated
  using (bucket_id = 'documentos-empresa');
create policy doc_empresa_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'documentos-empresa' and core.tem_perfil(array['qualidade','gestao','administrador']));
create policy doc_empresa_update on storage.objects for update to authenticated
  using (bucket_id = 'documentos-empresa' and core.tem_perfil(array['qualidade','gestao','administrador']));
create policy doc_empresa_delete on storage.objects for delete to authenticated
  using (bucket_id = 'documentos-empresa' and core.tem_perfil(array['qualidade','gestao','administrador']));
