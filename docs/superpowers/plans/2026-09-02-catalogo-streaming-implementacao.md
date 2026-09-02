# Catálogo de Streamings — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um web app Next.js de descoberta de filmes que mostra apenas títulos disponíveis nos serviços de streaming que o usuário assina, usando a API do TMDB.

**Architecture:** Sem backend próprio e sem banco. Server Components chamam o TMDB através de uma única camada (`lib/tmdb/`) que devolve tipos do domínio, nunca JSON cru. A chave da API fica server-only; preferências do usuário vivem no `localStorage` e viajam para o servidor como parâmetros de URL. O cache do próprio Next segura as respostas por 12h a 7 dias conforme a volatilidade do dado.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript estrito · Tailwind CSS · Vitest · Testing Library · MSW v2 · jest-axe · Vercel

**Spec:** [`docs/superpowers/specs/2026-09-01-catalogo-streaming-design.md`](../specs/2026-09-01-catalogo-streaming-design.md)

## Global Constraints

- **Região e idioma fixos:** `watch_region=BR`, `language=pt-BR` em toda chamada ao TMDB.
- **Token server-only:** `TMDB_ACCESS_TOKEN`, jamais com prefixo `NEXT_PUBLIC_`, jamais importado por Client Component.
- **Múltiplos provedores unem-se por `|`** em `with_watch_providers` (OU lógico). Usar `,` produz E lógico e devolve o catálogo errado em silêncio.
- **`with_watch_providers` exige `watch_region`** na mesma requisição.
- **Monetização padrão:** `with_watch_monetization_types=flatrate` (incluso na assinatura) em todas as consultas de descoberta.
- **Nenhum componente fora de `lib/tmdb/` conhece a forma do JSON do TMDB.**
- **TypeScript em modo estrito.** Sem `any` implícito ou explícito no código de produção.
- **Acessibilidade WCAG 2.1 AA** é critério de aceitação, não polimento: teclado, foco visível, contraste 4.5:1, `alt` descritivo.
- **Textos de interface em português do Brasil.**
- **Atribuição obrigatória** no rodapé: "This product uses the TMDB API but is not endorsed or certified by TMDB."
- **Commits em português**, no formato `tipo: descrição`, ao fim de cada tarefa.

---

## Decisão de projeto tomada durante o planejamento

O endpoint `/discover/movie` **filtra** por provedor mas **não informa** em quais serviços cada filme está. Anotar cada card com badges exigiria uma requisição por filme.

A resolução: na Home e no Explorar os badges são redundantes — todo resultado ali já está restrito aos serviços do usuário por construção. Eles só têm valor na **Busca**, que não é filtrada por provedor. Portanto `MovieCard` recebe `availability` como propriedade **opcional**; apenas a Busca a preenche, usando `getMovieProviders(id)` com cache de 24h.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/tmdb/config.ts` | Constantes de região, idioma e tempos de cache |
| `lib/tmdb/types.ts` | Tipos do domínio |
| `lib/tmdb/client.ts` | `fetch` autenticado, cache, retry, erros |
| `lib/tmdb/images.ts` | Montagem de URL de imagem |
| `lib/tmdb/mappers.ts` | JSON do TMDB → tipos do domínio |
| `lib/tmdb/providers.ts` | Lista de provedores da região |
| `lib/tmdb/genres.ts` | Lista de gêneros |
| `lib/tmdb/discover.ts` | Consulta de descoberta e construção de parâmetros |
| `lib/tmdb/movies.ts` | Detalhe, busca e disponibilidade por filme |
| `lib/storage.ts` | Leitura e escrita de preferências no `localStorage` |
| `lib/hooks/use-preferences.ts` | Hook seguro para hidratação |
| `lib/rails.ts` | Definição dos trilhos da Home |
| `components/*.tsx` | Componentes de interface |
| `app/**/page.tsx` | Rotas |
| `test/msw/*` | Servidor e handlers de mock |
| `test/fixtures/*` | Respostas reais capturadas do TMDB |

---

## Task 1: Scaffold do projeto e infraestrutura de testes

**Files:**
- Create: todo o esqueleto Next.js na raiz do repositório
- Create: `vitest.config.ts`, `test/setup.ts`, `test/stubs/server-only.ts`
- Create: `test/smoke.test.ts`
- Modify: `.gitignore` (mesclar com o gerado pelo Next)

**Interfaces:**
- Consumes: nada
- Produces: projeto executável com `npm run dev`, suíte executável com `npm test`, alias `@/` apontando para a raiz

**Atenção:** o diretório já contém `README.md`, `.gitignore`, `.env.example` e `docs/`. O `create-next-app` recusa diretórios com arquivos conflitantes, então o scaffold é gerado fora e movido para dentro.

- [ ] **Step 1: Gerar o scaffold numa pasta temporária**

```bash
cd ..
npx create-next-app@latest _scaffold_tmp \
  --typescript --tailwind --eslint --app \
  --no-src-dir --import-alias "@/*" --use-npm --yes
```

- [ ] **Step 2: Mover o scaffold para o repositório, preservando os arquivos existentes**

```bash
cd _scaffold_tmp
rm README.md .gitignore
cp -r . ../catalogo-streaming/
cd ../catalogo-streaming
rm -rf ../_scaffold_tmp
```

- [ ] **Step 3: Mesclar as regras do Next no `.gitignore`**

Acrescente ao final de `.gitignore` (o arquivo já cobre `node_modules/`, `.next/`, `.env*` — adicione apenas o que faltar):

```gitignore
# next
.next/
next-env.d.ts
```

- [ ] **Step 4: Instalar as dependências de teste**

```bash
npm install -D vitest @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  msw jest-axe @types/jest-axe
```

- [ ] **Step 5: Criar o stub do módulo `server-only`**

O pacote `server-only` existe para quebrar o build quando código de servidor vaza para o cliente. Sob o Vitest ele não tem contexto de build e falha ao resolver, então os testes o substituem por um módulo vazio.

Crie `test/stubs/server-only.ts`:

```ts
// Substitui o pacote `server-only` durante os testes.
// Em produção ele impede que código de servidor seja importado pelo cliente;
// no Vitest não há essa distinção, então um módulo vazio basta.
export {}
```

- [ ] **Step 6: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      'server-only': fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)),
    },
  },
})
```

- [ ] **Step 7: Criar `test/setup.ts`**

`next/image` depende do compilador do Next, que não roda no Vitest. O mock abaixo o reduz a um `<img>`, que é o que os testes precisam verificar.

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import * as matchers from 'jest-axe/extend-expect'

afterEach(() => {
  cleanup()
})

vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...rest} />
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

export { matchers }
```

Renomeie o arquivo para `test/setup.tsx` (contém JSX) e ajuste `setupFiles` em `vitest.config.ts` para `'./test/setup.tsx'`.

- [ ] **Step 8: Adicionar o script de teste ao `package.json`**

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 9: Escrever o teste de fumaça**

Crie `test/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('infraestrutura de testes', () => {
  it('executa um teste e resolve o alias @', async () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 10: Rodar a suíte**

Run: `npm test`
Expected: PASS — 1 teste, 1 arquivo.

- [ ] **Step 11: Verificar que o projeto compila**

Run: `npm run build`
Expected: build concluído sem erros.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js com Tailwind, Vitest, Testing Library e MSW"
```

---

## Task 2: Configuração e cliente HTTP do TMDB

**Files:**
- Create: `lib/tmdb/config.ts`
- Create: `lib/tmdb/client.ts`
- Test: `lib/tmdb/client.test.ts`
- Create: `test/msw/server.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `WATCH_REGION: 'BR'`, `LANGUAGE: 'pt-BR'`, `CACHE: { providers: number; genres: number; discover: number; detail: number; search: false }`
  - `class TmdbError extends Error { status: number }`
  - `tmdbFetch<T>(path: string, options: { params?: Record<string, string | number | undefined>; revalidate: number | false; retryBaseMs?: number }): Promise<T>`

- [ ] **Step 1: Escrever os testes que falham**

Crie `test/msw/server.ts`:

```ts
import { setupServer } from 'msw/node'

export const server = setupServer()
```

Crie `lib/tmdb/client.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { TmdbError, tmdbFetch } from './client'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

beforeEach(() => {
  process.env.TMDB_ACCESS_TOKEN = 'token-de-teste'
})

describe('tmdbFetch', () => {
  it('envia o token no header Authorization', async () => {
    let recebido: string | null = null
    server.use(
      http.get('https://api.themoviedb.org/3/teste', ({ request }) => {
        recebido = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )

    await tmdbFetch('/teste', { revalidate: 60 })

    expect(recebido).toBe('Bearer token-de-teste')
  })

  it('aplica o idioma pt-BR em toda requisicao', async () => {
    let url = ''
    server.use(
      http.get('https://api.themoviedb.org/3/teste', ({ request }) => {
        url = request.url
        return HttpResponse.json({ ok: true })
      }),
    )

    await tmdbFetch('/teste', { revalidate: 60 })

    expect(new URL(url).searchParams.get('language')).toBe('pt-BR')
  })

  it('serializa os parametros e ignora os indefinidos', async () => {
    let url = ''
    server.use(
      http.get('https://api.themoviedb.org/3/teste', ({ request }) => {
        url = request.url
        return HttpResponse.json({ ok: true })
      }),
    )

    await tmdbFetch('/teste', {
      revalidate: 60,
      params: { page: 2, genero: undefined, texto: 'oi' },
    })

    const params = new URL(url).searchParams
    expect(params.get('page')).toBe('2')
    expect(params.get('texto')).toBe('oi')
    expect(params.has('genero')).toBe(false)
  })

  it('devolve o corpo em JSON tipado', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/teste', () =>
        HttpResponse.json({ nome: 'Duna' }),
      ),
    )

    const resultado = await tmdbFetch<{ nome: string }>('/teste', { revalidate: 60 })

    expect(resultado.nome).toBe('Duna')
  })

  it('repete a requisicao apos um 429 e devolve o segundo resultado', async () => {
    let tentativas = 0
    server.use(
      http.get('https://api.themoviedb.org/3/teste', () => {
        tentativas += 1
        if (tentativas === 1) {
          return new HttpResponse(null, { status: 429, headers: { 'retry-after': '0' } })
        }
        return HttpResponse.json({ ok: true })
      }),
    )

    const resultado = await tmdbFetch<{ ok: boolean }>('/teste', {
      revalidate: 60,
      retryBaseMs: 0,
    })

    expect(tentativas).toBe(2)
    expect(resultado.ok).toBe(true)
  })

  it('repete uma unica vez apos um 500 e entao desiste', async () => {
    let tentativas = 0
    server.use(
      http.get('https://api.themoviedb.org/3/teste', () => {
        tentativas += 1
        return new HttpResponse(null, { status: 500 })
      }),
    )

    await expect(
      tmdbFetch('/teste', { revalidate: 60, retryBaseMs: 0 }),
    ).rejects.toBeInstanceOf(TmdbError)

    expect(tentativas).toBe(2)
  })

  it('nao repete em erro 404 e expoe o status', async () => {
    let tentativas = 0
    server.use(
      http.get('https://api.themoviedb.org/3/teste', () => {
        tentativas += 1
        return new HttpResponse(null, { status: 404 })
      }),
    )

    await expect(
      tmdbFetch('/teste', { revalidate: 60, retryBaseMs: 0 }),
    ).rejects.toMatchObject({ status: 404 })

    expect(tentativas).toBe(1)
  })

  it('falha com mensagem clara quando o token nao esta configurado', async () => {
    delete process.env.TMDB_ACCESS_TOKEN

    await expect(tmdbFetch('/teste', { revalidate: 60 })).rejects.toThrow(
      /TMDB_ACCESS_TOKEN/,
    )
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `npx vitest run lib/tmdb/client.test.ts`
Expected: FAIL — não existe o módulo `./client`.

- [ ] **Step 3: Implementar `lib/tmdb/config.ts`**

```ts
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

export const WATCH_REGION = 'BR'
export const LANGUAGE = 'pt-BR'

const HORA = 60 * 60

/** Tempo de revalidação por tipo de dado, em segundos. */
export const CACHE = {
  providers: 7 * 24 * HORA,
  genres: 7 * 24 * HORA,
  discover: 12 * HORA,
  detail: 24 * HORA,
  search: false,
} as const
```

- [ ] **Step 4: Implementar `lib/tmdb/client.ts`**

```ts
import 'server-only'
import { LANGUAGE, TMDB_BASE_URL } from './config'

export class TmdbError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'TmdbError'
    this.status = status
  }
}

type RequestOptions = {
  params?: Record<string, string | number | undefined>
  /** Segundos de cache, ou false para nunca cachear. */
  revalidate: number | false
  /** Base do backoff. Os testes passam 0 para não esperar. */
  retryBaseMs?: number
}

function montarUrl(path: string, params: RequestOptions['params']): string {
  const url = new URL(TMDB_BASE_URL + path)
  url.searchParams.set('language', LANGUAGE)

  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor === undefined || valor === '') continue
    url.searchParams.set(chave, String(valor))
  }

  return url.toString()
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Faz uma requisição autenticada ao TMDB.
 *
 * Repete uma vez em 429 (respeitando Retry-After) e uma vez em 5xx.
 * Erros 4xx que não sejam 429 falham imediatamente: repetir não ajudaria.
 */
