import Image from 'next/image'
import Link from 'next/link'
import type { Movie, WatchOptions } from '@/lib/tmdb/types'
import { MovieRating } from './movie-rating'
import { WatchlistButton } from './watchlist-button'

type Props = {
  movie: Movie
  /**
   * Só a Busca preenche isto. Na Home e no Explorar todo resultado já está
   * filtrado pelos serviços do usuário, então os badges seriam redundantes
   * e custariam uma requisição por filme.
   */
  availability?: WatchOptions
  /**
   * Ruling T13-a: valor bruto do parâmetro de URL `servicos`, repassado ao
   * link do filme para que a página de detalhe filtre os "similares" pelo
   * mesmo catálogo — sem isso, a origem do clique (Home/Explorar já
   * filtradas) se perderia ao navegar. Onde não há esse contexto (Busca,
   * Watchlist), os similares voltam sem filtro de serviço.
   */
  servicos?: string
  /**
   * Nível do heading do título do card, para a ordem de headings da página
   * nunca pular um nível (regra `heading-order` do axe). Um MovieCard
   * dentro de um MovieRail já tem um <h2> logo acima (o título do trilho),
   * então o card usa <h3> (o padrão). Já em MovieGrid não há heading
   * nenhum entre o <h1> da página e os cards — Explorar, Busca e Minha
   * lista renderizam a grade direto sob o <h1> —, então MovieGrid pede
   * <h2> aqui para não pular do 1 pro 3.
   */
  headingLevel?: 2 | 3
}

// Componente de servidor: renderiza no servidor e não precisa de estado do
// cliente. Só o botão de watchlist (interativo) hidrata separadamente.
export function MovieCard({ movie, availability, servicos, headingLevel = 3 }: Props) {
  const Titulo = headingLevel === 2 ? 'h2' : 'h3'
  const hrefFilme = servicos
    ? `/filme/${movie.id}?servicos=${encodeURIComponent(servicos)}`
    : `/filme/${movie.id}`

  return (
    <article className="group relative w-40 shrink-0 sm:w-44">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-800">
        {movie.posterUrl ? (
          <Image
            src={movie.posterUrl}
            alt={`Pôster de ${movie.title}`}
            fill
            sizes="(max-width: 640px) 40vw, 176px"
            className="object-cover transition group-hover:scale-105"
          />
        ) : (
          <p
            data-testid="poster-ausente"
            className="flex h-full items-center justify-center p-3 text-center text-sm text-neutral-400"
          >
            {movie.title}
          </p>
        )}

        <div className="absolute right-2 top-2">
          <WatchlistButton movieId={movie.id} title={movie.title} />
        </div>
      </div>

      <Link
        href={hrefFilme}
        className="mt-2 block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
      >
        <Titulo className="line-clamp-2 text-sm font-medium text-neutral-100">{movie.title}</Titulo>
      </Link>

      <p className="mt-1 flex items-center gap-2 text-xs text-neutral-400">
        {movie.releaseYear !== null && <span>{movie.releaseYear}</span>}
        <MovieRating rating={movie.rating} />
      </p>

      {availability && availability.flatrate.length > 0 && (
        <ul data-testid="badges-disponibilidade" className="mt-2 flex flex-wrap gap-1">
          {availability.flatrate.slice(0, 3).map((provedor) => (
            <li key={provedor.id}>
              {provedor.logoUrl ? (
                <Image
                  src={provedor.logoUrl}
                  alt={provedor.name}
                  width={20}
                  height={20}
                  className="rounded"
                />
              ) : (
                <span className="text-xs text-neutral-400">{provedor.name}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
