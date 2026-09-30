# Conta com email e senha para a Minha lista — Documento de Design

**Data:** 2026-09-27
**Status:** Aprovado para planejamento
**Depende de:** [2026-09-01-catalogo-streaming-design.md](2026-09-01-catalogo-streaming-design.md), que listava "contas de usuário, login, sincronização entre dispositivos" como fora de escopo. Este documento traz só a parte da Minha lista para dentro.

---

## 1. Objetivo

Hoje a Minha lista vive no `localStorage`: some se a pessoa trocar de navegador ou limpar os dados, e não existe em outro dispositivo. Com uma conta (email e senha, via Supabase), a lista passa a viver no banco e acompanha a pessoa.

### O que o sucesso significa

- Criar conta e entrar em um passo, sem depender de email chegar.
- A lista salva em um navegador aparece em outro depois de entrar.
- Ninguém lê nem altera a lista de outra pessoa, nem com a chave pública e o DevTools aberto.
- Quem já tinha filmes salvos no navegador não os perde.

---

## 2. Escopo

### Dentro

- Cadastro e login com email e senha. Sair.
- Tabela `watchlist` no Supabase, protegida por RLS.
- Botão de salvar, página `/minha-lista` e cabeçalho lendo da conta.
- Importar, com confirmação, a lista que já está no navegador.

### Fora

- **Login obrigatório para o resto do app.** Home, explorar, busca e detalhe continuam abertos. Só salvar e ver a lista exigem conta.
- **Serviços assinados e onboarding na conta.** `providerIds` e `hasOnboarded` continuam no `localStorage`.
- **Confirmação por email, recuperação de senha, login social.** A confirmação fica desligada no painel. Ligar depois exige um SMTP próprio e uma rota de callback, sem mudar o que este documento define.
- **Listas com mais de 50 filmes.** Ver §8.

---

## 3. Decisões tomadas

| Pergunta | Decisão |
|---|---|
| Onde o login é exigido | Só na Minha lista (salvar e ver) |
| O que vai para a conta | Só a lista de filmes |
| Lista antiga do navegador | Perguntar antes de importar; nunca apagar |
| Confirmação por email | Desligada por enquanto |
| Onde fica a sessão | Cookies, via `@supabase/ssr` (abordagem A) |
| Como o botão sabe o que está salvo | `WatchlistProvider` no layout |

A abordagem B (só `supabase-js` no navegador, sessão no `localStorage`) foi descartada: o servidor nunca saberia quem é o usuário, `/minha-lista` piscaria conteúdo antes de redirecionar, e o app, que é todo renderizado no servidor, ganharia uma ilha só de cliente.

---

## 4. Dados e segurança

### 4.1 Tabela

```sql
create table public.watchlist (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  movie_id   integer     not null check (movie_id > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);
```

- **Chave primária composta:** o banco recusa duplicata por construção. Hoje isso depende de o array não repetir.
- **`on delete cascade`:** apagar a conta apaga a lista.
- **`created_at`:** a lista volta na ordem em que foi salva, como hoje (o último salvo aparece por último).
- **Sem título nem pôster:** o TMDB é a fonte. Uma cópia aqui envelheceria sozinha.

### 4.2 Políticas de acesso (RLS)

```sql
alter table public.watchlist enable row level security;

create policy "le a propria lista" on public.watchlist
  for select using ((select auth.uid()) = user_id);

create policy "insere na propria lista" on public.watchlist
  for insert with check ((select auth.uid()) = user_id);

create policy "remove da propria lista" on public.watchlist
  for delete using ((select auth.uid()) = user_id);
```

Não há política de `update`: a linha não tem campo mutável. Salvar é `insert`, tirar é `delete`.

**O `enable row level security` é a linha mais importante deste trabalho.** A chave publishable vai para o navegador e é pública por natureza. Sem RLS, qualquer pessoa com ela lê e apaga a lista de todos. O `(select auth.uid())` entre parênteses é a forma recomendada pelo Supabase: o valor é calculado uma vez por consulta, não uma vez por linha.

O SQL de §4.1 e §4.2 vai também para `supabase/schema.sql` no repositório, para ficar versionado junto do código.

### 4.3 Chaves