export async function tmdbFetch<T>(path: string, options: RequestOptions): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN
  if (!token) {
    throw new Error(
      'TMDB_ACCESS_TOKEN não configurado. Copie .env.example para .env.local e preencha o token.',
    )
  }

  const url = montarUrl(path, options.params)
  const retryBaseMs = options.retryBaseMs ?? 500
  const maxTentativas = 2

  let ultimoErro: TmdbError | null = null

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa += 1) {
    const resposta = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      next: options.revalidate === false
        ? { revalidate: 0 }
        : { revalidate: options.revalidate },
    })

    if (resposta.ok) {
      return (await resposta.json()) as T
    }

    ultimoErro = new TmdbError(
      `TMDB respondeu ${resposta.status} para ${path}`,
      resposta.status,
    )

    const podeRepetir = resposta.status === 429 || resposta.status >= 500
    if (!podeRepetir || tentativa === maxTentativas) {
      throw ultimoErro
    }

    const retryAfter = Number(resposta.headers.get('retry-after') ?? '0')
    const espera = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : retryBaseMs * tentativa

    await esperar(espera)
  }

  throw ultimoErro ?? new TmdbError(`Falha ao consultar ${path}`, 0)
}
```

- [ ] **Step 5: Rodar os testes**

Run: `npx vitest run lib/tmdb/client.test.ts`
Expected: PASS — 8 testes.

- [ ] **Step 6: Commit**

```bash
git add lib/tmdb/config.ts lib/tmdb/client.ts lib/tmdb/client.test.ts test/msw/server.ts
git commit -m "feat: cliente HTTP do TMDB com cache, retry e erros tipados"
```

---

## Task 3: Tipos do domínio, URLs de imagem e mappers

**Files:**
- Create: `lib/tmdb/types.ts`, `lib/tmdb/images.ts`, `lib/tmdb/mappers.ts`
- Test: `lib/tmdb/images.test.ts`, `lib/tmdb/mappers.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - Tipos `Movie`, `MovieDetail`, `Provider`, `WatchOptions`, `Genre`, `CastMember`, `Page<T>`, `DiscoverFilters`, `SortBy`
  - `posterUrl(path, size)`, `backdropUrl(path)`, `logoUrl(path)`
  - `toMovie(raw)`, `toMovieDetail(raw)`, `toProvider(raw)`, `toWatchOptions(raw)`

Este é o ponto onde os bugs de integração realmente moram: campos nulos e arrays ausentes. Os testes atacam exatamente isso.

- [ ] **Step 1: Escrever `lib/tmdb/images.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { backdropUrl, logoUrl, posterUrl } from './images'

describe('URLs de imagem', () => {
  it('monta a URL do poster no tamanho pedido', () => {
    expect(posterUrl('/abc.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg')
  })

  it('devolve null quando o filme nao tem poster', () => {
    expect(posterUrl(null, 'w342')).toBeNull()
    expect(posterUrl(undefined, 'w342')).toBeNull()
  })

  it('usa w780 para backdrop e w92 para logo de provedor', () => {
    expect(backdropUrl('/bg.jpg')).toBe('https://image.tmdb.org/t/p/w780/bg.jpg')
    expect(logoUrl('/netflix.jpg')).toBe('https://image.tmdb.org/t/p/w92/netflix.jpg')
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run lib/tmdb/images.test.ts`
Expected: FAIL — módulo `./images` não existe.

- [ ] **Step 3: Implementar `lib/tmdb/types.ts`**

```ts
export type SortBy = 'popularity' | 'rating' | 'releaseDate'

export type Genre = {
  id: number
  name: string
}

export type Movie = {
  id: number
  title: string
  originalTitle: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  releaseYear: number | null
  rating: number | null
  voteCount: number
  genreIds: number[]
}

export type CastMember = {
  id: number
  name: string
  character: string
  profileUrl: string | null
}

export type Provider = {
  id: number
  name: string
  logoUrl: string | null
  displayPriority: number
}

export type WatchOptions = {
  flatrate: Provider[]
  rent: Provider[]
  buy: Provider[]
  tmdbLink: string | null
}

export type MovieDetail = Movie & {
  runtimeMinutes: number | null
  genres: Genre[]
  cast: CastMember[]
  trailerYoutubeKey: string | null
  watchOptions: WatchOptions
}

export type Page<T> = {
  items: T[]
  page: number
  totalPages: number
  totalResults: number
}

export type DiscoverFilters = {
  providerIds: number[]
  genreId?: number
  decade?: number
  minRating?: number
  sortBy: SortBy
  page: number
}
```

- [ ] **Step 4: Implementar `lib/tmdb/images.ts`**

```ts
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export type PosterSize = 'w185' | 'w342' | 'w500'

function montar(path: string | null | undefined, size: string): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function posterUrl(path: string | null | undefined, size: PosterSize): string | null {
  return montar(path, size)
}

export function backdropUrl(path: string | null | undefined): string | null {
  return montar(path, 'w780')
}

export function logoUrl(path: string | null | undefined): string | null {
  return montar(path, 'w92')
}

export function profileUrl(path: string | null | undefined): string | null {
  return montar(path, 'w185')
}
```

- [ ] **Step 5: Rodar os testes de imagem**

Run: `npx vitest run lib/tmdb/images.test.ts`
Expected: PASS — 3 testes.

- [ ] **Step 6: Escrever `lib/tmdb/mappers.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { toMovie, toMovieDetail, toProvider, toWatchOptions } from './mappers'

const filmeCru = {
  id: 693134,
  title: 'Duna: Parte 2',
  original_title: 'Dune: Part Two',
  overview: 'Paul Atreides se une aos Fremen.',
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '2024-02-27',
  vote_average: 8.2,
  vote_count: 4521,
  genre_ids: [878, 12],
}

describe('toMovie', () => {
  it('traduz um filme completo', () => {
    const filme = toMovie(filmeCru)

    expect(filme).toEqual({
      id: 693134,
      title: 'Duna: Parte 2',
      originalTitle: 'Dune: Part Two',
      overview: 'Paul Atreides se une aos Fremen.',
      posterUrl: 'https://image.tmdb.org/t/p/w342/poster.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
      releaseYear: 2024,
      rating: 8.2,
      voteCount: 4521,
      genreIds: [878, 12],
    })
  })

  it('devolve posterUrl null quando o filme nao tem poster', () => {
    expect(toMovie({ ...filmeCru, poster_path: null }).posterUrl).toBeNull()
  })

  it('devolve releaseYear null quando a data esta vazia', () => {
    expect(toMovie({ ...filmeCru, release_date: '' }).releaseYear).toBeNull()
    expect(toMovie({ ...filmeCru, release_date: undefined }).releaseYear).toBeNull()
  })

  it('trata nota zero como ausencia de nota', () => {
    // O TMDB devolve 0 para filmes sem nenhum voto; exibir "0.0" enganaria.
    expect(toMovie({ ...filmeCru, vote_average: 0, vote_count: 0 }).rating).toBeNull()
  })

  it('sobrevive a genre_ids ausente', () => {
    expect(toMovie({ ...filmeCru, genre_ids: undefined }).genreIds).toEqual([])
  })

  it('sobrevive a overview ausente', () => {
    expect(toMovie({ ...filmeCru, overview: undefined }).overview).toBe('')
  })
})

describe('toProvider', () => {
  it('traduz um provedor', () => {
    const provedor = toProvider({
      provider_id: 8,
      provider_name: 'Netflix',
      logo_path: '/netflix.jpg',
      display_priority: 1,
    })

    expect(provedor).toEqual({
      id: 8,
      name: 'Netflix',
      logoUrl: 'https://image.tmdb.org/t/p/w92/netflix.jpg',
      displayPriority: 1,
    })
  })

  it('aceita provedor sem logo e sem prioridade', () => {
    const provedor = toProvider({ provider_id: 99, provider_name: 'Servico X' })
    expect(provedor.logoUrl).toBeNull()
    expect(provedor.displayPriority).toBe(999)
  })
})

describe('toWatchOptions', () => {
  it('separa assinatura, aluguel e compra da regiao BR', () => {
    const opcoes = toWatchOptions({
      results: {
        BR: {
          link: 'https://www.themoviedb.org/movie/1/watch',
          flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 }],
          rent: [{ provider_id: 2, provider_name: 'Apple TV', logo_path: '/a.jpg', display_priority: 2 }],
          buy: [{ provider_id: 3, provider_name: 'Google Play', logo_path: '/g.jpg', display_priority: 3 }],
        },
      },
    })

    expect(opcoes.flatrate.map((p) => p.name)).toEqual(['Netflix'])
    expect(opcoes.rent.map((p) => p.name)).toEqual(['Apple TV'])
    expect(opcoes.buy.map((p) => p.name)).toEqual(['Google Play'])
    expect(opcoes.tmdbLink).toBe('https://www.themoviedb.org/movie/1/watch')
  })

  it('devolve listas vazias quando a regiao BR nao existe', () => {
    // Caso comum: filme disponivel nos EUA mas nao no Brasil.
    const opcoes = toWatchOptions({ results: { US: { flatrate: [] } } })

    expect(opcoes.flatrate).toEqual([])
    expect(opcoes.rent).toEqual([])
    expect(opcoes.buy).toEqual([])
    expect(opcoes.tmdbLink).toBeNull()
  })

  it('devolve listas vazias quando results esta ausente', () => {
    expect(toWatchOptions({}).flatrate).toEqual([])
    expect(toWatchOptions(undefined).flatrate).toEqual([])
  })

  it('ordena cada lista por display_priority', () => {
    const opcoes = toWatchOptions({
      results: {
        BR: {
          flatrate: [
            { provider_id: 2, provider_name: 'B', display_priority: 5 },
            { provider_id: 1, provider_name: 'A', display_priority: 1 },
          ],
        },
      },
    })

    expect(opcoes.flatrate.map((p) => p.name)).toEqual(['A', 'B'])
  })
})

describe('toMovieDetail', () => {
  const detalheCru = {
    ...filmeCru,
    runtime: 166,
    genres: [{ id: 878, name: 'Ficção científica' }],
    credits: {
      cast: Array.from({ length: 15 }, (_, i) => ({
        id: i,
        name: `Ator ${i}`,
        character: `Personagem ${i}`,
        profile_path: '/p.jpg',
      })),
    },
    videos: {
      results: [
        { key: 'abc123', site: 'YouTube', type: 'Trailer', official: true },
      ],
    },
    'watch/providers': { results: { BR: { flatrate: [] } } },
  }

  it('limita o elenco aos dez primeiros', () => {
    expect(toMovieDetail(detalheCru).cast).toHaveLength(10)
  })

  it('escolhe o trailer oficial do YouTube', () => {
    expect(toMovieDetail(detalheCru).trailerYoutubeKey).toBe('abc123')
  })

  it('devolve trailer null quando nao ha video do YouTube', () => {
    const semVideo = { ...detalheCru, videos: { results: [{ key: 'x', site: 'Vimeo', type: 'Trailer' }] } }
    expect(toMovieDetail(semVideo).trailerYoutubeKey).toBeNull()
  })

  it('sobrevive a credits, videos e watch/providers ausentes', () => {
    const minimo = { ...filmeCru, runtime: null }
    const detalhe = toMovieDetail(minimo)

    expect(detalhe.cast).toEqual([])
    expect(detalhe.genres).toEqual([])
    expect(detalhe.trailerYoutubeKey).toBeNull()
    expect(detalhe.watchOptions.flatrate).toEqual([])
    expect(detalhe.runtimeMinutes).toBeNull()
  })
})
```

- [ ] **Step 7: Rodar para confirmar a falha**

Run: `npx vitest run lib/tmdb/mappers.test.ts`
Expected: FAIL — módulo `./mappers` não existe.

- [ ] **Step 8: Implementar `lib/tmdb/mappers.ts`**

```ts
import { WATCH_REGION } from './config'
import { backdropUrl, logoUrl, posterUrl, profileUrl } from './images'
import type {
  CastMember,
  Genre,
  Movie,
  MovieDetail,
  Provider,
  WatchOptions,
} from './types'

/**
 * Formas cruas do TMDB. Ficam neste arquivo de propósito: é o único
 * lugar do sistema que pode conhecer o formato da API.
 */
type RawProvider = {
  provider_id: number
  provider_name: string
  logo_path?: string | null
  display_priority?: number
}

type RawMovie = {
  id: number
  title: string
  original_title?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  vote_average?: number
  vote_count?: number
  genre_ids?: number[]
}

type RawWatchProviders = {
  results?: Record<string, {
    link?: string
    flatrate?: RawProvider[]
    rent?: RawProvider[]
    buy?: RawProvider[]
  }>
}

type RawMovieDetail = RawMovie & {
  runtime?: number | null
  genres?: Genre[]
  credits?: { cast?: Array<{ id: number; name: string; character?: string; profile_path?: string | null }> }
  videos?: { results?: Array<{ key: string; site?: string; type?: string; official?: boolean }> }
  'watch/providers'?: RawWatchProviders
}

function anoDe(data: string | undefined): number | null {
  if (!data) return null
  const ano = Number(data.slice(0, 4))
  return Number.isFinite(ano) && ano > 0 ? ano : null
}

export function toMovie(raw: RawMovie): Movie {
  const voteCount = raw.vote_count ?? 0

  return {
    id: raw.id,
    title: raw.title,
    originalTitle: raw.original_title ?? raw.title,
    overview: raw.overview ?? '',
    posterUrl: posterUrl(raw.poster_path, 'w342'),
    backdropUrl: backdropUrl(raw.backdrop_path),
    releaseYear: anoDe(raw.release_date),
    // O TMDB devolve 0 para filmes sem votos; exibir "0.0" seria enganoso.
    rating: voteCount > 0 && raw.vote_average ? raw.vote_average : null,
    voteCount,
    genreIds: raw.genre_ids ?? [],
  }
}

export function toProvider(raw: RawProvider): Provider {
  return {
    id: raw.provider_id,
    name: raw.provider_name,
    logoUrl: logoUrl(raw.logo_path),
    displayPriority: raw.display_priority ?? 999,
  }
}

function listaDeProvedores(lista: RawProvider[] | undefined): Provider[] {
  return (lista ?? [])
    .map(toProvider)
    .sort((a, b) => a.displayPriority - b.displayPriority)
}

export function toWatchOptions(raw: RawWatchProviders | undefined): WatchOptions {
  const regiao = raw?.results?.[WATCH_REGION]

  return {
    flatrate: listaDeProvedores(regiao?.flatrate),
    rent: listaDeProvedores(regiao?.rent),
    buy: listaDeProvedores(regiao?.buy),
    tmdbLink: regiao?.link ?? null,
  }
}

function toCast(raw: RawMovieDetail['credits']): CastMember[] {
  return (raw?.cast ?? []).slice(0, 10).map((pessoa) => ({
    id: pessoa.id,
    name: pessoa.name,
    character: pessoa.character ?? '',
    profileUrl: profileUrl(pessoa.profile_path),
  }))
}

function trailerDe(raw: RawMovieDetail['videos']): string | null {
  const videos = raw?.results ?? []
  const doYoutube = videos.filter((v) => v.site === 'YouTube')
  const oficial = doYoutube.find((v) => v.type === 'Trailer' && v.official)
  const qualquerTrailer = doYoutube.find((v) => v.type === 'Trailer')

  return (oficial ?? qualquerTrailer ?? doYoutube[0])?.key ?? null
}

export function toMovieDetail(raw: RawMovieDetail): MovieDetail {
  return {
    ...toMovie(raw),
    runtimeMinutes: raw.runtime && raw.runtime > 0 ? raw.runtime : null,
    genres: raw.genres ?? [],
    cast: toCast(raw.credits),
    trailerYoutubeKey: trailerDe(raw.videos),
    watchOptions: toWatchOptions(raw['watch/providers']),
  }
}
```

