-- Minha lista: um filme por linha, por usuário.
-- Rode no SQL Editor do Supabase. Idempotente: pode rodar de novo.

create table if not exists public.watchlist (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  movie_id   integer     not null check (movie_id > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

-- A linha mais importante deste arquivo. A chave publishable é pública:
-- sem RLS, qualquer pessoa com ela lê e apaga a lista de todo mundo.
alter table public.watchlist enable row level security;

drop policy if exists "le a propria lista" on public.watchlist;
create policy "le a propria lista" on public.watchlist
  for select using ((select auth.uid()) = user_id);

drop policy if exists "insere na propria lista" on public.watchlist;
create policy "insere na propria lista" on public.watchlist
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "remove da propria lista" on public.watchlist;
create policy "remove da propria lista" on public.watchlist
  for delete using ((select auth.uid()) = user_id);

-- Sem política de update: a linha não tem campo mutável.

-- Abre a tabela para quem está logado; o RLS acima é quem decide, linha a
-- linha, o que cada um pode ler, inserir ou apagar. Nada muda para o anon.
grant select, insert, delete on public.watchlist to authenticated;