| Variável | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` | Pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Pública; o RLS é o que protege os dados |

A chave secreta (`service_role` / `sb_secret_…`) **não é usada em lugar nenhum**. Ela ignora o RLS. O `.env.example` ganha as duas variáveis acima, sem valor.

---

## 5. Sessão e rotas

### 5.1 Clientes Supabase

- `lib/supabase/browser.ts`: `createBrowserClient`. Usado pelo formulário de `/entrar`, pelo botão Sair e pelo `WatchlistProvider`.
- `lib/supabase/server.ts`: `createServerClient` sobre `cookies()` do Next. Usado por `/minha-lista` e pelas Server Actions. Marcado `server-only`.

As duas dependências novas são `@supabase/supabase-js` e `@supabase/ssr`.

### 5.2 `proxy.ts`

No Next 16, `middleware.ts` está deprecado e virou `proxy.ts`, com export `proxy`. Os tutoriais de Supabase + Next que existem online usam o nome antigo. A implementação segue a documentação em `node_modules/next/dist/docs/`, não os tutoriais.

O `proxy.ts` faz duas coisas:

1. **Renova a sessão em toda requisição**, chamando o Supabase Auth e regravando os cookies. Sem isso o token expira e a pessoa é deslogada sem motivo.
2. **Redirecionamento otimista de `/minha-lista`**: sem sessão, manda para `/entrar?proximo=/minha-lista`.

O `proxy.ts` não consulta a tabela `watchlist`. Seguindo o guia de autenticação do Next, ele é só uma checagem otimista. A proteção real dos dados fica no RLS, e `/minha-lista` confere a sessão de novo no servidor antes de ler.

O `matcher` exclui arquivos estáticos, imagens e `_next/`.

### 5.3 `/entrar`

Uma tela, um formulário (email e senha) e dois botões: **Entrar** e **Criar conta**. Como a confirmação por email está desligada, criar conta já deixa a pessoa logada, então não há motivo para duas rotas.

- Depois de entrar ou criar conta, vai para `proximo` (ou `/minha-lista` se ausente) e faz `router.refresh()` para o servidor enxergar a sessão nova.
- Erros do Supabase viram mensagens em português, anunciadas por uma região `aria-live`:
  - credenciais inválidas → "Email ou senha incorretos."
  - email já cadastrado → "Já existe uma conta com esse email. Use Entrar."
  - senha fraca → "A senha precisa ter pelo menos 6 caracteres."
  - qualquer outro → "Não foi possível entrar agora. Tente de novo."
- Quem já está logado e abre `/entrar` vai direto para `proximo`.

### 5.4 Validação de `?proximo=`

`proximoSeguro(valor)` aceita só caminho relativo: começa com `/`, não começa com `//` nem `/\`. Qualquer outra coisa vira `/minha-lista`.

Sem isso é um open redirect: alguém manda `/entrar?proximo=https://site-falso.com`, a vítima vê o domínio do app no link, entra, e cai num site de phishing.

### 5.5 Cabeçalho

O `SiteHeader` já é componente cliente. Ele lê a sessão do `WatchlistProvider` e mostra:

- deslogado: link **Entrar** (para `/entrar?proximo=<rota atual>`)
- logado: o email e um botão **Sair**. Sair chama `signOut()` no cliente de navegador, faz `router.refresh()` e, se a pessoa estiver em `/minha-lista`, manda para `/`.

---

## 6. A lista na interface

### 6.1 `WatchlistProvider` e `useWatchlist()`

Um provider cliente no `app/layout.tsx` carrega a lista uma vez e a compartilha por contexto:

```ts
type WatchlistContexto = {
  pronto: boolean            // já sabe se há sessão e quais ids estão salvos
  email: string | null       // null = deslogado
  ids: number[]              // ordem de created_at
  alternar(id: number): void // salva ou tira
}
```

- **Leitura:** pelo cliente de navegador. `onAuthStateChange` mantém `email` em dia. Com sessão, lê `movie_id` da `watchlist` ordenado por `created_at`. O RLS garante que só voltam as linhas da própria pessoa.
- **Por que no navegador e não no layout do servidor:** ler cookies no layout raiz tornaria todas as páginas dinâmicas, inclusive as que não têm nada a ver com usuário.
- **Escrita:** `alternar` atualiza `ids` na hora (otimista) e chama uma Server Action. Se a action falhar, o estado volta ao que era.

`MovieCard`, `MovieGrid`, `MovieRail` e `HeroDestaque` não mudam. O `WatchlistButton` troca `usePreferences()` por `useWatchlist()`:

- `pronto === false` → desabilitado, como hoje antes de hidratar.
- deslogado → o clique vai para `/entrar?proximo=<rota atual>` em vez de salvar.
- logado → `alternar(movieId)`.

Do `usePreferences()` sai o `toggleWatchlist`. O campo `watchlist` do `localStorage` continua sendo lido, só pela importação (§6.3).

### 6.2 Server Actions

Em `lib/watchlist/actions.ts`:

- `salvarNaLista(id)`: `insert` com `on conflict do nothing`.
- `removerDaLista(id)`: `delete`.
- `importarLista(ids)`: `insert` em lote com `on conflict do nothing`.

