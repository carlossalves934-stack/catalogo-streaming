import { Suspense } from 'react'
import { MovieRail } from '@/components/movie-rail'
import { MovieRailSkeleton } from '@/components/skeletons'
import { ProviderGate } from '@/components/provider-gate'
import { railDefinitions, type RailDefinition } from '@/lib/rails'
import { discoverMovies } from '@/lib/tmdb/discover'
import { getProviders } from '@/lib/tmdb/providers'

type Props = {
  searchParams: Promise<{ servicos?: string }>
}

function idsDeServicos(bruto: string | undefined): number[] {
  if (!bruto) return []
  return bruto
    .split(',')
    .map(Number)
    .filter((n) => Number.isFinite(n))
}

async function Trilho({
  definicao,
  providerIds,
}: {
  definicao: RailDefinition
  providerIds: number[]
}) {
  // A busca ao TMDB fica isolada do JSX: o lint (react-hooks/error-boundaries)
  // não permite construir JSX dentro do try, já que React não renderiza a
  // JSX de imediato — o try/catch aqui protege apenas a chamada assíncrona
  // que de fato pode lançar. Cada trilho tem seu próprio try/catch: a falha
  // de uma consulta ao TMDB não pode derrubar os outros quatro trilhos.
  let pagina: Awaited<ReturnType<typeof discoverMovies>>

  try {
    pagina = await discoverMovies({
      ...definicao.filters,
      providerIds,
      page: 1,
    })
  } catch {
    return (
      <section aria-label={definicao.title} className="px-4 py-4">
        <h2 className="text-lg font-semibold text-neutral-100">{definicao.title}</h2>
        <p className="mt-2 text-sm text-neutral-400">
          Não foi possível carregar esta seção agora. Recarregue a página para tentar de novo.
        </p>
      </section>
    )
  }

  return <MovieRail title={definicao.title} movies={pagina.items} href={definicao.href} />
}

export default async function HomePage({ searchParams }: Props) {
  const { servicos } = await searchParams
  const providerIds = idsDeServicos(servicos)
  const definicoes = railDefinitions(new Date())

  if (providerIds.length === 0) {
    const provedores = await getProviders()
    return <ProviderGate providers={provedores} />
  }

  return (
    <div className="mx-auto max-w-6xl py-4">
      <h1 className="px-4 text-2xl font-semibold text-neutral-100">O que assistir hoje</h1>

      {definicoes.map((definicao) => (
        <Suspense key={definicao.id} fallback={<MovieRailSkeleton />}>
          <Trilho definicao={definicao} providerIds={providerIds} />
        </Suspense>
      ))}
    </div>
  )
}
