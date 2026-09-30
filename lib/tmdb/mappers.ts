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

/**
 * Ruling T14-a (movido de app/api/filmes/route.ts): MovieDetail carrega
 * elenco, gêneros, trailer e provedores. O TypeScript aceita usá-lo onde se
 * espera Movie, por ser um supertipo, mas tudo isso iria junto para uma
 * tela que só desenha cards. Este mapeamento explícito é o que de fato
 * reduz o que é enviado; a anotação de tipo sozinha não faz isso.
 */
export function resumirFilme(filme: MovieDetail): Movie {
  return {
    id: filme.id,
    title: filme.title,
    originalTitle: filme.originalTitle,
    overview: filme.overview,
    posterUrl: filme.posterUrl,
    backdropUrl: filme.backdropUrl,
    releaseYear: filme.releaseYear,
    rating: filme.rating,
    voteCount: filme.voteCount,
    genreIds: filme.genreIds,
  }
}
