import Image from 'next/image'
import Link from 'next/link'
import { backdropEmTamanho } from '@/lib/tmdb/images'
import type { Genre, Movie, WatchOptions } from '@/lib/tmdb/types'
import { MovieRating } from './movie-rating'
import { WatchlistButton } from './watchlist-button'

type Props = {
  movie: Movie
  /** Onde dá para assistir. Ausente quando a consulta ao TMDB falhou. */
  disponibilidade?: WatchOptions
  /** Gêneros do TMDB, para traduzir o primeiro genreId do filme. */
  generos: Genre[]
  /** Valor bruto do parâmetro `servicos`, repassado ao link do filme. */
  servicos?: string
}

function Separador() {
  return <span aria-hidden="true" className="h-3 w-px bg-contorno" />
}

export function HeroDestaque({ movie, disponibilidade, generos, servicos }: Props) {
  const href = servicos
    ? `/filme/${movie.id}?servicos=${encodeURIComponent(servicos)}`
    : `/filme/${movie.id}`

  const genero = generos.find((g) => g.id === movie.genreIds[0])?.name
  const assinaturas = disponibilidade?.flatrate.slice(0, 4) ?? []

  // Sem backdrop não há destaque: um retângulo vazio do tamanho da tela é
  // pior do que começar a página direto nos trilhos.
  if (!movie.backdropUrl) return null

  return (
    <section aria-labelledby="destaque-titulo" className="relative">
      {/*
        A luz do filme: o mesmo backdrop, desfocado, vazando para além da
        foto — como a TV iluminando a parede de uma sala escura. É daqui que
        vem a cor da página, e por isso ela muda a cada dia.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[130%] bg-cover bg-top opacity-40 blur-[90px] saturate-150"
        style={{
          backgroundImage: `url(${backdropEmTamanho(movie.backdropUrl, 'w300')})`,
          maskImage: 'linear-gradient(to bottom, black 35%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 35%, transparent 100%)',
        }}
      />

      {/*
        A foto fica atrás, o texto corre no fluxo normal: assim um título
        longo ou uma sinopse grande empurram a altura do destaque em vez de
        vazar por cima do menu no celular.
      */}
      <div className="relative flex min-h-[78vh] items-end">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={backdropEmTamanho(movie.backdropUrl, 'w1280')}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />

          {/*
            Dois véus: um sobe do rodapé para o texto ter fundo, outro vem da
            esquerda para a coluna de leitura. Separados porque fazem trabalhos
            diferentes e precisam de curvas diferentes.
          */}
          <div className="absolute inset-0 bg-gradient-to-t from-noite via-noite/65 via-45% to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-noite/90 via-noite/25 to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-32 sm:px-6 sm:pb-16">
          <div className="max-w-2xl motion-safe:animate-[surgir_700ms_cubic-bezier(0.16,1,0.3,1)_both]">
            <h2
              id="destaque-titulo"
              className="titulo text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-[0.95] text-texto"
            >
              {movie.title}
            </h2>

            <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-nevoa">
              {movie.releaseYear !== null && <span>{movie.releaseYear}</span>}
              {genero && movie.releaseYear !== null && <Separador />}
              {genero && <span>{genero}</span>}
              {movie.rating !== null && (genero || movie.releaseYear !== null) && <Separador />}
              {movie.rating !== null && <MovieRating rating={movie.rating} />}
            </p>

            {movie.overview && (
              <p className="mt-4 line-clamp-2 max-w-[58ch] sm:line-clamp-3 text-base leading-relaxed text-texto/90">
                {movie.overview}
              </p>
            )}

            {assinaturas.length > 0 && (
              <p className="mt-6 flex flex-wrap items-center gap-3 text-sm text-nevoa">
                <span>Disponível agora em</span>
                {assinaturas.map((provedor) =>
                  provedor.logoUrl ? (
                    <Image
                      key={provedor.id}
                      src={provedor.logoUrl}
                      alt={provedor.name}
                      width={28}
                      height={28}
                      className="rounded-md"
                    />
                  ) : (
                    <span key={provedor.id} className="text-texto">
                      {provedor.name}
                    </span>
                  ),
                )}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={href}
                className="rounded-full bg-lanterna px-6 py-3 text-sm font-semibold text-noite transition-colors hover:bg-[#ffcb60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna"
              >
                Onde assistir
              </Link>

              <WatchlistButton movieId={movie.id} title={movie.title} variante="rotulo" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
