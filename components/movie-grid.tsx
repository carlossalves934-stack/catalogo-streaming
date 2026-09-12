import type { Movie, WatchOptions } from '@/lib/tmdb/types'
import { MovieCard } from './movie-card'

type Props = {
  movies: Movie[]
  /** Mapa de disponibilidade por id, usado apenas pela Busca. */
  availability?: Record<number, WatchOptions>
}

export function MovieGrid({ movies, availability }: Props) {
  return (
    <ul className="grid grid-cols-2 justify-items-center gap-6 px-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {movies.map((filme) => (
        <li key={filme.id}>
          <MovieCard movie={filme} availability={availability?.[filme.id]} />
        </li>
      ))}
    </ul>
  )
}
