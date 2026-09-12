import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { MovieRail } from '@/components/movie-rail'
import { MovieRating } from '@/components/movie-rating'
import { MovieRailSkeleton } from '@/components/skeletons'
import { WatchProviderSection } from '@/components/watch-provider-section'
import { WatchlistButton } from '@/components/watchlist-button'
import { idsDeServicos } from '@/lib/servicos'
import { TmdbError } from '@/lib/tmdb/client'
import { getMovie, getSimilarMovies } from '@/lib/tmdb/movies'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ servicos?: string }>
}

async function Similares({
  id,
  genreId,
  providerIds,
  servicos,
}: {
  id: number
  genreId: number
  providerIds: number[]
  servicos?: string
}) {
  const filmes = await getSimilarMovies(id, genreId, providerIds)
  // Ruling T13-a / Finding 3 da revisão: repassa `servicos` para que os
  // cards desta trilha carreguem o mesmo filtro ao navegar — sem isso, o
  // segundo filme que a pessoa abre a partir daqui perde o recorte de
  // catálogo que esta tarefa existe para preservar.
  return <MovieRail title="Você também pode gostar" movies={filmes} servicos={servicos} />
}

export default async function FilmePage({ params, searchParams }: Props) {
  const { id } = await params
  const { servicos } = await searchParams
  // Ruling T13-a: estes ids vêm da URL (mesmo parser da Home/Explorar) e
  // servem só para filtrar os similares — não têm relação com o destaque
  // "Você assina" do bloco "onde assistir", que é preferência pessoal.
  const providerIds = idsDeServicos(servicos)
  const idNumerico = Number(id)

  if (!Number.isFinite(idNumerico)) notFound()

  let filme
  try {
    filme = await getMovie(idNumerico)
  } catch (erro) {
    if (erro instanceof TmdbError && erro.status === 404) notFound()
    throw erro
  }

  // Ruling F3: getSimilarMovies exige um gênero. Um filme sem gênero
  // cadastrado não tem como gerar uma recomendação coerente — melhor omitir
  // a seção do que chamar o TMDB com um gênero inventado.
  const generoPrincipal = filme.genres[0]?.id

  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        {filme.posterUrl ? (
          <Image
            src={filme.posterUrl}
            alt={`Pôster de ${filme.title}`}
            width={220}
            height={330}
            className="w-40 shrink-0 rounded-lg sm:w-56"
          />
        ) : (
          <div className="flex h-80 w-40 shrink-0 items-center justify-center rounded-lg bg-neutral-800 p-4 text-center text-sm text-neutral-400 sm:w-56">
            {filme.title}
          </div>
        )}

        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-neutral-100">{filme.title}</h1>

          <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-400">
            {filme.releaseYear !== null && <span>{filme.releaseYear}</span>}
            {filme.runtimeMinutes !== null && <span>{filme.runtimeMinutes} min</span>}
            <MovieRating rating={filme.rating} />
          </p>

          {filme.genres.length > 0 && (
            <p className="mt-2 text-sm text-neutral-400">
              {filme.genres.map((g) => g.name).join(' · ')}
            </p>
          )}

          <div className="mt-4">
            <WatchlistButton movieId={filme.id} title={filme.title} />
          </div>

          {filme.overview && <p className="mt-4 text-neutral-200">{filme.overview}</p>}
        </div>
      </div>

      <WatchProviderSection options={filme.watchOptions} />

      {filme.trailerYoutubeKey && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-100">Trailer</h2>
          <div className="mt-3 aspect-video overflow-hidden rounded-lg">
            <iframe
              src={`https://www.youtube.com/embed/${filme.trailerYoutubeKey}`}
              title={`Trailer de ${filme.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </section>
      )}

      {filme.cast.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-neutral-100">Elenco</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {filme.cast.map((pessoa) => (
              <li key={pessoa.id} className="text-sm">
                <p className="text-neutral-100">{pessoa.name}</p>
                <p className="text-neutral-400">{pessoa.character}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {generoPrincipal !== undefined && (
        <Suspense fallback={<MovieRailSkeleton />}>
          <Similares
            id={filme.id}
            genreId={generoPrincipal}
            providerIds={providerIds}
            servicos={servicos}
          />
        </Suspense>
      )}
    </article>
  )
}
