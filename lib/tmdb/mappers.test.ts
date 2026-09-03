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
