import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { Movie } from '@/lib/tmdb/types'
import { MinhaListaConteudo } from './minha-lista-conteudo'

function filme(id: number, title: string): Movie {
  return {
    id,
    title,
    originalTitle: title,
    overview: '',
    // Poster real (não null): sem pôster, MovieCard também renderiza o
    // título no substituto textual do pôster, e getByText(title) encontraria
    // dois nós — mesmo ajuste já usado em movie-grid.test.tsx e
    // movie-card.test.tsx.
    posterUrl: 'https://image.tmdb.org/t/p/w342/poster.jpg',
    backdropUrl: null,
    releaseYear: 2021,
    rating: 8,
    voteCount: 100,
    genreIds: [],
  }
}

describe('MinhaListaConteudo', () => {
  it('lista vazia: convida a salvar', async () => {
    const { container } = render(<MinhaListaConteudo totalSalvo={0} filmes={[]} erro={false} />)

    expect(screen.getByText('Sua lista está vazia')).toBeInTheDocument()
    expect(
      screen.getByText('Toque na estrela de qualquer filme para guardá-lo aqui e assistir depois.'),
    ).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('salvou, mas nenhum filme carregou: mensagem diferente da lista vazia', () => {
    render(<MinhaListaConteudo totalSalvo={2} filmes={[]} erro={false} />)

    expect(screen.getByText('Não foi possível carregar sua lista')).toBeInTheDocument()
  })

  it('falha ao ler o banco: mensagem de falha, não de lista vazia', () => {
    render(<MinhaListaConteudo totalSalvo={0} filmes={[]} erro={true} />)

    expect(screen.getByText('Não foi possível carregar sua lista')).toBeInTheDocument()
    expect(screen.queryByText('Sua lista está vazia')).not.toBeInTheDocument()
  })

  it('com filmes: mostra a grade', () => {
    render(
      <MinhaListaConteudo
        totalSalvo={2}
        filmes={[filme(550, 'Clube da Luta'), filme(13, 'Forrest Gump')]}
        erro={false}
      />,
    )

    expect(screen.getByText('Clube da Luta')).toBeInTheDocument()
    expect(screen.getByText('Forrest Gump')).toBeInTheDocument()
  })
})
