# Catálogo de Filmes nos Streamings — Documento de Design

**Data:** 2026-09-01
**Status:** Aprovado para planejamento
**Fonte de dados:** TMDB API v3

---

## 1. Objetivo

Um web app de **descoberta de filmes** que responde a uma pergunta: *"o que eu assisto hoje, nos serviços de streaming que eu já assino?"*

O usuário informa quais streamings assina e o app passa a mostrar apenas conteúdo que ele pode assistir agora, sem custo adicional. Nenhuma recomendação leva a um filme indisponível para ele.

O projeto é um **portfólio técnico**: deploy público, sem monetização.

### O que o sucesso significa

- Da primeira visita até um filme concreto para assistir em menos de 30 segundos.
- Nenhum título recomendado fora dos serviços selecionados.
- Home utilizável (primeiro conteúdo visível) em menos de 2 segundos numa conexão comum.
- Conformidade WCAG 2.1 nível AA nos fluxos principais.

---

## 2. Escopo

### Dentro

- Seleção de serviços de streaming assinados, persistida no navegador.
- Home de descoberta com trilhos curados, filtrados pelos serviços do usuário.
- Tela de exploração com filtros (gênero, década, nota) e ordenação.
- Página de detalhe do filme com bloco "onde assistir" (assinatura, aluguel, compra).
- Busca por título.
- Watchlist local ("quero assistir").
- Região fixa em Brasil (`BR`), idioma `pt-BR`.

### Fora (v1)

- Séries de TV. A API suporta, mas dobra tipos, telas e vocabulário do app. É a expansão natural pós-v1.
- Contas de usuário, login, sincronização entre dispositivos.
- Avaliações, comentários ou qualquer conteúdo gerado por usuário.
- "Entrou / saiu do catálogo esta semana" — exigiria histórico próprio (ver §3).
- Banco de dados de qualquer tipo.

---

## 3. Restrições da fonte de dados

Decisões de produto que derivam diretamente do que o TMDB oferece:

1. **Não existe data de entrada no catálogo.** O TMDB informa onde um filme está disponível *hoje*, não desde quando. Qualquer trilho de "novidades" usa **data de estreia do filme** e deve ser rotulado como tal. Rotular como "chegou ao streaming" seria mentir ao usuário.
2. **`with_watch_providers` exige `watch_region`.** Toda consulta de descoberta carrega a região.
3. **`/discover` para de paginar na página 500.** Irrelevante para descoberta; inviabilizaria "listar o catálogo inteiro" — motivo pelo qual o produto é curadoria, não catálogo exaustivo.
4. **Dados de disponibilidade vêm do JustWatch.** A licença do TMDB restringe uso comercial desses dados. O projeto é não comercial, o que mantém o uso dentro dos termos.
5. **Atribuição obrigatória:** o rodapé exibe o logo do TMDB e o texto *"This product uses the TMDB API but is not endorsed or certified by TMDB."*

---

## 4. Arquitetura

Sem backend próprio, sem banco de dados.

```
Navegador (Client Components)
  └── localStorage: serviços assinados, watchlist
       ↓ filtros viajam pela URL (?providers=8,119&genre=27)
Next.js App Router (Server Components + Route Handlers)
  └── lib/tmdb/ — única camada que conhece a API do TMDB
       ↓ fetch server-only, Authorization: Bearer
api.themoviedb.org/3
```

### Princípios

**Nenhum componente de UI chama o TMDB.** Todo acesso passa por `lib/tmdb/`, que expõe funções tipadas do nosso domínio e devolve **nossos tipos**, nunca o JSON cru da API. Trocar de fonte de dados no futuro é alterar um diretório.

**A chave nunca chega ao cliente.** O API Read Access Token vive em `TMDB_ACCESS_TOKEN` (sem prefixo `NEXT_PUBLIC_`), usado em módulo marcado `server-only`.

**Preferências no cliente, consultas no servidor.** As preferências ficam no `localStorage`; ao navegar, viram parâmetros de URL. Consequência positiva: URLs compartilháveis e botão "voltar" do navegador funcionando de graça.

### Stack

Next.js (App Router) · TypeScript (modo estrito) · Tailwind CSS · Vitest + Testing Library + MSW · deploy na Vercel.

