export type SortBy = 'popularity' | 'rating' | 'ratingAsc' | 'releaseDate'

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
  year?: number
  minRating?: number
  sortBy: SortBy
  page: number
}
