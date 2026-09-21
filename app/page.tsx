import { Suspense } from 'react'
import { HeroDestaque } from '@/components/hero-destaque'
import { MovieRail } from '@/components/movie-rail'
import { MovieRailSkeleton } from '@/components/skeletons'
import { ProviderGate } from '@/components/provider-gate'
import { railDefinitions, type RailDefinition } from '@/lib/rails'
import { idsDeServicos } from '@/lib/servicos'
import { discoverMovies } from '@/lib/tmdb/discover'
import { getGenres } from '@/lib/tmdb/genres'
import { getMovieProviders } from '@/lib/tmdb/movies'
import { getProviders } from '@/lib/tmdb/providers'
import type { Genre, Movie, WatchOptions } from '@/lib/tmdb/types'

type Props = {
  searchParams: Promise<{ servicos?: string }>
}

async function Trilho({
  definicao,
  providerIds,
  servicos,
}: {
  definicao: RailDefinition
  providerIds: number[]
  servicos: string
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
      <section aria-label={definicao.title} className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <h2 className="titulo text-xl font-semibold text-texto sm:text-2xl">{definicao.title}</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-nevoa">
          Não foi possível carregar esta seção agora. Recarregue a página para tentar de novo.
        </p>
      </section>
    )
  }

  return (
    <MovieRail title={definicao.title} movies={pagina.items} href={definicao.href} servicos={servicos} />
  )
}

type Destaque = {
  filme: Movie
  /** O resto da consulta, que vira o primeiro trilho sem repetir o destaque. */
  restantes: Movie[]
  disponibilidade?: WatchOptions
  generos: Genre[]
}

/**
 * Carrega o filme do topo da página.
 *
 * É a única busca que a Home espera antes de responder: o destaque ocupa a
 * primeira tela inteira e é a maior imagem da página, então renderizá-lo no
 * servidor vale o atraso. Os outros quatro trilhos continuam em streaming.
 *
 * Devolve null quando não dá para montar um destaque honesto — consulta com
 * erro, catálogo sem resultado ou filme sem imagem de fundo. Nesses casos a
 * Home começa direto nos trilhos, que é o que ela fazia antes.
 */
async function carregarDestaque(
  definicao: RailDefinition,
  providerIds: number[],
): Promise<Destaque | null> {
  let itens: Movie[]

  try {
    const pagina = await discoverMovies({ ...definicao.filters, providerIds, page: 1 })
    itens = pagina.items
  } catch {
    return null
  }

  const [filme, ...restantes] = itens
  if (!filme?.backdropUrl) return null

  // Gêneros e disponibilidade são enfeites do destaque: se falharem, o
  // destaque ainda funciona sem eles. Por isso não derrubam a página.
  const [disponibilidade, generos] = await Promise.all([
    getMovieProviders(filme.id).catch(() => undefined),
    getGenres().catch((): Genre[] => []),
  ])

  return { filme, restantes, disponibilidade, generos }
}

export default async function HomePage({ searchParams }: Props) {
  const { servicos } = await searchParams
  const definicoes = railDefinitions(new Date())

  // O gate é a AUSÊNCIA do parâmetro, não a lista de ids vinda dele: quem
  // escolhe "Ver tudo, sem filtrar" também acaba com lista vazia, e gatear
  // no tamanho da lista prenderia essa pessoa no onboarding para sempre.
  // A URL com `servicos` presente (mesmo que aponte para "todos") é o sinal
  // de que a escolha já foi feita.
  if (servicos === undefined) {
    const provedores = await getProviders()
    return <ProviderGate providers={provedores} />
  }

  const providerIds = idsDeServicos(servicos)
  const [principal, ...demais] = definicoes
  const destaque = await carregarDestaque(principal, providerIds)

  return (
    <div className="pb-8">
      {/*
        O h1 existe para leitores de tela e para a ordem de headings: na
        tela, quem cumpre esse papel é o título do filme em destaque, e
        repetir "O que assistir hoje" acima dele seria uma etiqueta vazia.
      */}
      <h1 className="sr-only">O que assistir hoje</h1>

      {destaque ? (
        <>
          {/* -mt-16 anula o pt-16 do <main>: o destaque nasce atrás do menu. */}
          <div className="-mt-16">
            <HeroDestaque
              movie={destaque.filme}
              disponibilidade={destaque.disponibilidade}
              generos={destaque.generos}
              servicos={servicos}
            />
          </div>

          <MovieRail
            title={principal.title}
            movies={destaque.restantes}
            href={principal.href}
            servicos={servicos}
          />
        </>
      ) : (
        <Suspense fallback={<MovieRailSkeleton />}>
          <Trilho definicao={principal} providerIds={providerIds} servicos={servicos} />
        </Suspense>
      )}

      {demais.map((definicao) => (
        <Suspense key={definicao.id} fallback={<MovieRailSkeleton />}>
          <Trilho definicao={definicao} providerIds={providerIds} servicos={servicos} />
        </Suspense>
      ))}
    </div>
  )
}
