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

describe('buildDiscoverParams: ordenacao crescente por nota', () => {
  it('traduz ratingAsc para vote_average.asc', () => {
    expect(buildDiscoverParams({ ...base, sortBy: 'ratingAsc' }).sort_by).toBe('vote_average.asc')
  })

  it('exige minimo de votos tambem na ordem crescente', () => {
    // Sem o piso, o topo vira filme obscuro de um voto e nota 0,5 — nao
    // "filmes ruins conhecidos", que e o que a opcao promete.
    expect(buildDiscoverParams({ ...base, sortBy: 'ratingAsc' })['vote_count.gte']).toBe('300')
  })
})

describe('buildDiscoverParams: filtro de ano', () => {
  it('repassa o ano como primary_release_year', () => {
    expect(buildDiscoverParams({ ...base, year: 2015 }).primary_release_year).toBe('2015')
  })

  it('ignora a decada quando um ano exato foi informado', () => {
    // Os dois juntos viram E logico no TMDB: decada=2000 com ano=2015 nao
    // cruza nada e devolveria lista vazia sem explicacao. O ano e mais
    // estrito, entao ele manda.
    const params = buildDiscoverParams({ ...base, decade: 2000, year: 2015 })

    expect(params.primary_release_year).toBe('2015')
    expect(params['primary_release_date.gte']).toBeUndefined()
    expect(params['primary_release_date.lte']).toBeUndefined()
  })

  it('mantem a decada quando nenhum ano foi informado', () => {
    const params = buildDiscoverParams({ ...base, decade: 2000 })

    expect(params['primary_release_date.gte']).toBe('2000-01-01')
    expect(params.primary_release_year).toBeUndefined()
  })
})
