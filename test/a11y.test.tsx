import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EmptyState } from '@/components/empty-state'
import { FilterBar } from '@/components/filter-bar'
import { HeroDestaque } from '@/components/hero-destaque'
import { MinhaListaConteudo } from '@/components/minha-lista-conteudo'
import { MovieCardSkeleton, MovieRailSkeleton } from '@/components/skeletons'
import { MovieGrid } from '@/components/movie-grid'
import { MovieRail } from '@/components/movie-rail'
import { MovieRating } from '@/components/movie-rating'
import { ProviderGate } from '@/components/provider-gate'
import { SearchForm } from '@/components/search-form'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { WatchProviderSection } from '@/components/watch-provider-section'
import { WatchlistButton } from '@/components/watchlist-button'
import type { Genre, Movie, Provider, WatchOptions } from '@/lib/tmdb/types'

// Mock único para todo o arquivo: cobre os hooks de next/navigation usados
// por FilterBar, SearchForm e ProviderGate (via ProviderPicker/useRouter).
// Nenhum teste aqui depende de navegação de fato acontecer, só de os
// componentes conseguirem renderizar sem lançar.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(''),
}))

afterEach(() => {
  window.localStorage.clear()
})

function filme(sobrescrever: Partial<Movie> = {}): Movie {
  return {
    id: 1,
    title: 'Duna',
    originalTitle: 'Dune',
    overview: 'Sinopse do filme.',
    posterUrl: null,
    backdropUrl: null,
    releaseYear: 2021,
    rating: 8.1,
    voteCount: 500,
    genreIds: [878],
    ...sobrescrever,
  }
}

const provedores: Provider[] = [
  { id: 8, name: 'Netflix', logoUrl: null, displayPriority: 1 },
  { id: 119, name: 'Amazon Prime Video', logoUrl: null, displayPriority: 2 },
]

const generos: Genre[] = [
  { id: 27, name: 'Terror' },
  { id: 35, name: 'Comédia' },
]

const opcoesCompletas: WatchOptions = {
  flatrate: [{ id: 8, name: 'Netflix', logoUrl: null, displayPriority: 1 }],
  rent: [{ id: 2, name: 'Apple TV', logoUrl: null, displayPriority: 1 }],
  buy: [{ id: 2, name: 'Apple TV', logoUrl: null, displayPriority: 1 }],
  tmdbLink: 'https://www.themoviedb.org/movie/1/watch',
}

/**
 * Layout real: toda página do app é renderizada dentro de RootLayout, que
 * envolve o conteúdo com SiteHeader e SiteFooter (ver app/layout.tsx). Os
 * testes de axe por componente, isolados, não enxergam esse envoltório —
 * por isso não pegam violações que só existem na composição (landmarks
 * duplicados, saltos na ordem de headings, ids repetidos entre
 * componentes). Este helper reproduz esse envoltório para cada cenário
 * de página abaixo.
 */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  )
}

