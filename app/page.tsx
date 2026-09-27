import Link from 'next/link'
import { Suspense } from 'react'
import { EmptyState } from '@/components/empty-state'
import { FilterBar } from '@/components/filter-bar'
import { HeroDestaque } from '@/components/hero-destaque'
import { MovieGrid } from '@/components/movie-grid'
import { MovieRail } from '@/components/movie-rail'
import { MovieRailSkeleton } from '@/components/skeletons'
import { ProviderGate } from '@/components/provider-gate'
import { anosDisponiveis, decadasDisponiveis, lerFiltros, temFiltroDeGrade } from '@/lib/filtros'
import { comNotaMinima, railDefinitions, type RailDefinition } from '@/lib/rails'
import { idsDeServicos } from '@/lib/servicos'
import { discoverMovies } from '@/lib/tmdb/discover'
import { getGenres } from '@/lib/tmdb/genres'
import { getMovieProviders } from '@/lib/tmdb/movies'
import { getProviders } from '@/lib/tmdb/providers'
import type { Genre, Movie, WatchOptions } from '@/lib/tmdb/types'

type Props = {
  searchParams: Promise<{
    servicos?: string
    genero?: string
    decada?: string
    ano?: string
    nota?: string
    ordenar?: string
    pagina?: string
  }>
}

const CLASSE_LINK_PAGINA =
  'rounded-lg border border-contorno px-4 py-2 text-sm text-texto transition hover:border-nevoa focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna'

function numero(valor: string | undefined): number | undefined {
  if (valor === undefined) return undefined
  const n = Number(valor)
  return Number.isFinite(n) ? n : undefined
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
  disponibilidade?: WatchOptions
  generos: Genre[]
}

/**
 * Monta o filme do topo da página a partir do primeiro resultado que a tela
 * já carregou — o primeiro trilho, no modo trilhos; a primeira posição da
 * consulta filtrada, no modo grade.
 *
 * Devolve null quando não dá para montar um destaque honesto: sem filme, ou
 * sem imagem de fundo. Nesses casos a página começa direto no conteúdo, que
 * é o que ela fazia antes do destaque existir. Com um filtro estreito,
 * "sem resultado" deixa de ser raro — é o mesmo caminho, e a página degrada
 * sozinha.
 */
