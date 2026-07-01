-- Auxiliar de Criação de Catálogos - Supabase
-- Execute este arquivo no Supabase em: SQL Editor > New query > Run.

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem integer not null default 1,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(12,2) not null default 0,
  descricao text default '',
  categoria_id uuid references public.categorias(id) on delete restrict,
  disponivel boolean not null default true,
  imagem_url text default '',
  imagem_path text default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz
);

create table if not exists public.configuracoes (
  id text primary key,
  dados jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.configuracoes enable row level security;

-- Políticas simples: somente usuário logado consegue ler e alterar.
drop policy if exists "categorias_auth_all" on public.categorias;
create policy "categorias_auth_all"
on public.categorias
for all
to authenticated
using (true)
with check (true);

drop policy if exists "produtos_auth_all" on public.produtos;
create policy "produtos_auth_all"
on public.produtos
for all
to authenticated
using (true)
with check (true);

drop policy if exists "configuracoes_auth_all" on public.configuracoes;
create policy "configuracoes_auth_all"
on public.configuracoes
for all
to authenticated
using (true)
with check (true);

-- Bucket para as imagens do catálogo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogo-imagens',
  'catalogo-imagens',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Imagens: leitura pública para o PDF carregar as fotos; edição apenas logado.
drop policy if exists "catalogo_imagens_select_public" on storage.objects;
create policy "catalogo_imagens_select_public"
on storage.objects
for select
to public
using (bucket_id = 'catalogo-imagens');

drop policy if exists "catalogo_imagens_insert_auth" on storage.objects;
create policy "catalogo_imagens_insert_auth"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'catalogo-imagens');

drop policy if exists "catalogo_imagens_update_auth" on storage.objects;
create policy "catalogo_imagens_update_auth"
on storage.objects
for update
to authenticated
using (bucket_id = 'catalogo-imagens')
with check (bucket_id = 'catalogo-imagens');

drop policy if exists "catalogo_imagens_delete_auth" on storage.objects;
create policy "catalogo_imagens_delete_auth"
on storage.objects
for delete
to authenticated
using (bucket_id = 'catalogo-imagens');
