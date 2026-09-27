import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WatchlistContexto } from '@/components/watchlist-provider'
import { ComContexto, contextoDeTeste } from '@/test/contexto-watchlist'
import { SiteHeader } from './site-header'

const mocks = vi.hoisted(() => ({
  caminho: '/filme/550',
  busca: '',
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.caminho,
  useSearchParams: () => new URLSearchParams(mocks.busca),
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

function renderizar(valor: WatchlistContexto) {
  render(
    <ComContexto valor={valor}>
      <SiteHeader />
    </ComContexto>,
  )
}

beforeEach(() => {
  mocks.caminho = '/filme/550'
  mocks.busca = ''
  mocks.push.mockReset()
  mocks.refresh.mockReset()
})

describe('SiteHeader — conta', () => {
  it('antes de saber da sessão, não mostra nem Entrar nem Sair', () => {
    renderizar(contextoDeTeste({ pronto: false }))

    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument()
  })

  it('deslogado: Entrar leva ao login e volta para a página atual', () => {
    renderizar(contextoDeTeste({ logado: false, email: null }))

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/entrar?proximo=%2Ffilme%2F550',
    )
  })

  it('deslogado com query string: Entrar preserva a busca', () => {
    mocks.caminho = '/explorar'
    mocks.busca = 'genero=18'
    renderizar(contextoDeTeste({ logado: false, email: null }))

    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute(
      'href',
      '/entrar?proximo=%2Fexplorar%3Fgenero%3D18',
    )
  })

  it('deslogado na própria /entrar: não mostra o link para ela mesma', () => {
    mocks.caminho = '/entrar'
    renderizar(contextoDeTeste({ logado: false, email: null }))

    expect(screen.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('logado: mostra o email e Sair', () => {
    renderizar(contextoDeTeste())

    expect(screen.getByText('ana@exemplo.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('Sair encerra a sessão e atualiza a página', async () => {
    const valor = contextoDeTeste()
    renderizar(valor)

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(valor.sair).toHaveBeenCalled()
    expect(mocks.refresh).toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('Sair dentro da Minha lista volta para o início', async () => {
    mocks.caminho = '/minha-lista'
    renderizar(contextoDeTeste())

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))

    expect(mocks.push).toHaveBeenCalledWith('/')
  })
})
