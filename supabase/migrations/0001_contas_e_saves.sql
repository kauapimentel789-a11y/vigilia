-- Etapa 6: contas e saves na nuvem.
-- Cada caçador tem um save (texto JSON gerado por serialize) e um perfil com nome público.

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dados text not null check (length(dados) < 2000000),
  versao int not null,
  salvo_em timestamptz not null default now()
);

create table if not exists public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null unique check (nome ~ '^[[:alnum:] _.-]{3,20}$'),
  criado_em timestamptz not null default now()
);

alter table public.saves enable row level security;
alter table public.perfis enable row level security;

create policy "dono le o save" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "dono grava o save" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono atualiza o save" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Nomes são públicos (aparecem na Arena); só o dono cria ou troca o seu.
create policy "todos leem perfis" on public.perfis
  for select to anon, authenticated using (true);
create policy "dono cria perfil" on public.perfis
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "dono troca nome" on public.perfis
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