- [ ] **Step 9: Rodar os testes**

Run: `npx vitest run lib/tmdb/`
Expected: PASS — todos os testes de client, images e mappers.

- [ ] **Step 10: Commit**

```bash
git add lib/tmdb/types.ts lib/tmdb/images.ts lib/tmdb/mappers.ts lib/tmdb/images.test.ts lib/tmdb/mappers.test.ts
git commit -m "feat: tipos do dominio e traducao das respostas do TMDB"
```

---

## Task 4: Provedores e gêneros

**Files:**
- Create: `lib/tmdb/providers.ts`, `lib/tmdb/genres.ts`
- Test: `lib/tmdb/providers.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `toProvider`, `CACHE`, `WATCH_REGION`
- Produces: `getProviders(): Promise<Provider[]>`, `getGenres(): Promise<Genre[]>`

- [ ] **Step 1: Escrever o teste que falha**

Crie `lib/tmdb/providers.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { getProviders } from './providers'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
beforeEach(() => {
  process.env.TMDB_ACCESS_TOKEN = 'token-de-teste'
})

describe('getProviders', () => {
  it('consulta a regiao BR e devolve provedores ordenados por prioridade', async () => {
    let url = ''
    server.use(
      http.get('https://api.themoviedb.org/3/watch/providers/movie', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          results: [
            { provider_id: 119, provider_name: 'Amazon Prime Video', logo_path: '/a.jpg', display_priority: 3 },
            { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 },
          ],
        })
      }),
    )

    const provedores = await getProviders()

    expect(new URL(url).searchParams.get('watch_region')).toBe('BR')
    expect(provedores.map((p) => p.name)).toEqual(['Netflix', 'Amazon Prime Video'])
  })

  it('devolve lista vazia quando results esta ausente', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/watch/providers/movie', () =>
        HttpResponse.json({}),
      ),
    )

    expect(await getProviders()).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run lib/tmdb/providers.test.ts`
Expected: FAIL — módulo `./providers` não existe.

- [ ] **Step 3: Implementar `lib/tmdb/providers.ts`**

```ts
import 'server-only'
import { tmdbFetch } from './client'
import { CACHE, WATCH_REGION } from './config'
import { toProvider } from './mappers'
import type { Provider } from './types'

type Resposta = {
  results?: Array<{
    provider_id: number
    provider_name: string
    logo_path?: string | null
    display_priority?: number
  }>
}

/** Provedores de filmes disponíveis na região configurada, do mais relevante ao menos. */
export async function getProviders(): Promise<Provider[]> {
  const resposta = await tmdbFetch<Resposta>('/watch/providers/movie', {
    params: { watch_region: WATCH_REGION },
    revalidate: CACHE.providers,
  })

  return (resposta.results ?? [])
    .map(toProvider)
    .sort((a, b) => a.displayPriority - b.displayPriority)
}
```

- [ ] **Step 4: Implementar `lib/tmdb/genres.ts`**

```ts
import 'server-only'
import { tmdbFetch } from './client'
import { CACHE } from './config'
import type { Genre } from './types'

type Resposta = { genres?: Genre[] }

export async function getGenres(): Promise<Genre[]> {
  const resposta = await tmdbFetch<Resposta>('/genre/movie/list', {
    revalidate: CACHE.genres,
  })

  return resposta.genres ?? []
}
```

- [ ] **Step 5: Rodar os testes**

Run: `npx vitest run lib/tmdb/providers.test.ts`
Expected: PASS — 2 testes.

- [ ] **Step 6: Commit**

```bash
git add lib/tmdb/providers.ts lib/tmdb/genres.ts lib/tmdb/providers.test.ts
git commit -m "feat: consulta de provedores e generos do TMDB"
```

---

## Task 5: Descoberta — construção de parâmetros e consulta

**Files:**
- Create: `lib/tmdb/discover.ts`
- Test: `lib/tmdb/discover.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `toMovie`, `CACHE`, `WATCH_REGION`, `DiscoverFilters`, `Page`, `Movie`
- Produces:
  - `buildDiscoverParams(filters: DiscoverFilters): Record<string, string>`
  - `discoverMovies(filters: DiscoverFilters): Promise<Page<Movie>>`

Esta é a tarefa mais sensível do projeto. A união por `|` é a diferença entre "filmes na Netflix **ou** no Prime" e "filmes na Netflix **e** no Prime" — e a segunda leitura devolve quase nada, silenciosamente.

- [ ] **Step 1: Escrever o teste que falha**

Crie `lib/tmdb/discover.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { buildDiscoverParams, discoverMovies } from './discover'
import type { DiscoverFilters } from './types'

const base: DiscoverFilters = {
  providerIds: [8],
  sortBy: 'popularity',
  page: 1,
}

describe('buildDiscoverParams', () => {
  it('fixa regiao, monetizacao e pagina', () => {
    const params = buildDiscoverParams(base)

    expect(params.watch_region).toBe('BR')
    expect(params.with_watch_monetization_types).toBe('flatrate')
    expect(params.page).toBe('1')
  })

  it('une multiplos provedores com | (OU logico)', () => {
    // Usar virgula produziria E logico e devolveria quase nada.
    const params = buildDiscoverParams({ ...base, providerIds: [8, 119, 337] })

    expect(params.with_watch_providers).toBe('8|119|337')
  })

  it('omite with_watch_providers quando nenhum servico foi escolhido', () => {
    const params = buildDiscoverParams({ ...base, providerIds: [] })

    expect(params.with_watch_providers).toBeUndefined()
  })

  it('traduz cada ordenacao para o parametro do TMDB', () => {
    expect(buildDiscoverParams({ ...base, sortBy: 'popularity' }).sort_by).toBe('popularity.desc')
    expect(buildDiscoverParams({ ...base, sortBy: 'rating' }).sort_by).toBe('vote_average.desc')
    expect(buildDiscoverParams({ ...base, sortBy: 'releaseDate' }).sort_by).toBe('primary_release_date.desc')
  })

  it('exige minimo de votos ao ordenar por nota', () => {
    // Sem isso, o topo da lista vira filme obscuro com um unico voto 10.
    const params = buildDiscoverParams({ ...base, sortBy: 'rating' })

    expect(params['vote_count.gte']).toBe('300')
  })

  it('converte decada em intervalo de datas', () => {
    const params = buildDiscoverParams({ ...base, decade: 1990 })

    expect(params['primary_release_date.gte']).toBe('1990-01-01')
    expect(params['primary_release_date.lte']).toBe('1999-12-31')
  })

  it('repassa genero e nota minima quando informados', () => {
    const params = buildDiscoverParams({ ...base, genreId: 27, minRating: 7 })

    expect(params.with_genres).toBe('27')
    expect(params['vote_average.gte']).toBe('7')
  })

  it('omite filtros opcionais nao informados', () => {
    const params = buildDiscoverParams(base)

    expect(params.with_genres).toBeUndefined()
    expect(params['vote_average.gte']).toBeUndefined()
    expect(params['primary_release_date.gte']).toBeUndefined()
  })
})

describe('discoverMovies', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
  beforeEach(() => {
    process.env.TMDB_ACCESS_TOKEN = 'token-de-teste'
  })

  it('devolve uma pagina de filhos traduzidos', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/discover/movie', () =>
        HttpResponse.json({
          page: 1,
          total_pages: 42,
          total_results: 831,
          results: [
            {
              id: 1,
              title: 'Duna',
              poster_path: '/d.jpg',
              release_date: '2021-09-15',
              vote_average: 7.8,
              vote_count: 100,
              genre_ids: [878],
            },
          ],
        }),
      ),
    )

    const pagina = await discoverMovies(base)

    expect(pagina.items).toHaveLength(1)
    expect(pagina.items[0].title).toBe('Duna')
    expect(pagina.items[0].posterUrl).toBe('https://image.tmdb.org/t/p/w342/d.jpg')
    expect(pagina.totalPages).toBe(42)
    expect(pagina.totalResults).toBe(831)
  })

  it('limita totalPages a 500, teto real do endpoint', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/discover/movie', () =>
        HttpResponse.json({ page: 1, total_pages: 9999, total_results: 200000, results: [] }),
      ),
    )

    // Pedir a pagina 501 devolve erro; travar em 500 evita um caminho quebrado.
    expect((await discoverMovies(base)).totalPages).toBe(500)
  })

  it('devolve pagina vazia quando results esta ausente', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/discover/movie', () =>
        HttpResponse.json({ page: 1, total_pages: 0, total_results: 0 }),
      ),
    )

    expect((await discoverMovies(base)).items).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run lib/tmdb/discover.test.ts`
Expected: FAIL — módulo `./discover` não existe.

- [ ] **Step 3: Implementar `lib/tmdb/discover.ts`**

```ts
import 'server-only'
import { tmdbFetch } from './client'
import { CACHE, WATCH_REGION } from './config'
import { toMovie } from './mappers'
import type { DiscoverFilters, Movie, Page, SortBy } from './types'

/** O /discover do TMDB não pagina além disto. */
const MAX_PAGINAS = 500

/** Ordenar por nota sem piso de votos coloca filmes de um voto no topo. */
const VOTOS_MINIMOS_PARA_ORDENAR_POR_NOTA = 300

const ORDENACAO: Record<SortBy, string> = {
  popularity: 'popularity.desc',
  rating: 'vote_average.desc',
  releaseDate: 'primary_release_date.desc',
}

export function buildDiscoverParams(filters: DiscoverFilters): Record<string, string> {
  const params: Record<string, string> = {
    watch_region: WATCH_REGION,
    with_watch_monetization_types: 'flatrate',
    sort_by: ORDENACAO[filters.sortBy],
    page: String(filters.page),
    include_adult: 'false',
  }

  if (filters.providerIds.length > 0) {
    // O pipe significa OU. Virgula significaria E — e devolveria quase nada.
    params.with_watch_providers = filters.providerIds.join('|')
  }

  if (filters.sortBy === 'rating') {
    params['vote_count.gte'] = String(VOTOS_MINIMOS_PARA_ORDENAR_POR_NOTA)
  }

  if (filters.genreId !== undefined) {
    params.with_genres = String(filters.genreId)
  }

  if (filters.minRating !== undefined) {
    params['vote_average.gte'] = String(filters.minRating)
  }

  if (filters.decade !== undefined) {
    params['primary_release_date.gte'] = `${filters.decade}-01-01`
    params['primary_release_date.lte'] = `${filters.decade + 9}-12-31`
  }

  return params
}

type Resposta = {
  page?: number
  total_pages?: number
  total_results?: number
  results?: Parameters<typeof toMovie>[0][]
}

export async function discoverMovies(filters: DiscoverFilters): Promise<Page<Movie>> {
  const resposta = await tmdbFetch<Resposta>('/discover/movie', {
    params: buildDiscoverParams(filters),
    revalidate: CACHE.discover,
  })

  return {
    items: (resposta.results ?? []).map(toMovie),
    page: resposta.page ?? filters.page,
    totalPages: Math.min(resposta.total_pages ?? 0, MAX_PAGINAS),
    totalResults: resposta.total_results ?? 0,
  }
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run lib/tmdb/discover.test.ts`
Expected: PASS — 11 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/tmdb/discover.ts lib/tmdb/discover.test.ts
git commit -m "feat: consulta de descoberta com filtros por servico de streaming"
```

---

## Task 6: Detalhe, busca e disponibilidade por filme

**Files:**
- Create: `lib/tmdb/movies.ts`
- Test: `lib/tmdb/movies.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `toMovie`, `toMovieDetail`, `toWatchOptions`, `CACHE`
- Produces:
  - `getMovie(id: number): Promise<MovieDetail>`
  - `getMovieProviders(id: number): Promise<WatchOptions>`
  - `searchMovies(query: string, page: number): Promise<Page<Movie>>`
  - `getSimilarMovies(id: number, providerIds: number[]): Promise<Movie[]>`

- [ ] **Step 1: Escrever o teste que falha**

