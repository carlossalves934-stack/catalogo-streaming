import Link from 'next/link'
import { EmptyState } from '@/components/empty-state'
import { FilterBar } from '@/components/filter-bar'
import { MovieGrid } from '@/components/movie-grid'
import { idsDeServicos } from '@/lib/servicos'
import { discoverMovies } from '@/lib/tmdb/discover'
import { getGenres } from '@/lib/tmdb/genres'
import type { SortBy } from '@/lib/tmdb/types'

type Props = {
  searchParams: Promise<{
    servicos?: string
    genero?: string
    decada?: string
    nota?: string
    ordenar?: string
    pagina?: string
  }>
}

const ORDENACOES_VALIDAS: SortBy[] = ['popularity', 'rating', 'releaseDate']

function numero(valor: string | undefined): number | undefined {
  if (valor === undefined) return undefined
  const n = Number(valor)
  return Number.isFinite(n) ? n : undefined
}

function ehSortBy(valor: string | undefined): valor is SortBy {
  return valor !== undefined && ORDENACOES_VALIDAS.includes(valor as SortBy)
}

export default async function ExplorarPage({ searchParams }: Props) {
  const params = await searchParams

  // Ruling T12-a: os ids de serviço vêm do parser compartilhado, não de uma
  // cópia local. Ele entende o sentinela `todos` ("ver tudo, sem filtrar")
  // e descarta valores inválidos (fracionários, zero, negativos, duplicados)
  // — reimplementar essa lógica aqui era exatamente o bug que a Task 11
  // corrigiu ao extrair este módulo.
  const providerIds = idsDeServicos(params.servicos)

  const sortBy = ehSortBy(params.ordenar) ? params.ordenar : 'popularity'
  const pagina = numero(params.pagina) ?? 1

  const [generos, resultado] = await Promise.all([
    getGenres(),
    discoverMovies({
      providerIds,
      genreId: numero(params.genero),
      decade: numero(params.decada),
      minRating: numero(params.nota),
      sortBy,
      page: pagina,
    }),
  ])

  function urlDaPagina(destino: number): string {
    const proximos = new URLSearchParams()
    for (const [chave, valor] of Object.entries(params)) {
      if (valor) proximos.set(chave, valor)
    }
    proximos.set('pagina', String(destino))
    return `/explorar?${proximos.toString()}`
  }

  return (
    <div className="mx-auto max-w-6xl py-4">
      <h1 className="px-4 text-2xl font-semibold text-neutral-100">Explorar</h1>

      <FilterBar genres={generos} />

      {resultado.items.length === 0 ? (
        <EmptyState
          title="Nenhum filme com esses filtros"
          // Nomeia filtros concretos para afrouxar em vez de só relatar que
          // a lista está vazia: com poucos serviços assinados e um filtro
          // estreito, essa combinação é comum e não é um erro.
          hint="Tente afrouxar a nota mínima, ampliar a década ou marcar mais serviços de streaming."
        />
      ) : (
        <>
          {/* role="status" anuncia a contagem para leitores de tela sem
              precisar de foco — trocar um filtro muda o resultado sem
              recarregar a página. */}
          <p className="px-4 pb-2 text-sm text-neutral-400" role="status">
            {resultado.totalResults.toLocaleString('pt-BR')} filmes encontrados
          </p>

          <MovieGrid movies={resultado.items} servicos={params.servicos} />

          {/* Links reais em vez de scroll infinito: alcançáveis por
              teclado, funcionam com o botão voltar e não prendem o rodapé
              atrás de uma rolagem sem fim. */}
          <nav aria-label="Paginação" className="flex justify-center gap-4 px-4 py-8">
            {pagina > 1 && (
              <Link
                href={urlDaPagina(pagina - 1)}
                // §12.3 — minimo 3:1 para borda de elemento de interface:
                // neutral-700 media ~1.9:1 contra o fundo da pagina; trocado
                // por neutral-500 (4.18:1). Hover sobe para neutral-400
                // (7.63:1) para continuar mais claro que o estado normal.
                className="rounded-lg border border-neutral-500 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Página anterior
              </Link>
            )}
            {pagina < resultado.totalPages && (
              <Link
                href={urlDaPagina(pagina + 1)}
                // §12.3 — minimo 3:1 para borda de elemento de interface:
                // neutral-700 media ~1.9:1 contra o fundo da pagina; trocado
                // por neutral-500 (4.18:1). Hover sobe para neutral-400
                // (7.63:1) para continuar mais claro que o estado normal.
                className="rounded-lg border border-neutral-500 px-4 py-2 text-sm text-neutral-200 transition hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Próxima página
              </Link>
            )}
          </nav>
        </>
      )}
    </div>
  )
}