async function montarDestaque(
  filme: Movie | undefined,
  generos: Genre[],
): Promise<Destaque | null> {
  if (!filme?.backdropUrl) return null

  // A disponibilidade é enfeite do destaque: se falhar, o destaque ainda
  // funciona sem ela. Por isso não derruba a página.
  const disponibilidade = await getMovieProviders(filme.id).catch(() => undefined)

  return { filme, disponibilidade, generos }
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams
  const { servicos } = params

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
  const hoje = new Date()
  const filtros = lerFiltros(params, hoje)

  // Os gêneros alimentam a barra de filtros e o destaque. Se a consulta
  // falhar, a barra abre sem a lista de gêneros — melhor do que derrubar a
  // Home inteira por causa de um seletor.
  const generos = await getGenres().catch((): Genre[] => [])

  function moldura(destaque: Destaque | null, conteudo: React.ReactNode) {
    return (
      <div className="pb-8">
        {/*
          O h1 existe para leitores de tela e para a ordem de headings: na
          tela, quem cumpre esse papel é o título do filme em destaque, e
          repetir "O que assistir hoje" acima dele seria uma etiqueta vazia.
        */}
        <h1 className="sr-only">O que assistir hoje</h1>

        {destaque && (
          // -mt-16 anula o pt-16 do <main>: o destaque nasce atrás do menu.
          <div className="-mt-16">
            <HeroDestaque
              movie={destaque.filme}
              disponibilidade={destaque.disponibilidade}
              generos={destaque.generos}
              servicos={servicos}
            />
          </div>
        )}

        <div className="mx-auto max-w-7xl">
          <FilterBar
            genres={generos}
            anos={anosDisponiveis(hoje)}
            decadas={decadasDisponiveis(hoje)}
          />
        </div>

        {conteudo}
      </div>
    )
  }

  // Modo grade: gênero, ano ou ordenação ativos.
  //
  // Esses filtros CONTRADIZEM os títulos curados — com gênero Comédia o
  // trilho "Terror para hoje" mostraria comédias, e com "Piores notas" o
  // trilho "Muito bem avaliados" abriria pelos piores. Os trilhos então dão
  // lugar a uma lista de resultados, e os títulos só voltam quando são
  // verdade. A nota não entra nessa conta: ela compõe com a curadoria em vez
  // de contradizê-la. Ver `temFiltroDeGrade`.
  if (temFiltroDeGrade(filtros)) {
    const pagina = numero(params.pagina) ?? 1
    const resultado = await discoverMovies({ ...filtros, providerIds, page: pagina })
    const destaque = await montarDestaque(resultado.items[0], generos)

    // O destaque já mostra o primeiro filme inteiro; repeti-lo como card
    // logo abaixo seria a mesma capa duas vezes na mesma tela.
    const naGrade = destaque ? resultado.items.slice(1) : resultado.items

    const urlDaPagina = (destino: number): string => {
      const proximos = new URLSearchParams()
      for (const [chave, valor] of Object.entries(params)) {
        if (valor) proximos.set(chave, valor)
      }
      proximos.set('pagina', String(destino))
      return `/?${proximos.toString()}`
    }

    if (resultado.items.length === 0) {
      return moldura(
        null,
        <EmptyState
          title="Nenhum filme com esses filtros"
          // Nomeia filtros concretos para afrouxar em vez de só relatar que
          // a lista está vazia: com poucos serviços assinados e um filtro
          // estreito, essa combinação é comum e não é um erro.
          hint="Tente afrouxar a nota mínima, trocar o ano ou marcar mais serviços de streaming."
        />,
      )
    }

    return moldura(
      destaque,
      <>
        {/* role="status" anuncia a contagem para leitores de tela sem
            precisar de foco — trocar um filtro muda o resultado sem
            recarregar a página. */}
        <p className="px-4 pb-2 text-sm text-nevoa sm:px-6" role="status">
          {resultado.totalResults.toLocaleString('pt-BR')} filmes encontrados
        </p>

        <MovieGrid movies={naGrade} servicos={servicos} />

        {/* Links reais em vez de scroll infinito: alcançáveis por teclado,
            funcionam com o botão voltar e não prendem o rodapé atrás de uma
            rolagem sem fim. */}
        <nav aria-label="Paginação" className="flex justify-center gap-4 px-4 py-8">
          {pagina > 1 && (
            <Link href={urlDaPagina(pagina - 1)} className={CLASSE_LINK_PAGINA}>
              Página anterior
            </Link>
          )}
          {pagina < resultado.totalPages && (
            <Link href={urlDaPagina(pagina + 1)} className={CLASSE_LINK_PAGINA}>
              Próxima página
            </Link>
          )}
        </nav>
      </>,
    )
  }

  // Modo trilhos: a Home curada. A nota, quando houver, entra em cada trilho
  // sem nunca afrouxar a curadoria dele — ver `comNotaMinima`.
  const definicoes = railDefinitions(hoje).map((definicao) =>
    comNotaMinima(definicao, filtros.minRating),
  )
  const [principal, ...demais] = definicoes

  // É a única busca que a Home espera antes de responder: o destaque ocupa a
  // primeira tela inteira e é a maior imagem da página, então renderizá-lo no
  // servidor vale o atraso. Os outros quatro trilhos seguem em streaming.
  let itensDoPrimeiro: Movie[] = []
  try {
    const primeira = await discoverMovies({ ...principal.filters, providerIds, page: 1 })
    itensDoPrimeiro = primeira.items
  } catch {
    itensDoPrimeiro = []
  }

  const destaque = await montarDestaque(itensDoPrimeiro[0], generos)

  return moldura(
    destaque,
    <>
      {destaque ? (
        <MovieRail
          title={principal.title}
          movies={itensDoPrimeiro.slice(1)}
          href={principal.href}
          servicos={servicos}
        />
      ) : (
        // Sem destaque a primeira consulta não serviu para nada visível, então
        // o trilho refaz a sua e entra em streaming como os outros quatro.
        <Suspense fallback={<MovieRailSkeleton />}>
          <Trilho definicao={principal} providerIds={providerIds} servicos={servicos} />
        </Suspense>
      )}

      {demais.map((definicao) => (
        <Suspense key={definicao.id} fallback={<MovieRailSkeleton />}>
          <Trilho definicao={definicao} providerIds={providerIds} servicos={servicos} />
        </Suspense>
      ))}
    </>,
  )
}
