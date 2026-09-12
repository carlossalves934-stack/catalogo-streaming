import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/tmdb/types'
import { MovieCard } from './movie-card'

const filme: Movie = {
  id: 693134,
  title: 'Duna: Parte 2',
  originalTitle: 'Dune: Part Two',
  overview: 'Paul Atreides se une aos Fremen.',
  posterUrl: 'https://image.tmdb.org/t/p/w342/poster.jpg',
  backdropUrl: null,
  releaseYear: 2024,
  rating: 8.2,
  voteCount: 4521,
  genreIds: [878],
}

describe('MovieCard', () => {
  it('mostra titulo, ano e nota', () => {
    render(<MovieCard movie={filme} />)

    expect(screen.getByText('Duna: Parte 2')).toBeInTheDocument()
    expect(screen.getByText('2024')).toBeInTheDocument()
    // Ruling F5: a nota é renderizada como "★ 8.2" em um único nó de texto,
    // então uma busca por string exata não encontra nada — usar regex.
    expect(screen.getByText(/8\.2/)).toBeInTheDocument()
  })

  it('da ao poster um texto alternativo descritivo', () => {
    render(<MovieCard movie={filme} />)

    expect(screen.getByAltText('Pôster de Duna: Parte 2')).toBeInTheDocument()
  })

  it('mostra um substituto quando nao ha poster', () => {
    render(<MovieCard movie={{ ...filme, posterUrl: null }} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('poster-ausente')).toHaveTextContent('Duna: Parte 2')
  })

  it('omite a nota quando o filme nao tem votos', () => {
    render(<MovieCard movie={{ ...filme, rating: null }} />)

    expect(screen.queryByLabelText(/nota/i)).not.toBeInTheDocument()
  })

  it('leva para a pagina do filme', () => {
    render(<MovieCard movie={filme} />)

    expect(screen.getByRole('link', { name: /Duna: Parte 2/ })).toHaveAttribute(
      'href',
      '/filme/693134',
    )
  })

  it('inclui o parametro servicos no link quando informado', () => {
    // Ruling T13-a(b): o link do filme precisa carregar o filtro de
    // catálogo em uso, para que a página de detalhe filtre os similares
    // pelo mesmo recorte — sem este teste, o encodeURIComponent daquela
    // regra fica sem cobertura.
    render(<MovieCard movie={filme} servicos="8,119" />)

    expect(screen.getByRole('link', { name: /Duna: Parte 2/ })).toHaveAttribute(
      'href',
      '/filme/693134?servicos=8%2C119',
    )
  })

  it('mostra badges apenas quando a disponibilidade e informada', () => {
    const { rerender } = render(<MovieCard movie={filme} />)
    expect(screen.queryByTestId('badges-disponibilidade')).not.toBeInTheDocument()

    rerender(
      <MovieCard
        movie={filme}
        availability={{
          flatrate: [{ id: 8, name: 'Netflix', logoUrl: '/n.jpg', displayPriority: 1 }],
          rent: [],
          buy: [],
          tmdbLink: null,
        }}
      />,
    )

    expect(screen.getByAltText('Netflix')).toBeInTheDocument()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<MovieCard movie={filme} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