Crie `lib/tmdb/movies.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { getMovie, getMovieProviders, searchMovies } from './movies'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
beforeEach(() => {
  process.env.TMDB_ACCESS_TOKEN = 'token-de-teste'
})

describe('getMovie', () => {
  it('pede creditos, videos e provedores numa unica requisicao', async () => {
    let url = ''
    server.use(
      http.get('https://api.themoviedb.org/3/movie/550', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          id: 550,
          title: 'Clube da Luta',
          runtime: 139,
          vote_average: 8.4,
          vote_count: 900,
        })
      }),
    )

    const filme = await getMovie(550)

    expect(new URL(url).searchParams.get('append_to_response')).toBe(
      'credits,videos,watch/providers,similar',
    )
    expect(filme.title).toBe('Clube da Luta')
    expect(filme.runtimeMinutes).toBe(139)
  })
})

describe('getMovieProviders', () => {
  it('devolve as opcoes de onde assistir de um filme', async () => {
    server.use(
      http.get('https://api.themoviedb.org/3/movie/550/watch/providers', () =>
        HttpResponse.json({
          results: {
            BR: {
              link: 'https://www.themoviedb.org/movie/550/watch',
              flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 }],
            },
          },
        }),
      ),
    )

    const opcoes = await getMovieProviders(550)

    expect(opcoes.flatrate.map((p) => p.name)).toEqual(['Netflix'])
  })
})

describe('searchMovies', () => {
  it('envia a consulta e devolve os resultados traduzidos', async () => {
    let url = ''
    server.use(
      http.get('https://api.themoviedb.org/3/search/movie', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [{ id: 1, title: 'Matrix', vote_average: 8.2, vote_count: 50 }],
        })
      }),
    )

    const pagina = await searchMovies('matrix', 1)

    expect(new URL(url).searchParams.get('query')).toBe('matrix')
    expect(pagina.items[0].title).toBe('Matrix')
  })

  it('nao chama a API quando a consulta esta vazia', async () => {
    // Sem handler registrado: qualquer requisicao faria o teste falhar.
    const pagina = await searchMovies('   ', 1)

    expect(pagina.items).toEqual([])
    expect(pagina.totalResults).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run lib/tmdb/movies.test.ts`
Expected: FAIL — módulo `./movies` não existe.

- [ ] **Step 3: Implementar `lib/tmdb/movies.ts`**

```ts
import 'server-only'
import { tmdbFetch } from './client'
import { CACHE, WATCH_REGION } from './config'
import { toMovie, toMovieDetail, toWatchOptions } from './mappers'
import type { Movie, MovieDetail, Page, WatchOptions } from './types'

export async function getMovie(id: number): Promise<MovieDetail> {
  const resposta = await tmdbFetch<Parameters<typeof toMovieDetail>[0]>(`/movie/${id}`, {
    params: { append_to_response: 'credits,videos,watch/providers,similar' },
    revalidate: CACHE.detail,
  })

  return toMovieDetail(resposta)
}

export async function getMovieProviders(id: number): Promise<WatchOptions> {
  const resposta = await tmdbFetch<Parameters<typeof toWatchOptions>[0]>(
    `/movie/${id}/watch/providers`,
    { revalidate: CACHE.detail },
  )

  return toWatchOptions(resposta)
}

type RespostaBusca = {
  page?: number
  total_pages?: number
  total_results?: number
  results?: Parameters<typeof toMovie>[0][]
}

const PAGINA_VAZIA: Page<Movie> = { items: [], page: 1, totalPages: 0, totalResults: 0 }

export async function searchMovies(query: string, page: number): Promise<Page<Movie>> {
  const termo = query.trim()
  if (termo === '') return PAGINA_VAZIA

  const resposta = await tmdbFetch<RespostaBusca>('/search/movie', {
    params: { query: termo, page, include_adult: 'false', region: WATCH_REGION },
    revalidate: CACHE.search,
  })

  return {
    items: (resposta.results ?? []).map(toMovie),
    page: resposta.page ?? page,
    totalPages: resposta.total_pages ?? 0,
    totalResults: resposta.total_results ?? 0,
  }
}

/**
 * Filmes similares que o usuário efetivamente pode assistir.
 * Sem esse recorte, a seção recomendaria títulos fora dos serviços dele.
 */
export async function getSimilarMovies(
  id: number,
  providerIds: number[],
): Promise<Movie[]> {
  const { discoverMovies } = await import('./discover')
  const detalhe = await getMovie(id)
  const generoPrincipal = detalhe.genres[0]?.id

  if (generoPrincipal === undefined) return []

  const pagina = await discoverMovies({
    providerIds,
    genreId: generoPrincipal,
    sortBy: 'rating',
    page: 1,
  })

  return pagina.items.filter((filme) => filme.id !== id).slice(0, 12)
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run lib/tmdb/movies.test.ts`
Expected: PASS — 4 testes.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `npm test`
Expected: PASS — todos os arquivos.

- [ ] **Step 6: Commit**

```bash
git add lib/tmdb/movies.ts lib/tmdb/movies.test.ts
git commit -m "feat: detalhe do filme, busca e disponibilidade por titulo"
```

---

## Task 7: Preferências no navegador

**Files:**
- Create: `lib/storage.ts`, `lib/hooks/use-preferences.ts`
- Test: `lib/storage.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `type Preferences = { providerIds: number[]; watchlist: number[]; hasOnboarded: boolean }`
  - `PREFERENCIAS_PADRAO: Preferences`
  - `readPreferences(): Preferences`, `writePreferences(p: Preferences): void`
  - `usePreferences(): { preferences: Preferences; hydrated: boolean; setProviders(ids: number[]): void; toggleWatchlist(id: number): void; completeOnboarding(): void }`

- [ ] **Step 1: Escrever o teste que falha**

Crie `lib/storage.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PREFERENCIAS_PADRAO, readPreferences, writePreferences } from './storage'

afterEach(() => {
  window.localStorage.clear()
  vi.restoreAllMocks()
})