---

## 5. Modelo de dados

Tipos do domínio, definidos em `lib/tmdb/types.ts`. Nenhum deles espelha a resposta do TMDB campo a campo — são o que o app precisa.

```ts
type Movie = {
  id: number
  title: string
  originalTitle: string
  overview: string
  posterUrl: string | null      // null tratado explicitamente na UI
  backdropUrl: string | null
  releaseYear: number | null
  rating: number | null         // 0–10
  voteCount: number
  genreIds: number[]
}

type MovieDetail = Movie & {
  runtimeMinutes: number | null
  genres: Genre[]
  cast: CastMember[]            // 10 primeiros
  trailerYoutubeKey: string | null
  watchOptions: WatchOptions
}

type Provider = {
  id: number
  name: string
  logoUrl: string
  displayPriority: number
}

type WatchOptions = {
  flatrate: Provider[]          // incluso na assinatura
  rent: Provider[]
  buy: Provider[]
  tmdbLink: string | null       // exigido pela licença JustWatch
}

type DiscoverFilters = {
  providerIds: number[]         // OU entre eles
  genreId?: number
  decade?: number
  minRating?: number
  sortBy: 'popularity' | 'rating' | 'releaseDate'
  page: number
}
```

---

## 6. Camada `lib/tmdb/`

| Arquivo | Responsabilidade |
|---|---|
| `client.ts` | `fetch` autenticado, `revalidate`, retry com backoff, tratamento de `429` |
| `types.ts` | Tipos do domínio (§5) |
| `mappers.ts` | Resposta TMDB → tipos do domínio. Toda tolerância a campo nulo mora aqui |
| `discover.ts` | `discoverMovies(filters): Promise<Page<Movie>>` |
| `movies.ts` | `getMovie(id): Promise<MovieDetail>`, `searchMovies(query, page)` |
| `providers.ts` | `getProviders(): Promise<Provider[]>` |
| `genres.ts` | `getGenres(): Promise<Genre[]>` |
| `images.ts` | Construção de URL de imagem por tamanho |

### Endpoints usados

| Necessidade | Chamada |
|---|---|
| Serviços disponíveis no Brasil | `/watch/providers/movie?watch_region=BR` |
| Descoberta | `/discover/movie` + `watch_region=BR`, `with_watch_providers`, `with_watch_monetization_types=flatrate` |
| Detalhe | `/movie/{id}?append_to_response=watch/providers,credits,videos,similar` |
| Busca | `/search/movie` |
| Gêneros | `/genre/movie/list` |

**Regra crítica:** múltiplos serviços são unidos por `|` (OU) — `with_watch_providers=8|119`. Usar `,` significaria E lógico e devolveria silenciosamente o catálogo errado. É um bug que *parece* funcionar, e por isso tem teste dedicado.

### Política de cache

| Dado | `revalidate` | Motivo |
|---|---|---|
| Lista de provedores | 7 dias | Praticamente estático |
| Gêneros | 7 dias | Praticamente estático |
| Consultas de descoberta | 12 horas | Catálogos mudam devagar |
| Detalhe do filme | 24 horas | Metadados estáveis |
| Busca | sem cache | Entrada arbitrária do usuário |

---

## 7. Telas

### 7.1 Seleção de serviços (primeira visita)

Grid de logos dos provedores disponíveis no Brasil. Sem essa escolha, o produto não tem sentido — por isso é a primeira tela, não uma configuração escondida. Inclui a saída "ver tudo" para quem não quer escolher agora.

A seleção é editável a qualquer momento por uma barra fixa no topo; alterá-la reordena a home imediatamente.

### 7.2 Home / Descoberta

Trilhos horizontais, cada um uma consulta ao `/discover` já restrita aos serviços do usuário:

| Trilho | Consulta |
|---|---|
| Em alta nos seus serviços | `sort_by=popularity.desc` |
| Muito bem avaliados | `vote_average.gte=7.5`, `vote_count.gte=300`, ordenado por nota |
| Estreias recentes disponíveis | `primary_release_date.gte` = 6 meses atrás |
| Gênero em destaque | Gênero escolhido de uma lista fixa pelo dia do ano (`diaDoAno % tamanhoDaLista`), determinístico para não divergir entre servidor e cliente |
| Vale redescobrir | Nota alta, estreia há mais de 15 anos |

