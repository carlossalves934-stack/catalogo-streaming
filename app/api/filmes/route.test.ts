import { describe, expect, it, vi } from 'vitest'
import type { MovieDetail } from '@/lib/tmdb/types'

const getMovieMock = vi.fn<(id: number) => Promise<MovieDetail>>()

vi.mock('@/lib/tmdb/movies', () => ({
  getMovie: (id: number) => getMovieMock(id),
}))

const { GET } = await import('./route')

function filmeDetalhe(id: number): MovieDetail {
  return {
    id,
    title: `Filme ${id}`,
    originalTitle: `Movie ${id}`,
    overview: 'Sinopse.',
    posterUrl: null,
    backdropUrl: null,
    releaseYear: 2020,
    rating: 7.1,
    voteCount: 42,
    genreIds: [18],
    runtimeMinutes: 120,
    genres: [{ id: 18, name: 'Drama' }],
    cast: [],
    trailerYoutubeKey: 'abc123',
    watchOptions: { flatrate: [], rent: [], buy: [], tmdbLink: null },
  }
}

describe('GET /api/filmes', () => {
  it('remove ids repetidos antes de consultar o TMDB', async () => {
    getMovieMock.mockClear()
    getMovieMock.mockImplementation((id) => Promise.resolve(filmeDetalhe(id)))

    const resposta = await GET(new Request('http://localhost/api/filmes?ids=1,1,1,2,2'))
    const corpo = (await resposta.json()) as { movies: unknown[] }

    // O ponto central da Finding 2 da revisão: "ids=1,1,1,…" não pode virar
    // uma chamada ao TMDB por ocorrência — só uma por id distinto.
    expect(getMovieMock).toHaveBeenCalledTimes(2)
    expect(getMovieMock).toHaveBeenCalledWith(1)
    expect(getMovieMock).toHaveBeenCalledWith(2)
    expect(corpo.movies).toHaveLength(2)
  })

  it('descarta ids fracionarios, zero e negativos', async () => {
    getMovieMock.mockClear()
    getMovieMock.mockImplementation((id) => Promise.resolve(filmeDetalhe(id)))

    await GET(new Request('http://localhost/api/filmes?ids=1.5,0,-3,7'))

    expect(getMovieMock).toHaveBeenCalledTimes(1)
    expect(getMovieMock).toHaveBeenCalledWith(7)
  })

  it('omite filmes que o TMDB nao encontra mais, sem quebrar os demais', async () => {
    getMovieMock.mockClear()
    getMovieMock.mockImplementation((id) =>
      id === 2 ? Promise.reject(new Error('404')) : Promise.resolve(filmeDetalhe(id)),
    )

    const resposta = await GET(new Request('http://localhost/api/filmes?ids=1,2,3'))
    const corpo = (await resposta.json()) as { movies: Array<{ id: number }> }

    expect(corpo.movies.map((filme) => filme.id)).toEqual([1, 3])
  })

  it('devolve so os campos de Movie, sem os extras de MovieDetail', async () => {
    getMovieMock.mockClear()
    getMovieMock.mockImplementation((id) => Promise.resolve(filmeDetalhe(id)))

    const resposta = await GET(new Request('http://localhost/api/filmes?ids=1'))
    const corpo = (await resposta.json()) as { movies: Array<Record<string, unknown>> }

    expect(Object.keys(corpo.movies[0]).sort()).toEqual(
      [
        'backdropUrl',
        'genreIds',
        'id',
        'originalTitle',
        'overview',
        'posterUrl',
        'rating',
        'releaseYear',
        'title',
        'voteCount',
      ].sort(),
    )
  })
})
