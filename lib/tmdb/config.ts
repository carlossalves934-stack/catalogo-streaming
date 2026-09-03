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