Cada trilho tem seu próprio `Suspense` e seu próprio limite de erro: a falha de um não derruba os outros.

### 7.3 Explorar

Grid com filtros de gênero, década, nota mínima e ordenação. Estado inteiramente na URL. Paginação por scroll infinito com botão "carregar mais" como alternativa acessível — scroll infinito puro é uma armadilha para navegação por teclado.

### 7.4 Detalhe do filme

Pôster, sinopse, nota, duração, elenco principal, trailer.

O bloco **onde assistir** é o núcleo da tela: incluso na assinatura, aluguel e compra, separados e claramente rotulados, com destaque para os serviços que o usuário já assina. Abaixo, filmes similares — também filtrados pelos serviços do usuário, para nunca recomendar o inacessível.

### 7.5 Busca

Busca por título com resultados anotados pelos badges de disponibilidade.

### 7.6 Minha lista

Watchlist do `localStorage`, renderizada com os mesmos cards. Como só os IDs são salvos, a página busca cada filme por `getMovie(id)` — aproveitando o cache de 24h de §6 — e exibe a disponibilidade atual. Um filme salvo que saiu dos serviços do usuário continua na lista, marcado como indisponível: remover em silêncio seria pior que informar.

---

## 8. Componentes

| Componente | Papel |
|---|---|
| `ProviderPicker` | Seleção de serviços (modal na 1ª visita, barra depois) |
| `MovieCard` | Pôster, título, ano, nota, badges de serviço, botão de salvar |
| `MovieRail` | Trilho horizontal navegável por teclado |
| `MovieGrid` | Grade responsiva com paginação |
| `FilterBar` | Filtros sincronizados com a URL |
| `WatchProviderBlock` | "Onde assistir" na página de detalhe |
| `WatchlistButton` | Alterna item na watchlist |
| `EmptyState` | Estado vazio com ação sugerida |
| `MovieCardSkeleton` | Placeholder de carregamento |

`MovieCard` aparece em todas as telas — é o componente onde o acabamento visual mais rende.

---

## 9. Estado e persistência

Tudo no `localStorage`, sob uma chave versionada (`streaming-catalog:v1`):

```ts
{ providerIds: number[], watchlist: number[], hasOnboarded: boolean }
```

Encapsulado num módulo `lib/storage.ts`. **Todo acesso vai dentro de `try/catch`**: em aba anônima o `localStorage` pode lançar exceção ao ser acessado, e o app deve degradar para "sem preferências salvas" em vez de quebrar.

O React lê esse estado por um hook que só toca no `localStorage` após a hidratação, evitando divergência entre servidor e cliente.

---

## 10. Tratamento de erros

| Situação | Comportamento |
|---|---|
| `429` do TMDB | Retry com backoff, respeitando `Retry-After` |
| `5xx` do TMDB | Uma tentativa, depois mensagem com botão "tentar de novo" |
| Falha de um trilho | Só aquele trilho mostra erro; os demais renderizam |
| Zero resultados | `EmptyState` dizendo qual filtro afrouxar |
| Filme sem pôster | Placeholder com o título; a grade não fica esburacada |
| `localStorage` indisponível | App funciona sem persistência, sem erro visível |
| Filme inexistente | Página 404 própria |

Os dois estados vazios acima **vão** acontecer na prática — usuário com um único serviço pequeno e filtro estreito, e filmes sem pôster no TMDB. São parte do design, não exceções.

---

## 11. Performance

- Pôsteres via `next/image` apontando para `image.tmdb.org` (`remotePatterns` configurado): `w342` em cards, `w780` no detalhe. Dimensionar errado é a diferença entre uma home leve e uma que baixa dezenas de megabytes.
- Server Components por padrão. Vira Client Component apenas o que tem interação real: filtros, watchlist, picker.
- Cada trilho em seu próprio `Suspense` — a home aparece progressivamente em vez de esperar a última das cinco consultas.
- Cache do Next conforme §6 mantém a maioria das visitas sem tocar a API.

---

## 12. Acessibilidade

Requisito de primeira classe, verificado durante a implementação — não um retoque final. Alvo: **WCAG 2.1 nível AA**.

