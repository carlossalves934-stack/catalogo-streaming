import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TrilhoRolavel } from './trilho-rolavel'

/**
 * jsdom não faz layout: scrollWidth e clientWidth são sempre 0, então nada
 * transborda e as setas nunca apareceriam. Estes helpers fingem a medida
 * para que a decisão de mostrar ou esconder cada seta possa ser testada.
 */
function medirFaixaComo({
  scrollLeft,
  clientWidth = 500,
  scrollWidth = 1500,
}: {
  scrollLeft: number
  clientWidth?: number
  scrollWidth?: number
}) {
  Object.defineProperty(HTMLUListElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  })
  Object.defineProperty(HTMLUListElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  })
  Object.defineProperty(HTMLUListElement.prototype, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
  })
}

const rolar = vi.fn()

beforeEach(() => {
  rolar.mockClear()
  HTMLUListElement.prototype.scrollBy = rolar
})

function montar() {
  return render(
    <TrilhoRolavel rotulo="Em alta">
      <li>Um filme</li>
    </TrilhoRolavel>,
  )
}

describe('TrilhoRolavel', () => {
  it('esconde a seta de voltar quando o trilho esta no comeco', () => {
    medirFaixaComo({ scrollLeft: 0 })
    montar()

    expect(screen.queryByRole('button', { name: 'Voltar em Em alta' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avançar em Em alta' })).toBeInTheDocument()
  })

  it('esconde a seta de avancar quando o trilho chegou ao fim', () => {
    medirFaixaComo({ scrollLeft: 1000 })
    montar()

    expect(screen.getByRole('button', { name: 'Voltar em Em alta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Avançar em Em alta' })).not.toBeInTheDocument()
  })

  it('nao mostra seta nenhuma quando tudo cabe na tela', () => {
    medirFaixaComo({ scrollLeft: 0, clientWidth: 500, scrollWidth: 500 })
    montar()

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('avanca quase uma tela por clique, sem pular o filme da borda', async () => {
    medirFaixaComo({ scrollLeft: 0 })
    montar()

    await userEvent.click(screen.getByRole('button', { name: 'Avançar em Em alta' }))

    expect(rolar).toHaveBeenCalledWith({ left: 425, behavior: 'smooth' })
  })

  it('volta na direcao oposta', async () => {
    medirFaixaComo({ scrollLeft: 600 })
    montar()

    await userEvent.click(screen.getByRole('button', { name: 'Voltar em Em alta' }))

    expect(rolar).toHaveBeenCalledWith({ left: -425, behavior: 'smooth' })
  })

  it('rola sem animacao para quem pediu menos movimento', async () => {
    medirFaixaComo({ scrollLeft: 0 })
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    montar()

    await userEvent.click(screen.getByRole('button', { name: 'Avançar em Em alta' }))

    expect(rolar).toHaveBeenCalledWith({ left: 425, behavior: 'auto' })
    vi.mocked(window.matchMedia).mockRestore()
  })

  it('mantem a rolagem por teclado disponivel na propria faixa', () => {
    medirFaixaComo({ scrollLeft: 0 })
    montar()

    expect(screen.getByRole('list')).toHaveAttribute('tabindex', '0')
  })
})
