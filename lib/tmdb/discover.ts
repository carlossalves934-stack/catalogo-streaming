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
