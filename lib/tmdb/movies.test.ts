import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { getMovie, getMovieProviders, getSimilarMovies, searchMovies } from './movies'

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

describe('getSimilarMovies', () => {
  it('consulta o discover com o genero recebido, exclui o proprio filme e limita a 12', async () => {
    let url = ''
    // 14 resultados, incluindo o proprio filme (id 550): apos excluir o proprio
    // filme sobram 13, um a mais que o limite — so assim o slice(0, 12) e testado
    // de verdade (com 13 resultados, o filtro sozinho ja daria 12).
    const resultados = Array.from({ length: 14 }, (_, i) => ({
      id: i === 0 ? 550 : i + 1,
      title: `Filme ${i}`,
      vote_average: 7,
      vote_count: 400,
    }))

    server.use(
      http.get('https://api.themoviedb.org/3/discover/movie', ({ request }) => {
        url = request.url
        return HttpResponse.json({
          page: 1,
          total_pages: 1,
          total_results: resultados.length,
          results: resultados,
        })
      }),
    )

    const similares = await getSimilarMovies(550, 18, [8])

    expect(new URL(url).searchParams.get('with_genres')).toBe('18')
    expect(similares.some((filme) => filme.id === 550)).toBe(false)
    expect(similares).toHaveLength(12)
  })
})
