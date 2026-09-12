import Link from 'next/link'
import type { Movie } from '@/lib/tmdb/types'
import { MovieCard } from './movie-card'

type Props = {
  title: string
  movies: Movie[]
  /** Destino do "ver mais". Omitir esconde o link. */
  href?: string
  /** Ruling T13-a: repassado a cada MovieCard para o link do filme carregar o filtro de serviços. */
  servicos?: string
}

export function MovieRail({ title, movies, href, servicos }: Props) {
  // Um trilho vazio é ruído: não anuncia nada útil e ocupa espaço.
  if (movies.length === 0) return null

  return (
    <section aria-label={title} className="py-4">
      <div className="mb-3 flex items-baseline justify-between gap-4 px-4">
        <h2 className="text-lg font-semibold text-neutral-100">{title}</h2>
        {href && (
          <Link
            href={href}
            className="shrink-0 rounded text-sm text-sky-400 underline transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            Ver mais
          </Link>
        )}
      </div>

      {/*
        tabIndex=0 torna a faixa rolável alcançável pelo teclado: sem isso,
        quem navega por teclado não consegue rolar o conteúdo horizontal.
      */}
      <ul
        tabIndex={0}
        className="flex snap-x gap-4 overflow-x-auto px-4 pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 motion-reduce:scroll-auto"
      >
        {movies.map((filme) => (
          <li key={filme.id} className="snap-start">
            <MovieCard movie={filme} servicos={servicos} />
          </li>
        ))}
      </ul>
    </section>
  )
}