Cada uma valida o id (inteiro positivo), confere a sessão pelo cliente de servidor antes de tocar no banco e chama `revalidatePath('/minha-lista')`. O `user_id` vem da sessão, nunca do argumento.

### 6.3 `/minha-lista`

Vira Server Component:

1. Lê a sessão. Sem sessão, `redirect('/entrar?proximo=/minha-lista')` (segunda barreira, depois do `proxy.ts`).
2. Lê os ids ordenados por `created_at`, até 50.
3. Busca os filmes no TMDB no próprio servidor, com o mesmo mapeamento enxuto que a `/api/filmes` usa hoje (`paraMovie`), e renderiza a `MovieGrid`.

A página chega com os filmes prontos, sem esqueleto e sem busca no cliente. Os estados vazios atuais continuam, com os mesmos textos: "Sua lista está vazia" e "Não foi possível carregar sua lista".

Remover um filme na própria página: a estrela do botão muda na hora (estado otimista do provider). O card sai quando a revalidação da action traz a página atualizada do servidor, na mesma interação e sem recarregar. A grade é renderizada no servidor, e o provider não controla quais cards ela mostra.

**A `/api/filmes` sai.** A `WatchlistView` era a única consumidora. O `paraMovie` vai para `lib/tmdb/` para ser reaproveitado pela página.

### 6.4 Importação da lista do navegador

Um componente cliente em `/minha-lista` lê o `watchlist` do `localStorage`. Se houver ids e esse usuário ainda não tiver decidido, mostra a faixa:

> **N filmes salvos neste navegador.** Trazer para sua conta?  [Trazer]  [Descartar]

- **Trazer** chama `importarLista`. Filme já salvo não dá erro. Depois, o provider relê os ids, para as estrelas do resto do app refletirem a importação.
- **Descartar** só registra a decisão.
- **Nenhuma das duas apaga a lista local.** Um clique errado em Descartar não pode destruir uma lista juntada ao longo de meses. Ela fica no navegador, sem ser lida.
- A decisão fica no `localStorage`, na chave `streaming-catalog:importacao-v1`, como uma lista de ids de usuário que já decidiram. Outra pessoa entrando no mesmo navegador ainda vê a pergunta.
- Os ids passam por `sanitizarIds`: inteiros positivos, sem repetição, no máximo 50. Eles vêm de um `localStorage` que qualquer script da página pode ter escrito.

---

## 7. Testes e verificação

Com TDD, como no resto do projeto.

**Testado em vitest:**

- `proximoSeguro`: é código de segurança. Casos: `/filme/1`, vazio, `//site.com`, `/\site.com`, `https://site.com`, `javascript:…`.
- `sanitizarIds`: não inteiros, negativos, repetidos, acima do teto, tipos errados.
- O mapeamento de erros do Supabase para as mensagens de §5.3.
- `WatchlistProvider` e `useWatchlist`, com o cliente Supabase simulado: carrega ids, alterna de forma otimista, desfaz quando a action falha, fica deslogado sem sessão.
- `WatchlistButton`: desabilitado antes de `pronto`, manda para `/entrar` quando deslogado, alterna quando logado.
- A faixa de importação: aparece só com ids e sem decisão; Trazer e Descartar registram a decisão; nenhuma apaga o `localStorage`.
- `jest-axe` na tela `/entrar` e na faixa de importação, seguindo o padrão do projeto.

**Não testável em vitest, verificado à mão:** o RLS. É uma regra do Postgres, não do nosso código. Um teste que "prova" RLS simulando o Supabase só prova que a simulação funciona. A verificação, com a saída colada como evidência:

1. `select` na `watchlist` com a chave publishable e sem sessão → volta vazio.
2. `insert` com a chave publishable e sem sessão → recusado.
3. Com duas contas de teste: a conta B não vê nem remove os filmes da conta A.

**Fluxo completo no navegador:** criar conta → salvar um filme → sair → entrar em outra aba anônima → o filme está lá.

---

## 8. Limitações conhecidas

- **Listas com mais de 50 filmes:** só os 50 primeiros aparecem. Resolver exige paginar a página da lista, que é outro trabalho.
- **Sem confirmação por email:** aceita endereço inventado. Num app de lista de filmes, sem dado sensível, o custo é baixo.
- **Sem recuperação de senha:** quem esquecer a senha perde o acesso à conta.

---

## 9. Passos no painel do Supabase

Só o dono do projeto alcança estes:

1. **Authentication → Providers → Email:** desligar *Confirm email*.
2. **SQL Editor:** rodar `supabase/schema.sql`.
3. Colocar URL e chave publishable no `.env.local`. **Feito.**