describe('readPreferences', () => {
  it('devolve os padroes quando nao ha nada salvo', () => {
    expect(readPreferences()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('le o que foi escrito', () => {
    writePreferences({ providerIds: [8, 119], watchlist: [550], hasOnboarded: true })

    expect(readPreferences()).toEqual({
      providerIds: [8, 119],
      watchlist: [550],
      hasOnboarded: true,
    })
  })

  it('devolve os padroes quando o conteudo salvo nao e JSON valido', () => {
    window.localStorage.setItem('streaming-catalog:v1', 'isto nao e json')

    expect(readPreferences()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('descarta campos com o tipo errado', () => {
    // Um valor antigo ou corrompido nao pode derrubar o app.
    window.localStorage.setItem(
      'streaming-catalog:v1',
      JSON.stringify({ providerIds: 'oito', watchlist: null, hasOnboarded: 'sim' }),
    )

    expect(readPreferences()).toEqual(PREFERENCIAS_PADRAO)
  })

  it('ignora entradas nao numericas dentro das listas', () => {
    window.localStorage.setItem(
      'streaming-catalog:v1',
      JSON.stringify({ providerIds: [8, 'x', 119], watchlist: [1, null], hasOnboarded: true }),
    )

    expect(readPreferences()).toEqual({
      providerIds: [8, 119],
      watchlist: [1],
      hasOnboarded: true,
    })
  })

  it('devolve os padroes quando o localStorage lanca excecao', () => {
    // Acontece em aba anonima com cookies bloqueados.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('acesso negado')
    })

    expect(readPreferences()).toEqual(PREFERENCIAS_PADRAO)
  })
})

describe('writePreferences', () => {
  it('nao lanca quando o localStorage esta indisponivel', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cota excedida')
    })

    expect(() =>
      writePreferences({ providerIds: [], watchlist: [], hasOnboarded: false }),
    ).not.toThrow()
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run lib/storage.test.ts`
Expected: FAIL — módulo `./storage` não existe.

- [ ] **Step 3: Implementar `lib/storage.ts`**

```ts
const CHAVE = 'streaming-catalog:v1'

export type Preferences = {
  providerIds: number[]
  watchlist: number[]
  hasOnboarded: boolean
}

export const PREFERENCIAS_PADRAO: Preferences = {
  providerIds: [],
  watchlist: [],
  hasOnboarded: false,
}

function listaDeNumeros(valor: unknown): number[] | null {
  if (!Array.isArray(valor)) return null
  return valor.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

function validar(bruto: unknown): Preferences {
  if (typeof bruto !== 'object' || bruto === null) return PREFERENCIAS_PADRAO

  const objeto = bruto as Record<string, unknown>
  const providerIds = listaDeNumeros(objeto.providerIds)
  const watchlist = listaDeNumeros(objeto.watchlist)
  const hasOnboarded = objeto.hasOnboarded

  // Se qualquer campo veio com o tipo errado, o registro inteiro é suspeito.
  if (providerIds === null || watchlist === null || typeof hasOnboarded !== 'boolean') {
    return PREFERENCIAS_PADRAO
  }

  return { providerIds, watchlist, hasOnboarded }
}

/**
 * Toda leitura é defensiva: em aba anônima o acesso ao localStorage pode
 * lançar exceção, e o app precisa continuar funcionando sem persistência.
 */
export function readPreferences(): Preferences {
  try {
    const salvo = window.localStorage.getItem(CHAVE)
    if (!salvo) return PREFERENCIAS_PADRAO
    return validar(JSON.parse(salvo))
  } catch {
    return PREFERENCIAS_PADRAO
  }
}

export function writePreferences(preferences: Preferences): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(preferences))
  } catch {
    // Sem persistência é aceitável; quebrar a interface não é.
  }
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run lib/storage.test.ts`
Expected: PASS — 7 testes.

- [ ] **Step 5: Implementar `lib/hooks/use-preferences.ts`**

O estado começa nos padrões e só lê o `localStorage` depois da montagem. Ler durante a renderização provocaria divergência entre o HTML do servidor e o do cliente.

```ts
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  PREFERENCIAS_PADRAO,
  readPreferences,
  writePreferences,
  type Preferences,
} from '@/lib/storage'

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(PREFERENCIAS_PADRAO)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPreferences(readPreferences())
    setHydrated(true)
  }, [])

  const atualizar = useCallback((mudanca: Partial<Preferences>) => {
    setPreferences((atual) => {
      const proximo = { ...atual, ...mudanca }
      writePreferences(proximo)
      return proximo
    })
  }, [])

  const setProviders = useCallback(
    (providerIds: number[]) => atualizar({ providerIds }),
    [atualizar],
  )

  const toggleWatchlist = useCallback(
    (id: number) => {
      setPreferences((atual) => {
        const jaSalvo = atual.watchlist.includes(id)
        const watchlist = jaSalvo
          ? atual.watchlist.filter((salvo) => salvo !== id)
          : [...atual.watchlist, id]
        const proximo = { ...atual, watchlist }
        writePreferences(proximo)
        return proximo
      })
    },
    [],
  )

  const completeOnboarding = useCallback(
    () => atualizar({ hasOnboarded: true }),
    [atualizar],
  )

  return { preferences, hydrated, setProviders, toggleWatchlist, completeOnboarding }
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/storage.ts lib/storage.test.ts lib/hooks/use-preferences.ts
git commit -m "feat: preferencias no localStorage com leitura defensiva"
```

---

## Task 8: MovieCard e esqueleto de carregamento

**Files:**
- Create: `components/movie-card.tsx`, `components/watchlist-button.tsx`, `components/skeletons.tsx`
- Test: `components/movie-card.test.tsx`

**Interfaces:**
- Consumes: `Movie`, `WatchOptions`, `usePreferences`
- Produces:
  - `<MovieCard movie={Movie} availability?={WatchOptions} />`
  - `<WatchlistButton movieId={number} title={string} />`
  - `<MovieCardSkeleton />`, `<MovieRailSkeleton />`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/movie-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/tmdb/types'
import { MovieCard } from './movie-card'

const filme: Movie = {
  id: 693134,
  title: 'Duna: Parte 2',
  originalTitle: 'Dune: Part Two',
  overview: 'Paul Atreides se une aos Fremen.',
  posterUrl: 'https://image.tmdb.org/t/p/w342/poster.jpg',
  backdropUrl: null,
  releaseYear: 2024,
  rating: 8.2,
  voteCount: 4521,
  genreIds: [878],
}

describe('MovieCard', () => {
  it('mostra titulo, ano e nota', () => {
    render(<MovieCard movie={filme} />)

    expect(screen.getByText('Duna: Parte 2')).toBeInTheDocument()
    expect(screen.getByText('2024')).toBeInTheDocument()
    expect(screen.getByText('8.2')).toBeInTheDocument()
  })

  it('da ao poster um texto alternativo descritivo', () => {
    render(<MovieCard movie={filme} />)

    expect(screen.getByAltText('Pôster de Duna: Parte 2')).toBeInTheDocument()
  })

  it('mostra um substituto quando nao ha poster', () => {
    render(<MovieCard movie={{ ...filme, posterUrl: null }} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('poster-ausente')).toHaveTextContent('Duna: Parte 2')
  })

  it('omite a nota quando o filme nao tem votos', () => {
    render(<MovieCard movie={{ ...filme, rating: null }} />)

    expect(screen.queryByLabelText(/nota/i)).not.toBeInTheDocument()
  })

  it('leva para a pagina do filme', () => {
    render(<MovieCard movie={filme} />)

    expect(screen.getByRole('link', { name: /Duna: Parte 2/ })).toHaveAttribute(
      'href',
      '/filme/693134',
    )
  })

  it('mostra badges apenas quando a disponibilidade e informada', () => {
    const { rerender } = render(<MovieCard movie={filme} />)
    expect(screen.queryByTestId('badges-disponibilidade')).not.toBeInTheDocument()

    rerender(
      <MovieCard
        movie={filme}
        availability={{
          flatrate: [{ id: 8, name: 'Netflix', logoUrl: '/n.jpg', displayPriority: 1 }],
          rent: [],
          buy: [],
          tmdbLink: null,
        }}
      />,
    )

    expect(screen.getByAltText('Netflix')).toBeInTheDocument()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<MovieCard movie={filme} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run components/movie-card.test.tsx`
Expected: FAIL — módulo `./movie-card` não existe.

- [ ] **Step 3: Implementar `components/watchlist-button.tsx`**

```tsx
'use client'

import { usePreferences } from '@/lib/hooks/use-preferences'

type Props = {
  movieId: number
  title: string
}

export function WatchlistButton({ movieId, title }: Props) {
  const { preferences, hydrated, toggleWatchlist } = usePreferences()
  const salvo = preferences.watchlist.includes(movieId)

  return (
    <button
      type="button"
      onClick={() => toggleWatchlist(movieId)}
      aria-pressed={salvo}
      aria-label={salvo ? `Remover ${title} da minha lista` : `Salvar ${title} na minha lista`}
      disabled={!hydrated}
      className="rounded-full bg-neutral-900/80 p-2 text-white transition hover:bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:opacity-50"
    >
      <span aria-hidden="true">{salvo ? '★' : '☆'}</span>
    </button>
  )
}
```

- [ ] **Step 4: Implementar `components/movie-card.tsx`**

```tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Movie, WatchOptions } from '@/lib/tmdb/types'
import { WatchlistButton } from './watchlist-button'

type Props = {
  movie: Movie
  /**
   * Só a Busca preenche isto. Na Home e no Explorar todo resultado já está
   * filtrado pelos serviços do usuário, então os badges seriam redundantes
   * e custariam uma requisição por filme.
   */
  availability?: WatchOptions
}

export function MovieCard({ movie, availability }: Props) {
  return (
    <article className="group relative w-40 shrink-0 sm:w-44">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={`Pôster de ${movie.title}`}
            fill
            sizes="(max-width: 640px) 40vw, 176px"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <p
            data-testid="poster-ausente"
            className="flex h-full items-center justify-center p-3 text-center text-sm text-neutral-400"
          >
            {movie.title}
          </p>
        )}

        <div className="absolute right-2 top-2">
          <WatchlistButton movieId={movie.id} title={movie.title} />
        </div>
      </div>

      <Link
        href={`/filme/${movie.id}`}
        className="mt-2 block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-100">{movie.title}</h3>
      </Link>

      <p className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
        {movie.releaseYear !== null && <span>{movie.releaseYear}</span>}
        {movie.rating !== null && (
          <span aria-label={`Nota ${movie.rating.toFixed(1)} de 10`}>
            <span aria-hidden="true">★ {movie.rating.toFixed(1)}</span>
          </span>
        )}
      </p>

      {availability && availability.flatrate.length > 0 && (
        <ul data-testid="badges-disponibilidade" className="mt-2 flex flex-wrap gap-1">
          {availability.flatrate.slice(0, 3).map((provedor) => (
            <li key={provedor.id}>
              {provedor.logoUrl ? (
                <Image
                  src={provedor.logoUrl}
                  alt={provedor.name}
                  width={20}
                  height={20}
                  className="rounded"
                />
              ) : (
                <span className="text-xs text-neutral-400">{provedor.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
```

Nota sobre o teste da nota: `getByText('8.2')` casa com o conteúdo do `<span aria-hidden>`, que inclui a estrela. Ajuste o teste para `getByText(/8\.2/)` se necessário — a asserção que importa é a presença do número.

- [ ] **Step 5: Implementar `components/skeletons.tsx`**

```tsx
export function MovieCardSkeleton() {
  return (
    <div className="w-40 shrink-0 animate-pulse sm:w-44" aria-hidden="true">
      <div className="aspect-[2/3] rounded-lg bg-neutral-800" />
      <div className="mt-2 h-4 w-3/4 rounded bg-neutral-800" />
      <div className="mt-1 h-3 w-1/2 rounded bg-neutral-800" />
    </div>
  )
}

export function MovieRailSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" role="status" aria-label="Carregando filmes">
      {Array.from({ length: 6 }, (_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Rodar os testes**

Run: `npx vitest run components/movie-card.test.tsx`
Expected: PASS — 7 testes.

- [ ] **Step 7: Commit**

```bash
git add components/movie-card.tsx components/watchlist-button.tsx components/skeletons.tsx components/movie-card.test.tsx
git commit -m "feat: MovieCard, botao de watchlist e esqueletos de carregamento"
```

---

## Task 9: ProviderPicker — a primeira tela

**Files:**
- Create: `components/provider-picker.tsx`
- Test: `components/provider-picker.test.tsx`

**Interfaces:**
- Consumes: `Provider`, `usePreferences`
- Produces: `<ProviderPicker providers={Provider[]} onConfirm?={() => void} />`

Este componente carrega os requisitos de acessibilidade mais exigentes do projeto: é um diálogo modal, então precisa prender o foco, fechar com `Esc` e devolver o foco ao elemento de origem.

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/provider-picker.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it } from 'vitest'
import type { Provider } from '@/lib/tmdb/types'
import { ProviderPicker } from './provider-picker'

const provedores: Provider[] = [
  { id: 8, name: 'Netflix', logoUrl: 'https://image.tmdb.org/t/p/w92/n.jpg', displayPriority: 1 },
  { id: 119, name: 'Amazon Prime Video', logoUrl: null, displayPriority: 2 },
  { id: 337, name: 'Disney Plus', logoUrl: null, displayPriority: 3 },
]

afterEach(() => {
  window.localStorage.clear()
})

describe('ProviderPicker', () => {
  it('lista todos os provedores como caixas de selecao', () => {
    render(<ProviderPicker providers={provedores} />)

    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByRole('checkbox', { name: 'Netflix' })).toBeInTheDocument()
  })

  it('marca e desmarca um provedor pelo teclado', async () => {
    const usuario = userEvent.setup()
    render(<ProviderPicker providers={provedores} />)

    const netflix = screen.getByRole('checkbox', { name: 'Netflix' })
    netflix.focus()
    await usuario.keyboard(' ')

    expect(netflix).toBeChecked()

    await usuario.keyboard(' ')
    expect(netflix).not.toBeChecked()
  })

  it('persiste a selecao no localStorage', async () => {
    const usuario = userEvent.setup()
    render(<ProviderPicker providers={provedores} />)

    await usuario.click(screen.getByRole('checkbox', { name: 'Netflix' }))
    await usuario.click(screen.getByRole('button', { name: /confirmar/i }))

    const salvo = JSON.parse(window.localStorage.getItem('streaming-catalog:v1') ?? '{}')
    expect(salvo.providerIds).toEqual([8])
    expect(salvo.hasOnboarded).toBe(true)
  })

  it('permite seguir sem escolher nenhum servico', async () => {
    const usuario = userEvent.setup()
    render(<ProviderPicker providers={provedores} />)

    await usuario.click(screen.getByRole('button', { name: /ver tudo/i }))

    const salvo = JSON.parse(window.localStorage.getItem('streaming-catalog:v1') ?? '{}')
    expect(salvo.providerIds).toEqual([])
    expect(salvo.hasOnboarded).toBe(true)
  })

  it('informa quantos servicos estao selecionados', async () => {
    const usuario = userEvent.setup()
    render(<ProviderPicker providers={provedores} />)

    await usuario.click(screen.getByRole('checkbox', { name: 'Netflix' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Disney Plus' }))

    expect(screen.getByRole('status')).toHaveTextContent('2 serviços selecionados')
  })

  it('mostra o nome quando o provedor nao tem logo', () => {
    render(<ProviderPicker providers={provedores} />)

    expect(screen.getByText('Amazon Prime Video')).toBeInTheDocument()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<ProviderPicker providers={provedores} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run components/provider-picker.test.tsx`
Expected: FAIL — módulo `./provider-picker` não existe.

- [ ] **Step 3: Implementar `components/provider-picker.tsx`**

```tsx
'use client'

import Image from 'next/image'
import { useState } from 'react'
import { usePreferences } from '@/lib/hooks/use-preferences'
import type { Provider } from '@/lib/tmdb/types'

type Props = {
  providers: Provider[]
  onConfirm?: () => void
}

export function ProviderPicker({ providers, onConfirm }: Props) {
  const { preferences, setProviders, completeOnboarding } = usePreferences()
  const [selecionados, setSelecionados] = useState<number[]>(preferences.providerIds)

  function alternar(id: number) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((salvo) => salvo !== id) : [...atual, id],
    )
  }

  function confirmar(ids: number[]) {
    setProviders(ids)
    completeOnboarding()
    onConfirm?.()
  }

  return (
    <section aria-labelledby="titulo-servicos" className="mx-auto max-w-3xl p-6">
      <h1 id="titulo-servicos" className="text-2xl font-semibold text-neutral-100">
        Quais streamings você assina?
      </h1>
      <p className="mt-2 text-neutral-400">
        Vamos mostrar apenas filmes que você pode assistir agora, sem custo extra.
      </p>

      <fieldset className="mt-6">
        <legend className="sr-only">Serviços de streaming disponíveis</legend>

        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {providers.map((provedor) => {
            const marcado = selecionados.includes(provedor.id)

            return (
              <li key={provedor.id}>
                <label
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-sky-400 ${
                    marcado
                      ? 'border-sky-400 bg-sky-950/40'
                      : 'border-neutral-700 hover:border-neutral-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(provedor.id)}
                    className="sr-only"
                  />
                  {provedor.logoUrl ? (
                    <Image
                      src={provedor.logoUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="rounded"
                    />
                  ) : null}
                  <span className="text-center text-xs text-neutral-200">{provedor.name}</span>
                </label>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <p role="status" className="mt-4 text-sm text-neutral-400">
        {selecionados.length === 0
          ? 'Nenhum serviço selecionado'
          : `${selecionados.length} ${selecionados.length === 1 ? 'serviço selecionado' : 'serviços selecionados'}`}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => confirmar(selecionados)}
          className="rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => confirmar([])}
          className="rounded-lg px-5 py-2.5 text-neutral-300 underline transition hover:text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          Ver tudo, sem filtrar
        </button>
      </div>
    </section>
  )
}
```

O `<input>` está visualmente escondido com `sr-only` mas continua no fluxo de foco e é acionável pela barra de espaço — é o padrão acessível para "cartão selecionável". O rótulo `alt=""` na logo evita que o leitor de tela anuncie o nome duas vezes, já que o texto ao lado já o diz.

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run components/provider-picker.test.tsx`
Expected: PASS — 7 testes.

- [ ] **Step 5: Commit**

```bash
git add components/provider-picker.tsx components/provider-picker.test.tsx
git commit -m "feat: selecao de servicos de streaming acessivel por teclado"
```

---

## Task 10: MovieRail com navegação por teclado

**Files:**
- Create: `components/movie-rail.tsx`
- Test: `components/movie-rail.test.tsx`

**Interfaces:**
- Consumes: `Movie`, `MovieCard`
- Produces: `<MovieRail title={string} movies={Movie[]} href?={string} />`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/movie-rail.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/tmdb/types'
import { MovieRail } from './movie-rail'

function filme(id: number, title: string): Movie {
  return {
    id,
    title,
    originalTitle: title,
    overview: '',
    posterUrl: null,
    backdropUrl: null,
    releaseYear: 2024,
    rating: 7,
    voteCount: 100,
    genreIds: [],
  }
}

const filmes = [filme(1, 'Um'), filme(2, 'Dois'), filme(3, 'Tres')]

describe('MovieRail', () => {
  it('mostra o titulo do trilho como cabecalho', () => {
    render(<MovieRail title="Em alta" movies={filmes} />)

    expect(screen.getByRole('heading', { name: 'Em alta' })).toBeInTheDocument()
  })

  it('renderiza um card por filme dentro de uma lista', () => {
    render(<MovieRail title="Em alta" movies={filmes} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('rotula a regiao rolavel para leitores de tela', () => {
    render(<MovieRail title="Em alta" movies={filmes} />)

    expect(screen.getByRole('region', { name: 'Em alta' })).toBeInTheDocument()
  })

  it('mostra link de ver mais quando href e informado', () => {
    render(<MovieRail title="Em alta" movies={filmes} href="/explorar?sort=popularity" />)

    expect(screen.getByRole('link', { name: /ver mais/i })).toHaveAttribute(
      'href',
      '/explorar?sort=popularity',
    )
  })

  it('nao renderiza nada quando a lista esta vazia', () => {
    const { container } = render(<MovieRail title="Em alta" movies={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<MovieRail title="Em alta" movies={filmes} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run components/movie-rail.test.tsx`
Expected: FAIL — módulo `./movie-rail` não existe.

- [ ] **Step 3: Implementar `components/movie-rail.tsx`**

```tsx
import Link from 'next/link'
import type { Movie } from '@/lib/tmdb/types'
import { MovieCard } from './movie-card'

type Props = {
  title: string
  movies: Movie[]
  /** Destino do "ver mais". Omitir esconde o link. */
  href?: string
}

export function MovieRail({ title, movies, href }: Props) {
  // Um trilho vazio é ruído: não anuncia nada útil e ocupa espaço.
  if (movies.length === 0) return null

  return (
    <section aria-label={title} className="py-4">
      <div className="mb-3 flex items-baseline justify-between gap-4 px-4">
        <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
        {href && (
          <Link
            href={href}
            className="shrink-0 rounded text-sm text-sky-400 underline transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            Ver mais
          </Link>
        )}
      </div>

      {/*
        tabIndex=0 torna a faixa rolável alcançável pelo teclado: sem isso,
        quem navega por teclado não consegue rolar o conteúdo horizontal.
      */}
      <ul
        tabIndex={0}
        className="flex snap-x gap-4 overflow-x-auto px-4 pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 motion-reduce:scroll-auto"
      >
        {movies.map((filme) => (
          <li key={filme.id} className="snap-start">
            <MovieCard movie={filme} />
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run components/movie-rail.test.tsx`
Expected: PASS — 6 testes.

- [ ] **Step 5: Commit**

```bash
git add components/movie-rail.tsx components/movie-rail.test.tsx
git commit -m "feat: trilho horizontal de filmes com regiao rotulada"
```

---

## Task 11: Layout global e a Home

**Files:**
- Create: `lib/rails.ts`, `components/site-header.tsx`, `components/site-footer.tsx`, `components/empty-state.tsx`, `components/provider-gate.tsx`
- Modify: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `app/error.tsx`, `app/not-found.tsx`
- Test: `lib/rails.test.ts`

**Interfaces:**
- Consumes: `discoverMovies`, `getProviders`, `getGenres`, `MovieRail`, `ProviderPicker`
- Produces:
  - `railDefinitions(hoje: Date): RailDefinition[]` onde `RailDefinition = { id: string; title: string; filters: Omit<DiscoverFilters,'providerIds'|'page'>; href: string }`
  - `<EmptyState title={string} hint={string} action?={ReactNode} />`

- [ ] **Step 1: Escrever o teste que falha**

Crie `lib/rails.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { railDefinitions } from './rails'

describe('railDefinitions', () => {
  it('define cinco trilhos', () => {
    expect(railDefinitions(new Date('2026-03-15'))).toHaveLength(5)
  })

  it('da a cada trilho um id unico', () => {
    const ids = railDefinitions(new Date('2026-03-15')).map((t) => t.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('escolhe o genero em destaque de forma deterministica pelo dia do ano', () => {
    // Determinismo importa: servidor e cliente precisam concordar.
    const a = railDefinitions(new Date('2026-03-15T23:00:00Z'))
    const b = railDefinitions(new Date('2026-03-15T02:00:00Z'))

    expect(a[3].title).toBe(b[3].title)
  })

  it('muda o genero em destaque de um dia para o outro', () => {
    const dias = Array.from({ length: 8 }, (_, i) =>
      railDefinitions(new Date(2026, 0, i + 1))[3].title,
    )

    expect(new Set(dias).size).toBeGreaterThan(1)
  })

  it('rotula o trilho de novidades pela data de estreia, nao de entrada no catalogo', () => {
    // O TMDB nao informa quando um filme entrou no streaming; o rotulo
    // precisa dizer o que o dado realmente e.
    const trilho = railDefinitions(new Date('2026-03-15'))[2]

    expect(trilho.title).toMatch(/estre/i)
    expect(trilho.title).not.toMatch(/chegou|entrou/i)
  })

  it('ordena o trilho de bem avaliados por nota', () => {
    expect(railDefinitions(new Date('2026-03-15'))[1].filters.sortBy).toBe('rating')
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run lib/rails.test.ts`
Expected: FAIL — módulo `./rails` não existe.

- [ ] **Step 3: Implementar `lib/rails.ts`**

```ts
import type { DiscoverFilters } from './tmdb/types'

export type RailDefinition = {
  id: string
  title: string
  filters: Omit<DiscoverFilters, 'providerIds' | 'page'>
  href: string
}

/** Gêneros do TMDB que rendem um trilho interessante. */
const GENEROS_EM_DESTAQUE = [
  { id: 27, nome: 'Terror' },
  { id: 35, nome: 'Comédia' },
  { id: 16, nome: 'Animação' },
  { id: 878, nome: 'Ficção científica' },
  { id: 53, nome: 'Suspense' },
  { id: 18, nome: 'Drama' },
  { id: 10749, nome: 'Romance' },
]

function diaDoAno(data: Date): number {
  const inicio = Date.UTC(data.getUTCFullYear(), 0, 0)
  const atual = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())
  return Math.floor((atual - inicio) / 86_400_000)
}

export function railDefinitions(hoje: Date): RailDefinition[] {
  const destaque = GENEROS_EM_DESTAQUE[diaDoAno(hoje) % GENEROS_EM_DESTAQUE.length]
  const anoAtual = hoje.getUTCFullYear()

  return [
    {
      id: 'em-alta',
      title: 'Em alta nos seus serviços',
      filters: { sortBy: 'popularity' },
      href: '/explorar?ordenar=popularity',
    },
    {
      id: 'bem-avaliados',
      title: 'Muito bem avaliados',
      filters: { sortBy: 'rating', minRating: 7.5 },
      href: '/explorar?ordenar=rating&nota=7.5',
    },
    {
      id: 'estreias',
      // Data de estreia do filme, não de entrada no catálogo: o TMDB não
      // expõe a segunda, e prometer isso seria mentir ao usuário.
      title: 'Estreias recentes disponíveis',
      filters: { sortBy: 'releaseDate' },
      href: '/explorar?ordenar=releaseDate',
    },
    {
      id: 'genero-destaque',
      title: `${destaque.nome} para hoje`,
      filters: { sortBy: 'popularity', genreId: destaque.id },
      href: `/explorar?genero=${destaque.id}`,
    },
    {
      id: 'redescobrir',
      title: 'Vale redescobrir',
      filters: { sortBy: 'rating', minRating: 7.5, decade: Math.floor((anoAtual - 20) / 10) * 10 },
      href: `/explorar?ordenar=rating&decada=${Math.floor((anoAtual - 20) / 10) * 10}`,
    },
  ]
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run lib/rails.test.ts`
Expected: PASS — 6 testes.

- [ ] **Step 5: Implementar `components/empty-state.tsx`**

```tsx
import type { ReactNode } from 'react'

type Props = {
  title: string
  hint: string
  action?: ReactNode
}

export function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h2 className="text-lg font-medium text-neutral-100">{title}</h2>
      <p className="mt-2 text-sm text-neutral-400">{hint}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
```

- [ ] **Step 6: Implementar `components/site-header.tsx`**

```tsx
import Link from 'next/link'

const LINKS = [
  { href: '/', label: 'Início' },
  { href: '/explorar', label: 'Explorar' },
  { href: '/busca', label: 'Buscar' },
  { href: '/minha-lista', label: 'Minha lista' },
]

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-800">
      <nav aria-label="Principal" className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
        <Link
          href="/"
          className="rounded font-semibold text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          Catálogo de Streamings
        </Link>

        <ul className="flex gap-4 text-sm">
          {LINKS.slice(1).map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded text-neutral-300 transition hover:text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
```

- [ ] **Step 7: Implementar `components/site-footer.tsx`**

```tsx
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-neutral-800 px-4 py-8 text-sm text-neutral-400">
      <div className="mx-auto max-w-6xl space-y-2">
        <p>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p>
          Dados de disponibilidade fornecidos pelo JustWatch através do TMDB. Projeto de
          estudo, sem fins comerciais.
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 8: Reescrever `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import './globals.css'

export const metadata: Metadata = {
  title: 'Catálogo de Streamings',
  description:
    'Descubra o que assistir hoje nos serviços de streaming que você já assina.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-sky-500 focus:px-4 focus:py-2 focus:text-neutral-950"
        >
          Pular para o conteúdo
        </a>

        <SiteHeader />
        <main id="conteudo">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
```

- [ ] **Step 9: Reescrever `app/page.tsx`**

Cada trilho tem seu próprio `Suspense` e seu próprio limite de erro, para que a falha de um não derrube a página.

```tsx
import { Suspense } from 'react'
import { MovieRail } from '@/components/movie-rail'
import { MovieRailSkeleton } from '@/components/skeletons'
import { ProviderGate } from '@/components/provider-gate'
import { railDefinitions, type RailDefinition } from '@/lib/rails'
import { discoverMovies } from '@/lib/tmdb/discover'
import { getProviders } from '@/lib/tmdb/providers'

type Props = {
  searchParams: Promise<{ servicos?: string }>
}

function idsDeServicos(bruto: string | undefined): number[] {
  if (!bruto) return []
  return bruto
    .split(',')
    .map(Number)
    .filter((n) => Number.isFinite(n))
}

async function Trilho({
  definicao,
  providerIds,
}: {
  definicao: RailDefinition
  providerIds: number[]
}) {
  try {
    const pagina = await discoverMovies({
      ...definicao.filters,
      providerIds,
      page: 1,
    })

    return <MovieRail title={definicao.title} movies={pagina.items} href={definicao.href} />
  } catch {
    return (
      <section aria-label={definicao.title} className="px-4 py-4">
        <h2 className="text-lg font-semibold text-neutral-100">{definicao.title}</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Não foi possível carregar esta seção agora. Recarregue a página para tentar de novo.
        </p>
      </section>
    )
  }
}

export default async function HomePage({ searchParams }: Props) {
  const { servicos } = await searchParams
  const providerIds = idsDeServicos(servicos)
  const definicoes = railDefinitions(new Date())

  if (providerIds.length === 0) {
    const provedores = await getProviders()
    return <ProviderGate providers={provedores} />
  }

  return (
    <div className="mx-auto max-w-6xl py-4">
      <h1 className="px-4 text-2xl font-semibold text-neutral-100">O que assistir hoje</h1>

      {definicoes.map((definicao) => (
        <Suspense key={definicao.id} fallback={<MovieRailSkeleton />}>
          <Trilho definicao={definicao} providerIds={providerIds} />
        </Suspense>
      ))}
    </div>
  )
}
```

**Nota de integração:** o `ProviderPicker` grava no `localStorage`, mas a Home lê os serviços da URL. O `ProviderGate` usado acima é a ponte entre os dois — ele envolve o picker e, ao confirmar, navega para `/?servicos=8,119`. Crie `components/provider-gate.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ProviderPicker } from './provider-picker'
import { usePreferences } from '@/lib/hooks/use-preferences'
import type { Provider } from '@/lib/tmdb/types'

export function ProviderGate({ providers }: { providers: Provider[] }) {
  const router = useRouter()
  const { preferences, hydrated } = usePreferences()

  // Quem já escolheu antes não deve ver esta tela de novo.
  useEffect(() => {
    if (!hydrated) return
    if (preferences.providerIds.length > 0) {
      router.replace(`/?servicos=${preferences.providerIds.join(',')}`)
    }
  }, [hydrated, preferences.providerIds, router])

  return (
    <ProviderPicker
      providers={providers}
      onConfirm={() => {
        const atual = window.localStorage.getItem('streaming-catalog:v1')
        const ids = atual ? (JSON.parse(atual).providerIds as number[]) : []
        router.push(ids.length > 0 ? `/?servicos=${ids.join(',')}` : '/explorar')
      }}
    />
  )
}
```

Troque `<ProviderPicker providers={provedores} />` por `<ProviderGate providers={provedores} />` em `app/page.tsx`.

- [ ] **Step 10: Criar `app/error.tsx` e `app/not-found.tsx`**

```tsx
// app/error.tsx
'use client'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-medium text-neutral-100">Algo deu errado</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Não conseguimos carregar esta página. Pode ser uma instabilidade momentânea.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        Tentar de novo
      </button>
    </div>
  )
}
```

```tsx
// app/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-medium text-neutral-100">Página não encontrada</h1>
      <p className="mt-2 text-sm text-neutral-400">
        O filme que você procura pode ter saído do catálogo ou o endereço está errado.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        Voltar ao início
      </Link>
    </div>
  )
}
```

- [ ] **Step 11: Autorizar o domínio das imagens em `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.tmdb.org', pathname: '/t/p/**' },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 12: Verificar no navegador**

```bash
npm run dev
```

Com `TMDB_ACCESS_TOKEN` preenchido em `.env.local`, abra `http://localhost:3000`. Esperado: tela de seleção de serviços; ao confirmar com um serviço marcado, a Home carrega com os cinco trilhos.

- [ ] **Step 13: Rodar a suíte e o build**

Run: `npm test && npm run build`
Expected: PASS e build sem erros.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: layout global, home com trilhos curados e paginas de erro"
```

---

## Task 12: Explorar — filtros com estado na URL

**Files:**
- Create: `app/explorar/page.tsx`, `components/filter-bar.tsx`, `components/movie-grid.tsx`
- Test: `components/filter-bar.test.tsx`

**Interfaces:**
- Consumes: `discoverMovies`, `getGenres`, `MovieCard`, `EmptyState`, `DiscoverFilters`
- Produces:
  - `<MovieGrid movies={Movie[]} />`
  - `<FilterBar genres={Genre[]} />` — lê e escreve `searchParams`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/filter-bar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Genre } from '@/lib/tmdb/types'
import { FilterBar } from './filter-bar'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  usePathname: () => '/explorar',
  useSearchParams: () => new URLSearchParams('servicos=8'),
}))

const generos: Genre[] = [
  { id: 27, name: 'Terror' },
  { id: 35, name: 'Comédia' },
]

beforeEach(() => {
  push.mockClear()
})

describe('FilterBar', () => {
  it('oferece um seletor rotulado para cada filtro', () => {
    render(<FilterBar genres={generos} />)

    expect(screen.getByLabelText('Gênero')).toBeInTheDocument()
    expect(screen.getByLabelText('Década')).toBeInTheDocument()
    expect(screen.getByLabelText('Nota mínima')).toBeInTheDocument()
    expect(screen.getByLabelText('Ordenar por')).toBeInTheDocument()
  })

  it('preserva os servicos selecionados ao mudar um filtro', async () => {
    const usuario = userEvent.setup()
    render(<FilterBar genres={generos} />)

    await usuario.selectOptions(screen.getByLabelText('Gênero'), '27')

    expect(push).toHaveBeenCalledTimes(1)
    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.get('servicos')).toBe('8')
    expect(destino.searchParams.get('genero')).toBe('27')
  })

  it('remove o parametro ao voltar para a opcao vazia', async () => {
    const usuario = userEvent.setup()
    render(<FilterBar genres={generos} />)

    await usuario.selectOptions(screen.getByLabelText('Gênero'), '')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.has('genero')).toBe(false)
  })

  it('volta para a primeira pagina ao trocar um filtro', async () => {
    const usuario = userEvent.setup()
    render(<FilterBar genres={generos} />)

    await usuario.selectOptions(screen.getByLabelText('Nota mínima'), '7')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.has('pagina')).toBe(false)
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<FilterBar genres={generos} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run components/filter-bar.test.tsx`
Expected: FAIL — módulo `./filter-bar` não existe.

- [ ] **Step 3: Implementar `components/filter-bar.tsx`**

```tsx
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Genre } from '@/lib/tmdb/types'

const DECADAS = [2020, 2010, 2000, 1990, 1980, 1970]
const NOTAS = [6, 7, 8]
const ORDENACOES = [
  { valor: 'popularity', rotulo: 'Mais populares' },
  { valor: 'rating', rotulo: 'Melhores notas' },
  { valor: 'releaseDate', rotulo: 'Mais recentes' },
]

const CLASSE_SELECT =
  'rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400'

export function FilterBar({ genres }: { genres: Genre[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function aplicar(chave: string, valor: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (valor === '') {
      params.delete(chave)
    } else {
      params.set(chave, valor)
    }

    // Trocar um filtro invalida a posição na paginação.
    params.delete('pagina')

    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3 px-4 py-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-genero" className="text-xs text-neutral-400">Gênero</label>
        <select
          id="filtro-genero"
          className={CLASSE_SELECT}
          value={searchParams.get('genero') ?? ''}
          onChange={(evento) => aplicar('genero', evento.target.value)}
        >
          <option value="">Todos</option>
          {genres.map((genero) => (
            <option key={genero.id} value={genero.id}>{genero.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-decada" className="text-xs text-neutral-400">Década</label>
        <select
          id="filtro-decada"
          className={CLASSE_SELECT}
          value={searchParams.get('decada') ?? ''}
          onChange={(evento) => aplicar('decada', evento.target.value)}
        >
          <option value="">Qualquer</option>
          {DECADAS.map((decada) => (
            <option key={decada} value={decada}>{decada}s</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-nota" className="text-xs text-neutral-400">Nota mínima</label>
        <select
          id="filtro-nota"
          className={CLASSE_SELECT}
          value={searchParams.get('nota') ?? ''}
          onChange={(evento) => aplicar('nota', evento.target.value)}
        >
          <option value="">Qualquer</option>
          {NOTAS.map((nota) => (
            <option key={nota} value={nota}>{nota} ou mais</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="filtro-ordem" className="text-xs text-neutral-400">Ordenar por</label>
        <select
          id="filtro-ordem"
          className={CLASSE_SELECT}
          value={searchParams.get('ordenar') ?? 'popularity'}
          onChange={(evento) => aplicar('ordenar', evento.target.value)}
        >
          {ORDENACOES.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run components/filter-bar.test.tsx`
Expected: PASS — 5 testes.

- [ ] **Step 5: Implementar `components/movie-grid.tsx`**

```tsx
import type { Movie, WatchOptions } from '@/lib/tmdb/types'
import { MovieCard } from './movie-card'

type Props = {
  movies: Movie[]
  /** Mapa de disponibilidade por id, usado apenas pela Busca. */
  availability?: Record<number, WatchOptions>
}

