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
    <section aria-label={title} className="group/trilho py-6">
      <div className="mx-auto mb-4 flex max-w-7xl items-baseline justify-between gap-4 px-4 sm:px-6">
        <h2 className="titulo text-xl font-semibold text-texto sm:text-2xl">{title}</h2>
        {href && (
          <Link
            href={href}
            className="shrink-0 rounded text-sm text-nevoa transition-colors hover:text-lanterna focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lanterna"
          >
            Ver mais
          </Link>
        )}
      </div>

      {/*
        tabIndex=0 torna a faixa rolável alcançável pelo teclado: sem isso,
        quem navega por teclado não consegue rolar o conteúdo horizontal.
        O padding vertical dá folga para o anel de foco do card não ser
        cortado pelo overflow da faixa.
      */}
      <ul
        tabIndex={0}
        className="trilho mx-auto flex max-w-7xl snap-x gap-4 overflow-x-auto px-4 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna motion-reduce:scroll-auto sm:gap-5 sm:px-6"
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
