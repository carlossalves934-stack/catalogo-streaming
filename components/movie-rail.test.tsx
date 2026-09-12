import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/tmdb/types'
import { MovieRail } from './movie-rail'

function filme(id: number, title: string): Movie {
  return {
    id,
    title,
    originalTitle: title,
    overview: '',
    posterUrl: null,
    backdropUrl: null,
    releaseYear: 2024,
    rating: 7,
    voteCount: 100,
    genreIds: [],
  }
}

const filmes = [filme(1, 'Um'), filme(2, 'Dois'), filme(3, 'Tres')]

describe('MovieRail', () => {
  it('mostra o titulo do trilho como cabecalho', () => {
    render(<MovieRail title="Em alta" movies={filmes} />)

    expect(screen.getByRole('heading', { name: 'Em alta' })).toBeInTheDocument()
  })

  it('renderiza um card por filme dentro de uma lista', () => {
    render(<MovieRail title="Em alta" movies={filmes} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('rotula a regiao rolavel para leitores de tela', () => {
    render(<MovieRail title="Em alta" movies={filmes} />)

    expect(screen.getByRole('region', { name: 'Em alta' })).toBeInTheDocument()
  })

  it('mostra link de ver mais quando href e informado', () => {
    render(<MovieRail title="Em alta" movies={filmes} href="/explorar?sort=popularity" />)

    expect(screen.getByRole('link', { name: /ver mais/i })).toHaveAttribute(
      'href',
      '/explorar?sort=popularity',
    )
  })

  it('nao renderiza nada quando a lista esta vazia', () => {
    const { container } = render(<MovieRail title="Em alta" movies={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<MovieRail title="Em alta" movies={filmes} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
