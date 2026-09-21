import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HeroDestaque } from './hero-destaque'
import type { Genre, Movie, WatchOptions } from '@/lib/tmdb/types'

function filme(sobrescrever: Partial<Movie> = {}): Movie {
  return {
    id: 1,
    title: 'Duna',
    originalTitle: 'Dune',
    overview: 'Paul Atreides chega a Arrakis.',
    posterUrl: 'https://image.tmdb.org/t/p/w342/poster.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w780/bg.jpg',
    releaseYear: 2021,
    rating: 8.1,
    voteCount: 500,
    genreIds: [878],
    ...sobrescrever,
  }
}

const generos: Genre[] = [
  { id: 878, name: 'Ficção científica' },
  { id: 27, name: 'Terror' },
]

const disponibilidade: WatchOptions = {
  flatrate: [{ id: 8, name: 'Netflix', logoUrl: null, displayPriority: 1 }],
  rent: [],
  buy: [],
  tmdbLink: null,
}

describe('HeroDestaque', () => {
  it('mostra titulo, ano, genero e nota do filme', () => {
    render(<HeroDestaque movie={filme()} generos={generos} />)

    expect(screen.getByRole('heading', { name: 'Duna' })).toBeInTheDocument()
    expect(screen.getByText('2021')).toBeInTheDocument()
    expect(screen.getByText('Ficção científica')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Nota 8.1 de 10' })).toBeInTheDocument()
  })

  it('pede o backdrop grande para a foto principal', () => {
    render(<HeroDestaque movie={filme()} generos={generos} />)

    // next/image reescreve o src, mas o caminho original vai no query.
    const foto = screen.getByRole('presentation', { hidden: true })
    expect(decodeURIComponent(foto.getAttribute('src') ?? '')).toContain('/w1280/bg.jpg')
  })

  it('nao renderiza nada quando o filme nao tem imagem de fundo', () => {
    const { container } = render(
      <HeroDestaque movie={filme({ backdropUrl: null })} generos={generos} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('lista onde o filme esta disponivel quando a consulta respondeu', () => {
    render(
      <HeroDestaque movie={filme()} generos={generos} disponibilidade={disponibilidade} />,
    )

    expect(screen.getByText('Disponível agora em')).toBeInTheDocument()
    expect(screen.getByText('Netflix')).toBeInTheDocument()
  })

  it('omite a disponibilidade quando a consulta ao TMDB falhou', () => {
    render(<HeroDestaque movie={filme()} generos={generos} />)

    expect(screen.queryByText('Disponível agora em')).not.toBeInTheDocument()
  })

  it('leva o filtro de servicos para a pagina do filme', () => {
    render(<HeroDestaque movie={filme()} generos={generos} servicos="8,119" />)

    expect(screen.getByRole('link', { name: 'Onde assistir' })).toHaveAttribute(
      'href',
      '/filme/1?servicos=8%2C119',
    )
  })
})
