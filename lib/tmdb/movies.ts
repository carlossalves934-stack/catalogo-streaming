import 'server-only'
import { tmdbFetch } from './client'
import { CACHE, WATCH_REGION } from './config'
import { discoverMovies } from './discover'
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
 *
 * O gênero é recebido do chamador (a página de detalhe já carregou o filme
 * e conhece o gênero) em vez de buscado aqui de novo — evitando uma
 * segunda chamada a getMovie só para descobrir o que o chamador já sabe.
 */
export async function getSimilarMovies(
  id: number,
  genreId: number,
  providerIds: number[],
): Promise<Movie[]> {
  const pagina = await discoverMovies({
    providerIds,
    genreId,
    sortBy: 'rating',
    page: 1,
  })

  return pagina.items.filter((filme) => filme.id !== id).slice(0, 12)
}
