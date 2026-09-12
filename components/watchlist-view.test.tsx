import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('remove o ultimo filme da tela ao desmarcar a estrela, sem precisar recarregar', async () => {
    // Achado ainda aberto da revisão da Task 14: a lista tinha exatamente
    // [42]; a pub/sub agora propaga a escrita corretamente e `ids` vira
    // '' — mas o efeito de busca fazia early-return nesse caso e nunca
    // limpava `filmes`, deixando o filme removido preso na tela. Este
    // teste é uma transição ao vivo (monta com [42], espera o card
    // aparecer, remove pela própria estrela do card, sem remontar) — um
    // teste que já monta com a lista vazia não prova nada sobre este bug.
    writePreferences({ providerIds: [], watchlist: [42], hasOnboarded: true })
    server.use(http.get('*/api/filmes', () => HttpResponse.json({ movies: [filme(42)] })))
    const usuario = userEvent.setup()

    render(<WatchlistView />)

    // Esperar não só o card aparecer, mas o próprio botão-estrela hidratar:
    // ele tem sua própria instância de usePreferences() (WatchlistButton),
    // separada da de WatchlistView, e só sabe que 42 está salvo (e só fica
    // clicável) depois que essa segunda instância também hidrata.
    const botaoEstrela = await screen.findByRole('button', {
      name: /remover filme 42 da minha lista/i,
    })
    await waitFor(() => expect(botaoEstrela).toBeEnabled())

    await usuario.click(botaoEstrela)

    await waitFor(() => {
      expect(screen.getByText('Sua lista está vazia')).toBeInTheDocument()
    })
    expect(screen.queryByText('Filme 42')).not.toBeInTheDocument()
  })
})
