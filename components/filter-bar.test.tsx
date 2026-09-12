import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Genre } from '@/lib/tmdb/types'
import { FilterBar } from './filter-bar'

const push = vi.fn()

// Mutável para permitir que testes individuais simulem outra query string
// (ex.: nota=7.5 vinda da URL) sem recriar o mock inteiro.
let searchParamsString = 'servicos=8'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  usePathname: () => '/explorar',
  useSearchParams: () => new URLSearchParams(searchParamsString),
}))

const generos: Genre[] = [
  { id: 27, name: 'Terror' },
  { id: 35, name: 'Comédia' },
]

beforeEach(() => {
  push.mockClear()
  searchParamsString = 'servicos=8'
})

describe('FilterBar', () => {
  it('oferece um seletor rotulado para cada filtro', () => {
    render(<FilterBar genres={generos} />)

    expect(screen.getByLabelText('Gênero')).toBeInTheDocument()
    expect(screen.getByLabelText('Década')).toBeInTheDocument()
    expect(screen.getByLabelText('Nota mínima')).toBeInTheDocument()
    expect(screen.getByLabelText('Ordenar por')).toBeInTheDocument()
  })

  it('preserva os servicos selecionados ao mudar um filtro', async () => {
    const usuario = userEvent.setup()
    render(<FilterBar genres={generos} />)

    await usuario.selectOptions(screen.getByLabelText('Gênero'), '27')

    expect(push).toHaveBeenCalledTimes(1)
    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.get('servicos')).toBe('8')
    expect(destino.searchParams.get('genero')).toBe('27')
  })

  it('remove o parametro ao voltar para a opcao vazia', async () => {
    const usuario = userEvent.setup()
    render(<FilterBar genres={generos} />)

    await usuario.selectOptions(screen.getByLabelText('Gênero'), '')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.has('genero')).toBe(false)
  })

  it('volta para a primeira pagina ao trocar um filtro', async () => {
    const usuario = userEvent.setup()
    render(<FilterBar genres={generos} />)

    await usuario.selectOptions(screen.getByLabelText('Nota mínima'), '7')

    const destino = new URL(push.mock.calls[0][0], 'http://localhost')
    expect(destino.searchParams.has('pagina')).toBe(false)
  })

  it('oferece uma opcao de nota 7,5, valor usado pelo trilho "Muito bem avaliados"', () => {
    render(<FilterBar genres={generos} />)

    const select = screen.getByLabelText('Nota mínima') as HTMLSelectElement
    const valores = Array.from(select.options).map((opcao) => opcao.value)

    expect(valores).toContain('7.5')
  })

  it('exibe nota=7.5 da URL selecionado, em vez de cair para "Qualquer"', () => {
    searchParamsString = 'servicos=8&nota=7.5'
    render(<FilterBar genres={generos} />)

    const select = screen.getByLabelText('Nota mínima') as HTMLSelectElement

    expect(select.value).toBe('7.5')
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<FilterBar genres={generos} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
