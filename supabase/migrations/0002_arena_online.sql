-- Etapa 7: Arena contra times de outros jogadores, com ranking.
-- Só a Edge Function arena-registrar (chave de serviço) grava aqui, depois de
-- refazer a partida inteira e conferir o resultado.

create table if not exists public.arena_retratos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  semente bigint not null,
  nome text not null,
  heroi text not null,
  times jsonb not null,
  lugar int not null check (lugar between 1 and 8),
  criado_em timestamptz not null default now(),
  unique (user_id, semente)
);
create index if not exists arena_retratos_recentes on public.arena_retratos (criado_em desc);

create table if not exists public.arena_ranking (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  gloria int not null default 0,
  partidas int not null default 0,
  vitorias int not null default 0,
  melhor_lugar int,
  atualizado_em timestamptz not null default now()
);
create index if not exists arena_ranking_gloria on public.arena_ranking (gloria desc);

alter table public.arena_retratos enable row level security;
alter table public.arena_ranking enable row level security;

-- Ranking é público; ninguém grava pelo cliente.
create policy "todos leem o ranking" on public.arena_ranking
  for select to anon, authenticated using (true);
-- Retratos não são lidos direto: os rivais vêm de arena_rivais().

-- Até qtd times recentes de outros jogadores, um por jogador, sorteados.
create or replace function public.arena_rivais(qtd int)
returns table (id bigint, nome text, heroi text, times jsonb)
language sql
security definer
set search_path = ''
as $$
  select r.id, r.nome, r.heroi, r.times
  from (
    select distinct on (x.user_id) x.*
    from public.arena_retratos x
    where x.user_id <> (select auth.uid())
      and x.criado_em > now() - interval '30 days'
    order by x.user_id, x.criado_em desc
  ) r
  order by random()
  limit least(greatest(qtd, 0), 3);
$$;
revoke all on function public.arena_rivais(int) from public, anon;
grant execute on function public.arena_rivais(int) to authenticated;

-- Soma uma partida conferida no ranking (só a chave de serviço chama).
create or replace function public.arena_somar(p_user uuid, p_nome text, p_gloria int, p_lugar int)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.arena_ranking as k (user_id, nome, gloria, partidas, vitorias, melhor_lugar)
  values (p_user, p_nome, p_gloria, 1, case when p_lugar = 1 then 1 else 0 end, p_lugar)
  on conflict (user_id) do update set
    nome = excluded.nome,
    gloria = k.gloria + excluded.gloria,
    partidas = k.partidas + 1,
    vitorias = k.vitorias + excluded.vitorias,
    melhor_lugar = least(coalesce(k.melhor_lugar, excluded.melhor_lugar), excluded.melhor_lugar),
    atualizado_em = now();
$$;
revoke all on function public.arena_somar(uuid, text, int, int) from public, anon, authenticated;
