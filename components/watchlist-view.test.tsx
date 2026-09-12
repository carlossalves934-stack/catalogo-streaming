import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { writePreferences } from '@/lib/storage'
import type { Movie } from '@/lib/tmdb/types'
import { WatchlistView } from './watchlist-view'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  window.localStorage.clear()
})
afterAll(() => server.close())

function filme(id: number): Movie {
  return {
    id,
    title: `Filme ${id}`,
    originalTitle: `Movie ${id}`,
    overview: '',
    posterUrl: 'https://image.tmdb.org/t/p/w342/poster.jpg',
    backdropUrl: null,
    releaseYear: 2020,
    rating: 7,
    voteCount: 10,
    genreIds: [],
  }
}

describe('WatchlistView', () => {
  it('mostra estado vazio quando a watchlist nunca teve nada salvo', async () => {
    render(<WatchlistView />)

    // Sem ids salvos não há requisição a /api/filmes: a tela resolve isso
    // localmente, sem esperar um "carregando" que nunca terminaria.
    await waitFor(() => {
      expect(screen.getByText('Sua lista está vazia')).toBeInTheDocument()
    })
  })

  it('mostra os filmes salvos quando a busca resolve', async () => {
    writePreferences({ providerIds: [], watchlist: [1, 2], hasOnboarded: true })
    server.use(
      http.get('*/api/filmes', () => HttpResponse.json({ movies: [filme(1), filme(2)] })),
    )

    render(<WatchlistView />)

    await waitFor(() => {
      expect(screen.getByText('Filme 1')).toBeInTheDocument()
    })
    expect(screen.getByText('Filme 2')).toBeInTheDocument()
  })

  it('distingue lista vazia de ids salvos que o TMDB nao resolveu mais', async () => {
    // Finding (Minor) da revisão da Task 14: se todo id salvo 404 no TMDB,
    // a tela não pode dizer "sua lista está vazia" — a pessoa salvou algo,
    // só não está mais disponível para carregar agora.
    writePreferences({ providerIds: [], watchlist: [999], hasOnboarded: true })
    server.use(http.get('*/api/filmes', () => HttpResponse.json({ movies: [] })))

    render(<WatchlistView />)

    await waitFor(() => {
      expect(screen.getByText('Não foi possível carregar sua lista')).toBeInTheDocument()
    })
    expect(screen.queryByText('Sua lista está vazia')).not.toBeInTheDocument()
  })
})