describe('acessibilidade — componentes sem verificação própria', () => {
  it('cabeçalho do site', async () => {
    const { container } = render(<SiteHeader />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('rodapé do site', async () => {
    const { container } = render(<SiteFooter />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('estado vazio', async () => {
    const { container } = render(<EmptyState title="Nada aqui" hint="Tente outro filtro." />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('esqueleto de card de filme', async () => {
    const { container } = render(<MovieCardSkeleton />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('esqueleto de trilho de filmes', async () => {
    const { container } = render(<MovieRailSkeleton />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('botão de watchlist', async () => {
    const { container } = render(<WatchlistButton movieId={1} title="Duna" />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('bloco de onde assistir com preferências do usuário (WatchProviderSection)', async () => {
    const { container } = render(<WatchProviderSection options={opcoesCompletas} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('portão de seleção de serviços (ProviderGate) antes da hidratação decidir redirecionar', async () => {
    const { container } = render(<ProviderGate providers={provedores} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('minha lista vazia (MinhaListaConteudo)', async () => {
    const { container } = render(<MinhaListaConteudo totalSalvo={0} filmes={[]} erro={false} />)
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('acessibilidade — composições realistas de página', () => {
  it('layout + home com destaque e múltiplos trilhos (mesmo filme aparecendo em dois trilhos)', async () => {
    const emAlta = filme({ id: 1, title: 'Duna' })
    const bemAvaliados = [filme({ id: 1, title: 'Duna' }), filme({ id: 2, title: 'Oppenheimer' })]
    const destaque = filme({
      id: 3,
      title: 'Blade Runner 2049',
      backdropUrl: 'https://image.tmdb.org/t/p/w780/bg.jpg',
    })

    const { container } = render(
      <Layout>
        {/* Na Home o h1 é invisível: quem o substitui na tela é o destaque. */}
        <h1 className="sr-only">O que assistir hoje</h1>
        <HeroDestaque movie={destaque} generos={generos} disponibilidade={opcoesCompletas} />
        <MovieRail title="Em alta" movies={[emAlta]} href="/explorar" />
        <MovieRail title="Muito bem avaliados" movies={bemAvaliados} href="/explorar" />
      </Layout>,
    )

    expect(await axe(container)).toHaveNoViolations()
  })

  it('layout + página de detalhe (título, nota, onde assistir e similares)', async () => {
    const principal = filme({ id: 1, title: 'Duna' })
    const similar = filme({ id: 2, title: 'Duna: Parte 2' })

    const { container } = render(
      <Layout>
        <article className="mx-auto max-w-4xl px-4 py-8">
          <h1 className="text-2xl font-semibold text-neutral-100">{principal.title}</h1>
          <p className="mt-2 flex items-center gap-3 text-sm text-neutral-400">
            <span>{principal.releaseYear}</span>
            <MovieRating rating={principal.rating} />
          </p>
          <div className="mt-4">
            <WatchlistButton movieId={principal.id} title={principal.title} />
          </div>
          <WatchProviderSection options={opcoesCompletas} />
        </article>
        <MovieRail title="Você também pode gostar" movies={[similar]} />
      </Layout>,
    )

    expect(await axe(container)).toHaveNoViolations()
  })

  it('layout + explorar (filtros e grade de resultados)', async () => {
    const filmes = [filme({ id: 1, title: 'Duna' }), filme({ id: 2, title: 'Oppenheimer' })]

    const { container } = render(
      <Layout>
        <h1 className="px-4 text-2xl font-semibold text-neutral-100">Explorar</h1>
        <FilterBar genres={generos} anos={[2026, 2015, 1970]} decadas={[2020, 2000, 1970]} />
        <MovieGrid movies={filmes} servicos="8" />
      </Layout>,
    )

    expect(await axe(container)).toHaveNoViolations()
  })

  it('layout + busca (formulário e grade com badges de disponibilidade)', async () => {
    const filmes = [filme({ id: 1, title: 'Duna' })]

    const { container } = render(
      <Layout>
        <h1 className="px-4 text-2xl font-semibold text-neutral-100">Buscar</h1>
        <SearchForm />
        <MovieGrid movies={filmes} availability={{ 1: opcoesCompletas }} />
      </Layout>,
    )

    expect(await axe(container)).toHaveNoViolations()
  })

  it('layout + onboarding de serviços (ProviderGate)', async () => {
    const { container } = render(
      <Layout>
        <ProviderGate providers={provedores} redirectWhenConfigured={false} />
      </Layout>,
    )

    expect(await axe(container)).toHaveNoViolations()
  })

  it('layout + minha lista vazia', async () => {
    const { container } = render(
      <Layout>
        <h1 className="px-4 pb-4 text-2xl font-semibold text-neutral-100">Minha lista</h1>
        <MinhaListaConteudo totalSalvo={0} filmes={[]} erro={false} />
      </Layout>,
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