### Critérios verificáveis

1. **Teclado.** Todo fluxo — escolher serviços, percorrer trilhos, filtrar, abrir detalhe, salvar na lista — completável sem mouse. Trilhos respondem às setas; `Home`/`End` vão ao começo e ao fim.
2. **Foco.** Indicador de foco visível em todo elemento interativo, com contraste próprio. O modal do `ProviderPicker` prende o foco enquanto aberto, fecha com `Esc` e devolve o foco ao elemento que o abriu.
3. **Contraste.** Mínimo 4,5:1 para texto e 3:1 para elementos de interface. Atenção especial a texto sobre pôster ou backdrop, onde o fundo é imprevisível: exige camada de contraste, não sorte.
4. **Imagens.** Pôster com `alt` descritivo (`"Pôster de <título>"`); imagens decorativas com `alt=""`.
5. **Estrutura.** Um `h1` por página, hierarquia de títulos sem saltos, marcos semânticos (`nav`, `main`, `footer`) e link "pular para o conteúdo".
6. **Conteúdo dinâmico.** Resultados de busca e de filtro anunciados por região `aria-live="polite"`. Estado do `WatchlistButton` exposto por `aria-pressed`.
7. **Movimento.** `prefers-reduced-motion` respeitado em toda transição e rolagem animada.
8. **Alternativa ao scroll infinito.** Botão "carregar mais" sempre disponível — scroll infinito puro deixa o rodapé inalcançável por teclado.
9. **Verificação automatizada.** `axe-core` roda nos testes de componente das telas principais; nenhuma violação de nível A ou AA passa.

---

## 13. Estratégia de testes

Vitest + Testing Library, com o TMDB interceptado por MSW usando fixtures capturadas da API real. Nenhum teste depende de rede ou da chave de API.

Desenvolvimento em **TDD**: teste antes da implementação.

### Prioridades

1. **`mappers.ts`** — campos nulos, arrays ausentes, `watch/providers` sem a região BR. É onde os bugs de integração realmente moram.
2. **Construção de consultas do `/discover`** — em especial a união por `|` para múltiplos provedores (§6).
3. **`lib/storage.ts`** — leitura, escrita, versionamento e o caso do `localStorage` indisponível.
4. **Componentes** — `MovieCard` e `ProviderPicker`, em renderização e interação, incluindo teclado.
5. **Acessibilidade** — `axe-core` nas telas principais (§12.9).

---

## 14. Estrutura de diretórios

```
app/
  layout.tsx
  page.tsx                  # Home
  explorar/page.tsx
  filme/[id]/page.tsx
  busca/page.tsx
  minha-lista/page.tsx
components/
  movie-card.tsx  movie-rail.tsx  movie-grid.tsx
  provider-picker.tsx  filter-bar.tsx
  watch-provider-block.tsx  watchlist-button.tsx
  empty-state.tsx  skeletons.tsx
lib/
  tmdb/    client.ts types.ts mappers.ts discover.ts movies.ts providers.ts genres.ts images.ts
  storage.ts  hooks/
test/
  fixtures/  msw/
docs/superpowers/specs/
```

---

## 15. Configuração

| Variável | Descrição |
|---|---|
| `TMDB_ACCESS_TOKEN` | API Read Access Token do TMDB. **Server-only**, sem prefixo `NEXT_PUBLIC_` |

`next.config` autoriza `image.tmdb.org` em `images.remotePatterns`. Deploy na Vercel com a variável definida no painel.

---

## 16. Definição de pronto (v1)

- [ ] Primeira visita leva à seleção de serviços; escolha persistida
- [ ] Home renderiza os cinco trilhos filtrados pelos serviços do usuário
- [ ] Explorar filtra e ordena com estado na URL
- [ ] Detalhe mostra "onde assistir" separado em assinatura / aluguel / compra
- [ ] Busca por título funciona com badges de disponibilidade
- [ ] Watchlist adiciona, remove e persiste
- [ ] Todos os estados de erro e vazios de §10 implementados
- [ ] Critérios de acessibilidade de §12 verificados, `axe` sem violações
- [ ] Suíte de testes verde
- [ ] Atribuição do TMDB no rodapé (§3.5)
- [ ] Deploy público funcionando
