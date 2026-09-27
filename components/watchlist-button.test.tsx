import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { WatchlistContexto } from '@/components/watchlist-provider'
import { ComContexto, contextoDeTeste } from '@/test/contexto-watchlist'
import { WatchlistButton } from './watchlist-button'

const mocks = vi.hoisted(() => ({ irParaEntrar: vi.fn() }))
vi.mock('@/lib/auth/navegacao', () => ({ irParaEntrar: mocks.irParaEntrar }))

function renderizar(valor: WatchlistContexto) {
  render(
    <ComContexto valor={valor}>
      <WatchlistButton movieId={550} title="Clube da Luta" />
    </ComContexto>,
  )
  return screen.getByRole('button')
}

describe('WatchlistButton', () => {
  it('fica desabilitado até saber da sessão e da lista', () => {
    const botao = renderizar(contextoDeTeste({ pronto: false }))

    expect(botao).toBeDisabled()
  })

  it('deslogado: leva ao login em vez de salvar', async () => {
    const valor = contextoDeTeste({ logado: false, email: null })
    const botao = renderizar(valor)

    await userEvent.click(botao)

    expect(mocks.irParaEntrar).toHaveBeenCalled()
    expect(valor.alternar).not.toHaveBeenCalled()
  })

  it('logado: alterna o filme na lista', async () => {
    const valor = contextoDeTeste()
    const botao = renderizar(valor)

    await userEvent.click(botao)

    expect(valor.alternar).toHaveBeenCalledWith(550)
  })

  it('mostra que o filme está salvo', () => {
    const botao = renderizar(contextoDeTeste({ ids: [550] }))

    expect(botao).toHaveAttribute('aria-pressed', 'true')
    expect(botao).toHaveAccessibleName('Remover Clube da Luta da minha lista')
  })

  it('mostra que o filme não está salvo', () => {
    const botao = renderizar(contextoDeTeste({ ids: [13] }))

    expect(botao).toHaveAttribute('aria-pressed', 'false')
    expect(botao).toHaveAccessibleName('Salvar Clube da Luta na minha lista')
  })
})