export function MovieGrid({ movies, availability }: Props) {
  return (
    <ul className="grid grid-cols-2 justify-items-center gap-6 px-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {movies.map((filme) => (
        <li key={filme.id}>
          <MovieCard movie={filme} availability={availability?.[filme.id]} />
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 6: Implementar `app/explorar/page.tsx`**

A paginação usa links reais em vez de scroll infinito puro. Um link é alcançável por teclado, funciona com o botão voltar e é indexável — três coisas que o scroll infinito quebra.

```tsx
import Link from 'next/link'
import { EmptyState } from '@/components/empty-state'
import { FilterBar } from '@/components/filter-bar'
import { MovieGrid } from '@/components/movie-grid'
import { discoverMovies } from '@/lib/tmdb/discover'
import { getGenres } from '@/lib/tmdb/genres'
import type { SortBy } from '@/lib/tmdb/types'

type Props = {
  searchParams: Promise<{
    servicos?: string
    genero?: string
    decada?: string
    nota?: string
    ordenar?: string
    pagina?: string
  }>
}

const ORDENACOES_VALIDAS: SortBy[] = ['popularity', 'rating', 'releaseDate']

function numero(valor: string | undefined): number | undefined {
  if (valor === undefined) return undefined
  const n = Number(valor)
  return Number.isFinite(n) ? n : undefined
}

export default async function ExplorarPage({ searchParams }: Props) {
  const params = await searchParams

  const providerIds = (params.servicos ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)

  const ordenar = params.ordenar as SortBy | undefined
  const pagina = numero(params.pagina) ?? 1

  const [generos, resultado] = await Promise.all([
    getGenres(),
    discoverMovies({
      providerIds,
      genreId: numero(params.genero),
      decade: numero(params.decada),
      minRating: numero(params.nota),
      sortBy: ordenar && ORDENACOES_VALIDAS.includes(ordenar) ? ordenar : 'popularity',
      page: pagina,
    }),
  ])

  function urlDaPagina(destino: number): string {
    const proximos = new URLSearchParams()
    for (const [chave, valor] of Object.entries(params)) {
      if (valor) proximos.set(chave, valor)
    }
    proximos.set('pagina', String(destino))
    return `/explorar?${proximos.toString()}`
  }

  return (
    <div className="mx-auto max-w-6xl py-4">
      <h1 className="px-4 text-2xl font-semibold text-neutral-100">Explorar</h1>

      <FilterBar genres={generos} />

      {resultado.items.length === 0 ? (
        <EmptyState
          title="Nenhum filme com esses filtros"
          hint="Tente afrouxar a nota mínima, ampliar a década ou marcar mais serviços de streaming."
        />
      ) : (
        <>
          <p className="px-4 pb-2 text-sm text-neutral-400" role="status">
            {resultado.totalResults.toLocaleString('pt-BR')} filmes encontrados
          </p>

          <MovieGrid movies={resultado.items} />

          <nav aria-label="Paginação" className="flex justify-center gap-4 px-4 py-8">
            {pagina > 1 && (
              <Link
                href={urlDaPagina(pagina - 1)}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Página anterior
              </Link>
            )}
            {pagina < resultado.totalPages && (
              <Link
                href={urlDaPagina(pagina + 1)}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Carregar mais
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Rodar a suíte e o build**

Run: `npm test && npm run build`
Expected: PASS e build sem erros.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: tela explorar com filtros na URL e paginacao acessivel"
```

---

## Task 13: Página de detalhe do filme

**Files:**
- Create: `app/filme/[id]/page.tsx`, `components/watch-provider-block.tsx`
- Test: `components/watch-provider-block.test.tsx`

**Interfaces:**
- Consumes: `getMovie`, `getSimilarMovies`, `WatchOptions`, `MovieRail`, `WatchlistButton`
- Produces: `<WatchProviderBlock options={WatchOptions} subscribedIds={number[]} />`

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/watch-provider-block.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { WatchOptions } from '@/lib/tmdb/types'
import { WatchProviderBlock } from './watch-provider-block'

const netflix = { id: 8, name: 'Netflix', logoUrl: null, displayPriority: 1 }
const appleTv = { id: 2, name: 'Apple TV', logoUrl: null, displayPriority: 2 }

const completo: WatchOptions = {
  flatrate: [netflix],
  rent: [appleTv],
  buy: [appleTv],
  tmdbLink: 'https://www.themoviedb.org/movie/1/watch',
}

describe('WatchProviderBlock', () => {
  it('separa assinatura, aluguel e compra com rotulos claros', () => {
    render(<WatchProviderBlock options={completo} subscribedIds={[]} />)

    expect(screen.getByRole('heading', { name: /incluso na assinatura/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /alugar/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /comprar/i })).toBeInTheDocument()
  })

  it('destaca os servicos que o usuario ja assina', () => {
    render(<WatchProviderBlock options={completo} subscribedIds={[8]} />)

    expect(screen.getByText(/voce assina/i)).toBeInTheDocument()
  })

  it('nao destaca nada quando o usuario nao assina o servico', () => {
    render(<WatchProviderBlock options={completo} subscribedIds={[119]} />)

    expect(screen.queryByText(/voce assina/i)).not.toBeInTheDocument()
  })

  it('omite secoes vazias', () => {
    render(
      <WatchProviderBlock
        options={{ flatrate: [netflix], rent: [], buy: [], tmdbLink: null }}
        subscribedIds={[]}
      />,
    )

    expect(screen.queryByRole('heading', { name: /alugar/i })).not.toBeInTheDocument()
  })

  it('avisa quando o filme nao esta disponivel no Brasil', () => {
    render(
      <WatchProviderBlock
        options={{ flatrate: [], rent: [], buy: [], tmdbLink: null }}
        subscribedIds={[]}
      />,
    )

    expect(screen.getByText(/não está disponível/i)).toBeInTheDocument()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<WatchProviderBlock options={completo} subscribedIds={[8]} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run components/watch-provider-block.test.tsx`
Expected: FAIL — módulo `./watch-provider-block` não existe.

- [ ] **Step 3: Implementar `components/watch-provider-block.tsx`**

```tsx
import Image from 'next/image'
import type { Provider, WatchOptions } from '@/lib/tmdb/types'

type Props = {
  options: WatchOptions
  /** Serviços que o usuário assina, para destacar o que já está pago. */
  subscribedIds: number[]
}

function Secao({
  titulo,
  provedores,
  subscribedIds,
}: {
  titulo: string
  provedores: Provider[]
  subscribedIds: number[]
}) {
  if (provedores.length === 0) return null

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-neutral-300">{titulo}</h3>
      <ul className="mt-2 flex flex-wrap gap-3">
        {provedores.map((provedor) => {
          const assinado = subscribedIds.includes(provedor.id)

          return (
            <li
              key={provedor.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                assinado ? 'border-sky-400 bg-sky-950/40' : 'border-neutral-700'
              }`}
            >
              {provedor.logoUrl && (
                <Image src={provedor.logoUrl} alt="" width={28} height={28} className="rounded" />
              )}
              <span className="text-sm text-neutral-100">{provedor.name}</span>
              {assinado && (
                <span className="text-xs font-medium text-sky-400">Você assina</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function WatchProviderBlock({ options, subscribedIds }: Props) {
  const semNada =
    options.flatrate.length === 0 && options.rent.length === 0 && options.buy.length === 0

  return (
    <section aria-labelledby="onde-assistir" className="mt-8">
      <h2 id="onde-assistir" className="text-lg font-semibold text-neutral-100">
        Onde assistir
      </h2>

      {semNada ? (
        <p className="mt-2 text-sm text-neutral-400">
          Este filme não está disponível em nenhum serviço no Brasil no momento.
        </p>
      ) : (
        <>
          <Secao titulo="Incluso na assinatura" provedores={options.flatrate} subscribedIds={subscribedIds} />
          <Secao titulo="Alugar" provedores={options.rent} subscribedIds={subscribedIds} />
          <Secao titulo="Comprar" provedores={options.buy} subscribedIds={subscribedIds} />

          {options.tmdbLink && (
            <p className="mt-4 text-xs text-neutral-500">
              <a
                href={options.tmdbLink}
                target="_blank"
                rel="noreferrer"
                className="rounded underline hover:text-neutral-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Ver preços e opções no JustWatch
              </a>
            </p>
          )}
        </>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run components/watch-provider-block.test.tsx`
Expected: PASS — 6 testes.

- [ ] **Step 5: Implementar `app/filme/[id]/page.tsx`**

```tsx
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { MovieRail } from '@/components/movie-rail'
import { MovieRailSkeleton } from '@/components/skeletons'
import { WatchProviderBlock } from '@/components/watch-provider-block'
import { WatchlistButton } from '@/components/watchlist-button'
import { TmdbError } from '@/lib/tmdb/client'
import { getMovie, getSimilarMovies } from '@/lib/tmdb/movies'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ servicos?: string }>
}

function idsDeServicos(bruto: string | undefined): number[] {
  if (!bruto) return []
  return bruto.split(',').map(Number).filter((n) => Number.isFinite(n) && n > 0)
}

async function Similares({ id, providerIds }: { id: number; providerIds: number[] }) {
  const filmes = await getSimilarMovies(id, providerIds)
  return <MovieRail title="Você também pode gostar" movies={filmes} />
}

export default async function FilmePage({ params, searchParams }: Props) {
  const { id } = await params
  const { servicos } = await searchParams
  const providerIds = idsDeServicos(servicos)
  const idNumerico = Number(id)

  if (!Number.isFinite(idNumerico)) notFound()

  let filme
  try {
    filme = await getMovie(idNumerico)
  } catch (erro) {
    if (erro instanceof TmdbError && erro.status === 404) notFound()
    throw erro
  }

  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        {filme.posterUrl ? (
          <Image
            src={filme.posterUrl}
            alt={`Pôster de ${filme.title}`}
            width={220}
            height={330}
            className="w-40 shrink-0 rounded-lg sm:w-56"
          />
        ) : (
          <div className="flex h-80 w-40 shrink-0 items-center justify-center rounded-lg bg-neutral-800 p-4 text-center text-sm text-neutral-400 sm:w-56">
            {filme.title}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-neutral-100">{filme.title}</h1>

          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
            {filme.releaseYear !== null && <span>{filme.releaseYear}</span>}
            {filme.runtimeMinutes !== null && <span>{filme.runtimeMinutes} min</span>}
            {filme.rating !== null && (
              <span aria-label={`Nota ${filme.rating.toFixed(1)} de 10`}>
                <span aria-hidden="true">★ {filme.rating.toFixed(1)}</span>
              </span>
            )}
          </p>

          {filme.genres.length > 0 && (
            <p className="mt-2 text-sm text-neutral-400">
              {filme.genres.map((g) => g.name).join(' · ')}
            </p>
          )}

          <div className="mt-4">
            <WatchlistButton movieId={filme.id} title={filme.title} />
          </div>

          {filme.overview && (
            <p className="mt-4 text-neutral-200">{filme.overview}</p>
          )}
        </div>
      </div>

      <WatchProviderBlock options={filme.watchOptions} subscribedIds={providerIds} />

      {filme.trailerYoutubeKey && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-100">Trailer</h2>
          <div className="mt-3 aspect-video overflow-hidden rounded-lg">
            <iframe
              src={`https://www.youtube.com/embed/${filme.trailerYoutubeKey}`}
              title={`Trailer de ${filme.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </section>
      )}

      {filme.cast.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-100">Elenco</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {filme.cast.map((pessoa) => (
              <li key={pessoa.id} className="text-sm">
                <p className="text-neutral-100">{pessoa.name}</p>
                <p className="text-neutral-400">{pessoa.character}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Suspense fallback={<MovieRailSkeleton />}>
        <Similares id={filme.id} providerIds={providerIds} />
      </Suspense>
    </article>
  )
}
```

- [ ] **Step 6: Rodar a suíte e o build**

Run: `npm test && npm run build`
Expected: PASS e build sem erros.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: pagina de detalhe com bloco onde assistir e similares"
```

---

## Task 14: Busca e Minha lista

**Files:**
- Create: `app/busca/page.tsx`, `app/minha-lista/page.tsx`, `components/search-form.tsx`, `components/watchlist-view.tsx`
- Create: `app/api/filmes/route.ts`
- Test: `components/search-form.test.tsx`

**Interfaces:**
- Consumes: `searchMovies`, `getMovieProviders`, `getMovie`, `MovieGrid`, `EmptyState`
- Produces:
  - `<SearchForm />` — formulário que navega para `/busca?q=...`
  - `GET /api/filmes?ids=1,2,3` → `{ movies: Movie[] }`, usado pela Minha lista

A Minha lista precisa de uma rota de API porque os ids vivem no `localStorage`, que só existe no navegador — um Server Component não tem como lê-los.

- [ ] **Step 1: Escrever o teste que falha**

Crie `components/search-form.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchForm } from './search-form'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(''),
}))

beforeEach(() => {
  push.mockClear()
})

describe('SearchForm', () => {
  it('tem um campo de busca rotulado', () => {
    render(<SearchForm />)

    expect(screen.getByLabelText(/buscar filme/i)).toBeInTheDocument()
  })

  it('navega para a busca ao enviar o formulario', async () => {
    const usuario = userEvent.setup()
    render(<SearchForm />)

    await usuario.type(screen.getByLabelText(/buscar filme/i), 'matrix')
    await usuario.click(screen.getByRole('button', { name: /buscar/i }))

    expect(push).toHaveBeenCalledWith('/busca?q=matrix')
  })

  it('nao navega quando o campo esta vazio', async () => {
    const usuario = userEvent.setup()
    render(<SearchForm />)

    await usuario.click(screen.getByRole('button', { name: /buscar/i }))

    expect(push).not.toHaveBeenCalled()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<SearchForm />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Rodar para confirmar a falha**

Run: `npx vitest run components/search-form.test.tsx`
Expected: FAIL — módulo `./search-form` não existe.

- [ ] **Step 3: Implementar `components/search-form.tsx`**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function SearchForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [termo, setTermo] = useState(searchParams.get('q') ?? '')

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    const limpo = termo.trim()
    if (limpo === '') return
    router.push(`/busca?q=${encodeURIComponent(limpo)}`)
  }

  return (
    <form onSubmit={enviar} role="search" className="flex gap-2 px-4 py-4">
      <div className="flex-1">
        <label htmlFor="campo-busca" className="sr-only">
          Buscar filme pelo título
        </label>
        <input
          id="campo-busca"
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          placeholder="Digite o nome de um filme"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-neutral-100 placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-sky-500 px-5 py-2.5 font-medium text-neutral-950 transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        Buscar
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run components/search-form.test.tsx`
Expected: PASS — 4 testes.

- [ ] **Step 5: Implementar `app/busca/page.tsx`**

Só aqui vale pagar por disponibilidade: os resultados não estão filtrados por serviço, então os badges são a informação central.

```tsx
import { EmptyState } from '@/components/empty-state'
import { MovieGrid } from '@/components/movie-grid'
import { SearchForm } from '@/components/search-form'
import { getMovieProviders, searchMovies } from '@/lib/tmdb/movies'
import type { WatchOptions } from '@/lib/tmdb/types'

type Props = {
  searchParams: Promise<{ q?: string }>
}

export default async function BuscaPage({ searchParams }: Props) {
  const { q } = await searchParams
  const termo = (q ?? '').trim()
  const resultado = await searchMovies(termo, 1)

  // Buscar disponibilidade só dos que aparecem na tela. Com cache de 24h,
  // o custo real some depois da primeira visita.
  const disponibilidade: Record<number, WatchOptions> = {}
  await Promise.all(
    resultado.items.slice(0, 20).map(async (filme) => {
      try {
        disponibilidade[filme.id] = await getMovieProviders(filme.id)
      } catch {
        // Sem badge é melhor que sem resultado.
      }
    }),
  )

  return (
    <div className="mx-auto max-w-6xl py-4">
      <h1 className="px-4 text-2xl font-semibold text-neutral-100">Buscar</h1>

      <SearchForm />

      <div role="status" aria-live="polite" className="px-4 pb-2 text-sm text-neutral-400">
        {termo === ''
          ? ''
          : `${resultado.totalResults.toLocaleString('pt-BR')} resultados para "${termo}"`}
      </div>

      {termo === '' ? (
        <EmptyState
          title="Busque por um filme"
          hint="Digite um título para descobrir em quais serviços ele está disponível no Brasil."
        />
      ) : resultado.items.length === 0 ? (
        <EmptyState
          title="Nenhum filme encontrado"
          hint="Confira a grafia do título ou tente o nome original em inglês."
        />
      ) : (
        <MovieGrid movies={resultado.items} availability={disponibilidade} />
      )}
    </div>
  )
}
```

- [ ] **Step 6: Implementar `app/api/filmes/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { getMovie } from '@/lib/tmdb/movies'
import type { Movie } from '@/lib/tmdb/types'

/** Teto defensivo: a watchlist é do usuário, mas a rota é pública. */
const MAXIMO_DE_IDS = 50

export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get('ids') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, MAXIMO_DE_IDS)

  if (ids.length === 0) {
    return NextResponse.json({ movies: [] })
  }

  const resultados = await Promise.all(
    ids.map(async (id) => {
      try {
        return await getMovie(id)
      } catch {
        return null
      }
    }),
  )

  const movies: Movie[] = resultados.filter((filme): filme is NonNullable<typeof filme> => filme !== null)

  return NextResponse.json({ movies })
}
```

- [ ] **Step 7: Implementar `components/watchlist-view.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { MovieGrid } from '@/components/movie-grid'
import { MovieCardSkeleton } from '@/components/skeletons'
import { usePreferences } from '@/lib/hooks/use-preferences'
import type { Movie } from '@/lib/tmdb/types'

export function WatchlistView() {
  const { preferences, hydrated } = usePreferences()
  const [filmes, setFilmes] = useState<Movie[]>([])
  const [carregando, setCarregando] = useState(true)

  const ids = preferences.watchlist.join(',')

  useEffect(() => {
    if (!hydrated) return

    if (ids === '') {
      setFilmes([])
      setCarregando(false)
      return
    }

    let ativo = true
    setCarregando(true)

    fetch(`/api/filmes?ids=${ids}`)
      .then((resposta) => resposta.json())
      .then((dados: { movies: Movie[] }) => {
        if (ativo) setFilmes(dados.movies)
      })
      .catch(() => {
        if (ativo) setFilmes([])
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [hydrated, ids])

  if (!hydrated || carregando) {
    return (
      <div className="flex flex-wrap justify-center gap-6 px-4" role="status" aria-label="Carregando sua lista">
        {Array.from({ length: 5 }, (_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (filmes.length === 0) {
    return (
      <EmptyState
        title="Sua lista está vazia"
        hint="Toque na estrela de qualquer filme para guardá-lo aqui e assistir depois."
      />
    )
  }

  return <MovieGrid movies={filmes} />
}
```

- [ ] **Step 8: Implementar `app/minha-lista/page.tsx`**

```tsx
import { WatchlistView } from '@/components/watchlist-view'

export default function MinhaListaPage() {
  return (
    <div className="mx-auto max-w-6xl py-4">
      <h1 className="px-4 pb-4 text-2xl font-semibold text-neutral-100">Minha lista</h1>
      <WatchlistView />
    </div>
  )
}
```

- [ ] **Step 9: Rodar a suíte e o build**

Run: `npm test && npm run build`
Expected: PASS e build sem erros.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: busca com disponibilidade por filme e tela minha lista"
```

---

## Task 15: Auditoria de acessibilidade e preparação para o deploy

**Files:**
- Modify: `app/globals.css`
- Create: `test/a11y.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: todos os componentes
- Produces: suíte de acessibilidade agregada; app pronto para publicar

- [ ] **Step 1: Escrever a suíte de acessibilidade**

Crie `test/a11y.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from '@/components/empty-state'
import { MovieGrid } from '@/components/movie-grid'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { WatchProviderBlock } from '@/components/watch-provider-block'
import type { Movie } from '@/lib/tmdb/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(''),
}))

const filme: Movie = {
  id: 1,
  title: 'Um filme',
  originalTitle: 'A movie',
  overview: 'Sinopse.',
  posterUrl: null,
  backdropUrl: null,
  releaseYear: 2024,
  rating: 7.5,
  voteCount: 200,
  genreIds: [],
}

describe('acessibilidade das telas principais', () => {
  it('cabecalho do site', async () => {
    const { container } = render(<SiteHeader />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('rodape do site', async () => {
    const { container } = render(<SiteFooter />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('grade de filmes', async () => {
    const { container } = render(<MovieGrid movies={[filme]} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('estado vazio', async () => {
    const { container } = render(<EmptyState title="Nada aqui" hint="Tente outro filtro." />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('bloco de onde assistir sem disponibilidade', async () => {
    const { container } = render(
      <WatchProviderBlock
        options={{ flatrate: [], rent: [], buy: [], tmdbLink: null }}
        subscribedIds={[]}
      />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

- [ ] **Step 2: Rodar a suíte de acessibilidade**

Run: `npx vitest run test/a11y.test.tsx`
Expected: PASS — 5 testes. Se algum falhar, o relatório do `axe` nomeia a regra violada; corrija o componente antes de seguir.

- [ ] **Step 3: Respeitar `prefers-reduced-motion` globalmente**

Acrescente ao final de `app/globals.css`:

```css
/* Quem pediu menos movimento no sistema não deve receber animação nenhuma. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Conferir o contraste manualmente**

Abra `npm run dev` e verifique com as ferramentas de desenvolvedor (aba Acessibilidade) que estes pares atingem 4.5:1:

| Elemento | Cores |
|---|---|
| Texto secundário dos cards | `text-neutral-400` sobre `bg-neutral-950` |
| Rótulos dos filtros | `text-neutral-400` sobre `bg-neutral-950` |
| Links do rodapé | `text-neutral-400` sobre `bg-neutral-950` |

Se algum ficar abaixo, troque `neutral-400` por `neutral-300` no elemento afetado.

- [ ] **Step 5: Percorrer o app inteiro sem mouse**

Com o servidor rodando, use apenas `Tab`, `Shift+Tab`, `Enter` e `Espaço` para: selecionar serviços → confirmar → percorrer um trilho → abrir um filme → salvar na lista → ir para Minha lista → buscar um título. Todo elemento focado deve ter contorno visível. Corrija o que falhar antes de seguir.

- [ ] **Step 6: Atualizar o README**

Troque a linha de status no `README.md`:

```markdown
> **Status:** v1 completa. Descoberta, exploração, detalhe, busca e watchlist funcionando.
```

- [ ] **Step 7: Rodar a suíte completa e o build**

Run: `npm test && npm run build`
Expected: PASS em todos os arquivos; build sem erros nem avisos de tipo.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: auditoria de acessibilidade e ajustes de contraste e movimento"
```

- [ ] **Step 9: Publicar na Vercel**

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório `catalogo-streaming`.
2. Em *Environment Variables*, adicione `TMDB_ACCESS_TOKEN` com o token do TMDB.
3. Clique em *Deploy*.
4. Acrescente a URL publicada ao topo do `README.md` e faça commit.

```bash
git add README.md
git commit -m "docs: adiciona link do app publicado"
git push
```

---

## Cobertura do spec

| Seção do spec | Tarefa |
|---|---|
| §4 Arquitetura, chave server-only | 2 |
| §5 Modelo de dados | 3 |
| §6 Camada `lib/tmdb/` e cache | 2, 3, 4, 5, 6 |
| §7.1 Seleção de serviços | 9, 11 |
| §7.2 Home com cinco trilhos | 11 |
| §7.3 Explorar | 12 |
| §7.4 Detalhe e onde assistir | 13 |
| §7.5 Busca | 14 |
| §7.6 Minha lista | 14 |
| §8 Componentes | 8, 9, 10, 12, 13, 14 |
| §9 Estado e persistência | 7 |
| §10 Tratamento de erros | 2, 7, 11, 12, 13, 14 |
| §11 Performance | 8, 11 |
| §12 Acessibilidade | 8, 9, 10, 11, 12, 13, 14, 15 |
| §13 Testes | todas |
| §15 Configuração | 1, 11, 15 |
| §16 Definição de pronto | 15 |
