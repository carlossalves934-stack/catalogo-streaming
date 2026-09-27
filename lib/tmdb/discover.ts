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
  ratingAsc: 'vote_average.asc',
  releaseDate: 'primary_release_date.desc',
}

/**
 * Ordenacoes por nota — as duas pedem piso de votos.
 *
 * Na ordem crescente o piso importa ainda mais: sem ele o topo enche de
 * filme obscuro com um voto e nota 0,5, e a opcao promete "piores filmes
 * conhecidos", nao "filmes que ninguem viu".
 */
const ORDENA_POR_NOTA: SortBy[] = ['rating', 'ratingAsc']

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

  if (ORDENA_POR_NOTA.includes(filters.sortBy)) {
    params['vote_count.gte'] = String(VOTOS_MINIMOS_PARA_ORDENAR_POR_NOTA)
  }

  if (filters.genreId !== undefined) {
    params.with_genres = String(filters.genreId)
  }

  if (filters.minRating !== undefined) {
    params['vote_average.gte'] = String(filters.minRating)
  }

  // Ano e decada viram E logico no TMDB: os dois juntos nao cruzam nada e
  // devolveriam lista vazia sem explicacao. O ano exato e mais estrito,
  // entao ele manda, e a decada so vale na ausencia dele.
  if (filters.year !== undefined) {
    params.primary_release_year = String(filters.year)
  } else if (filters.decade !== undefined) {
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
