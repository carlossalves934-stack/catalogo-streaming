import { render, screen, within } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { Movie, WatchOptions } from '@/lib/tmdb/types'
import { MovieGrid } from './movie-grid'

function criarFilme(sobrescrever: Partial<Movie>): Movie {
  return {
    id: 1,
    title: 'Filme sem título',
    originalTitle: 'Untitled',
    overview: '',
    posterUrl: 'https://image.tmdb.org/t/p/w342/poster.jpg',
    backdropUrl: null,
    releaseYear: 2020,
    rating: 7.5,
    voteCount: 100,
    genreIds: [],
    ...sobrescrever,
  }
}

const opcoesComProvedor: WatchOptions = {
  flatrate: [{ id: 8, name: 'Netflix', logoUrl: null, displayPriority: 0 }],
  rent: [],
  buy: [],
  tmdbLink: null,
}

describe('MovieGrid', () => {
  it('renderiza um card por filme', () => {
    const filmes = [
      criarFilme({ id: 1, title: 'Matrix' }),
      criarFilme({ id: 2, title: 'Inception' }),
      criarFilme({ id: 3, title: 'Interestelar' }),
    ]

    render(<MovieGrid movies={filmes} />)

    // Cada MovieCard é um <article>; usar essa role em vez de "listitem"
    // porque os badges de disponibilidade também são renderizados como uma
    // lista (<ul><li>...), o que faria "listitem" contar itens aninhados.
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByText('Matrix')).toBeInTheDocument()
    expect(screen.getByText('Inception')).toBeInTheDocument()
    expect(screen.getByText('Interestelar')).toBeInTheDocument()
  })

  it('mostra o badge de disponibilidade apenas no filme com entrada correspondente', () => {
    const filmes = [
      criarFilme({ id: 1, title: 'Com provedor' }),
      criarFilme({ id: 2, title: 'Sem provedor' }),
    ]

    render(<MovieGrid movies={filmes} availability={{ 1: opcoesComProvedor }} />)

    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(2)

    const [cardComProvedor, cardSemProvedor] = cards
    expect(
      within(cardComProvedor).getByTestId('badges-disponibilidade'),
    ).toBeInTheDocument()
    expect(
      within(cardSemProvedor).queryByTestId('badges-disponibilidade'),
    ).not.toBeInTheDocument()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const filmes = [criarFilme({ id: 1, title: 'Matrix' }), criarFilme({ id: 2, title: 'Inception' })]

    const { container } = render(
      <MovieGrid movies={filmes} availability={{ 1: opcoesComProvedor }} />,
    )

    expect(await axe(container)).toHaveNoViolations()
  })
})
