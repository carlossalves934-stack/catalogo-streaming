import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jaDecidiu, registrarDecisao } from '@/lib/importacao'
import { writePreferences } from '@/lib/storage'
import { ComContexto, contextoDeTeste } from '@/test/contexto-watchlist'
import { ImportarLista } from './importar-lista'

const mocks = vi.hoisted(() => ({ importarLista: vi.fn() }))
vi.mock('@/lib/watchlist/actions', () => ({ importarLista: mocks.importarLista }))

function salvarNoNavegador(watchlist: number[]) {
  writePreferences({ providerIds: [8], watchlist, hasOnboarded: true })
}

function renderizar(recarregar = vi.fn()) {
  const resultado = render(
    <ComContexto valor={contextoDeTeste({ recarregar })}>
      <ImportarLista usuarioId="usuario-1" />
    </ComContexto>,
  )
  return { ...resultado, recarregar }
}

beforeEach(() => {
  mocks.importarLista.mockReset()
})

afterEach(() => {
  window.localStorage.clear()
})

describe('ImportarLista', () => {
  it('sem nada salvo no navegador, não aparece', () => {
    const { container } = renderizar()

    expect(container).toBeEmptyDOMElement()
  })

  it('com filmes salvos, pergunta se quer trazer', async () => {
    salvarNoNavegador([550, 13])
    renderizar()

    expect(await screen.findByText('2 filmes salvos neste navegador.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trazer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument()
  })

  it('usa o singular com um filme só', async () => {
    salvarNoNavegador([550])
    renderizar()

    expect(await screen.findByText('1 filme salvo neste navegador.')).toBeInTheDocument()
  })

  it('quem já decidiu não é perguntado de novo', () => {
    salvarNoNavegador([550])
    registrarDecisao('usuario-1')
    const { container } = renderizar()

    expect(container).toBeEmptyDOMElement()
  })

  it('Trazer: importa, relê a lista, some e mantém a lista local', async () => {
    mocks.importarLista.mockResolvedValue({ ok: true })
    salvarNoNavegador([550, 13])
    const { recarregar } = renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Trazer' }))

    expect(mocks.importarLista).toHaveBeenCalledWith([550, 13])
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Trazer' })).not.toBeInTheDocument())
    expect(recarregar).toHaveBeenCalled()
    expect(jaDecidiu('usuario-1')).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('streaming-catalog:v1') ?? '{}').watchlist).toEqual([
      550, 13,
    ])
  })

  it('Trazer que falha: avisa, continua perguntando e não registra decisão', async () => {
    mocks.importarLista.mockResolvedValue({ ok: false, motivo: 'erro' })
    salvarNoNavegador([550])
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Trazer' }))

    expect(await screen.findByText('Não foi possível trazer agora. Tente de novo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trazer' })).toBeEnabled()
    expect(jaDecidiu('usuario-1')).toBe(false)
  })

  it('Descartar: some sem importar e sem apagar a lista local', async () => {
    salvarNoNavegador([550])
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Descartar' }))

    expect(screen.queryByRole('button', { name: 'Trazer' })).not.toBeInTheDocument()
    expect(mocks.importarLista).not.toHaveBeenCalled()
    expect(jaDecidiu('usuario-1')).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('streaming-catalog:v1') ?? '{}').watchlist).toEqual([
      550,
    ])
  })

  it('ignora lixo no localStorage', async () => {
    window.localStorage.setItem(
      'streaming-catalog:v1',
      JSON.stringify({ providerIds: [], watchlist: [550, -1, 550, 1.5], hasOnboarded: true }),
    )
    mocks.importarLista.mockResolvedValue({ ok: true })
    renderizar()

    expect(await screen.findByText('1 filme salvo neste navegador.')).toBeInTheDocument()
  })

  it('não tem violações de acessibilidade', async () => {
    salvarNoNavegador([550, 13])
    const { container } = renderizar()
    await screen.findByText('2 filmes salvos neste navegador.')

    expect(await axe(container)).toHaveNoViolations()
  })
})
