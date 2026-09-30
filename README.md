# Catálogo de Streamings

Um app de descoberta de filmes que responde a uma pergunta: **o que eu assisto hoje, nos serviços de streaming que eu já assino?**

Você informa quais streamings assina e o app passa a mostrar apenas filmes que você pode ver agora, sem custo adicional. Nada de recomendar um título e você descobrir na página do filme que ele não está incluído no seu plano.

> **Status:** v1 completa. Descoberta, exploração, detalhe, busca e watchlist funcionando.

## O que ele faz

- **Descoberta personalizada** — a home monta trilhos (em alta, bem avaliados, estreias recentes, redescobertas) já filtrados pelos seus serviços.
- **Onde assistir** — cada filme mostra a disponibilidade separada em assinatura, aluguel e compra.
- **Explorar com filtros** — gênero, década, nota mínima e ordenação, tudo refletido na URL para que o link seja compartilhável.
- **Minha lista** — uma watchlist guardada na conta do usuário (email e senha) que o segue entre navegadores e dispositivos.

## Stack

| | |
|---|---|
| Framework | Next.js (App Router) |
| Linguagem | TypeScript, modo estrito |
| Estilos | Tailwind CSS |
| Dados | [TMDB API v3](https://developer.themoviedb.org/docs) |
| Testes | Vitest, Testing Library, MSW, axe-core |
| Deploy | Vercel |

Não há backend próprio nem banco de dados. As consultas ao TMDB acontecem no servidor do Next (mantendo a chave fora do navegador) e são cacheadas pelo próprio framework. As preferências vivem no `localStorage`.

## Decisões de projeto

Duas valem menção porque explicam o formato do app:

**É curadoria, não catálogo exaustivo.** O endpoint `/discover` do TMDB para de paginar na página 500, então "listar todos os filmes de um serviço" não é possível — nem seria útil. O app foi desenhado para responder "o que assistir", não para ser um índice.

**Não existe "entrou no catálogo esta semana".** O TMDB informa onde um filme está disponível hoje, não desde quando. Por isso o trilho de novidades usa a data de estreia do filme e é rotulado como tal, em vez de fingir uma informação que a fonte não tem.

**Acessibilidade é requisito, não acabamento.** A meta é WCAG 2.1 nível AA, com navegação completa por teclado e verificação automatizada por `axe-core` na suíte de testes.

O documento de design completo está em [`docs/superpowers/specs/`](docs/superpowers/specs/).

## Conta e Minha lista (Supabase)

A Minha lista fica numa tabela do Supabase, acessada com email e senha. O resto do app funciona sem conta.

1. Crie um projeto no [Supabase](https://supabase.com).
2. Em **SQL Editor**, rode [`supabase/schema.sql`](supabase/schema.sql). Ele cria a tabela `watchlist` com RLS ligado.
3. Em **Authentication → Providers → Email**, desligue *Confirm email*.
4. Copie **Project URL** e a chave **publishable** (Project Settings → API Keys) para o `.env.local`, seguindo o `.env.example`. Nunca use a chave secreta.
5. Para conferir o RLS: `node --env-file=.env.local scripts/verificar-rls.mjs`.

A sessão fica em cookies (`@supabase/ssr`) e é renovada pelo `proxy.ts`, o antigo `middleware.ts`, renomeado no Next 16.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha TMDB_ACCESS_TOKEN
npm run dev
```

O token é o *API Read Access Token*, obtido gratuitamente em [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).

## Créditos

This product uses the TMDB API but is not endorsed or certified by TMDB.

Os dados de disponibilidade nos streamings são fornecidos pelo JustWatch através do TMDB. Este é um projeto de estudo, sem fins comerciais.
