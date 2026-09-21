import { EmptyState } from '@/components/empty-state'
import { MovieGrid } from '@/components/movie-grid'
import { SearchForm } from '@/components/search-form'
import { getMovieProviders, searchMovies } from '@/lib/tmdb/movies'
import type { WatchOptions } from '@/lib/tmdb/types'

type Props = {
  searchParams: Promise<{ q?: string }>
}

export default async function BuscaPage({ searchParams }: Props) {
  const { q } = await searchParams
  const termo = (q ?? '').trim()
  const resultado = await searchMovies(termo, 1)

  // Buscar disponibilidade só dos que aparecem na tela. Com cache de 24h,
  // o custo real some depois da primeira visita.
  //
  // Resultado da busca não é filtrado por serviço (ao contrário de
  // Home/Explorar), então `servicos` fica de propósito sem valor em
  // MovieGrid abaixo — não há filtro de catálogo para carregar adiante.
  const disponibilidade: Record<number, WatchOptions> = {}
  await Promise.all(
    resultado.items.slice(0, 20).map(async (filme) => {
      try {
        disponibilidade[filme.id] = await getMovieProviders(filme.id)
      } catch {
        // Sem badge é melhor que sem resultado.
      }
    }),
  )

  return (
    <div className="mx-auto max-w-7xl py-8">
      <h1 className="titulo px-4 text-2xl font-semibold text-texto sm:px-6 sm:text-3xl">Buscar</h1>

      <SearchForm />

      <div role="status" aria-live="polite" className="px-4 pb-2 text-sm text-nevoa">
        {termo === ''
          ? ''
          : `${resultado.totalResults.toLocaleString('pt-BR')} resultados para "${termo}"`}
      </div>

      {termo === '' ? (
        <EmptyState
          title="Busque por um filme"
          hint="Digite um título para descobrir em quais serviços ele está disponível no Brasil."
        />
      ) : resultado.items.length === 0 ? (
        <EmptyState
          title="Nenhum filme encontrado"
          hint="Confira a grafia do título ou tente o nome original em inglês."
        />
      ) : (
        <MovieGrid movies={resultado.items} availability={disponibilidade} />
      )}
    </div>
  )
}
