import type { Movie, WatchOptions } from '@/lib/tmdb/types'
import { MovieCard } from './movie-card'

type Props = {
  movies: Movie[]
  /** Mapa de disponibilidade por id, usado apenas pela Busca. */
  availability?: Record<number, WatchOptions>
  /** Ruling T13-a: repassado a cada MovieCard para o link do filme carregar o filtro de serviços. */
  servicos?: string
}

export function MovieGrid({ movies, availability, servicos }: Props) {
  return (
    <ul className="grid grid-cols-2 justify-items-center gap-6 px-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {movies.map((filme) => (
        <li key={filme.id}>
          <MovieCard
            movie={filme}
            availability={availability?.[filme.id]}
            servicos={servicos}
            // MovieGrid é sempre usada direto sob o <h1> da página (Explorar,
            // Busca, Minha lista, sem heading intermediário) — ver comentário
            // em movie-card.tsx sobre a regra heading-order do axe.
            headingLevel={2}
          />
        </li>
      ))}
    </ul>
  )
}
