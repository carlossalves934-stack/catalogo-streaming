import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RatingSelect } from './rating-select'

const push = vi.fn()

let searchParamsString = 'servicos=8'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(searchParamsString),
}))

function destinoDoPush(): URL {
  return new URL(push.mock.calls[0][0], 'http://localhost')
}

beforeEach(() => {
  push.mockClear()
  searchParamsString = 'servicos=8'
})

describe('RatingSelect', () => {
  it('oferece um seletor rotulado', () => {
    render(<RatingSelect />)

    expect(screen.getByLabelText('Nota mínima')).toBeInTheDocument()
  })

  it('oferece a nota 7,5, usada pelos trilhos curados da home', () => {
    render(<RatingSelect />)

    const select = screen.getByLabelText('Nota mínima') as HTMLSelectElement
    const valores = Array.from(select.options).map((opcao) => opcao.value)

    expect(valores).toContain('7.5')
  })

  it('escreve a nota escolhida na URL preservando os servicos', async () => {
    const usuario = userEvent.setup()
    render(<RatingSelect />)

    await usuario.selectOptions(screen.getByLabelText('Nota mínima'), '8')

    expect(destinoDoPush().searchParams.get('nota')).toBe('8')
    expect(destinoDoPush().searchParams.get('servicos')).toBe('8')
  })

  it('remove o parametro ao voltar para "Qualquer"', async () => {
    searchParamsString = 'servicos=8&nota=8'
    const usuario = userEvent.setup()
    render(<RatingSelect />)

    await usuario.selectOptions(screen.getByLabelText('Nota mínima'), '')

    expect(destinoDoPush().searchParams.has('nota')).toBe(false)
  })

  it('exibe a nota vinda da URL como selecionada', () => {
    searchParamsString = 'servicos=8&nota=7.5'
    render(<RatingSelect />)

    expect((screen.getByLabelText('Nota mínima') as HTMLSelectElement).value).toBe('7.5')
  })

  it('volta para a primeira pagina ao trocar a nota', async () => {
    searchParamsString = 'servicos=8&pagina=3'
    const usuario = userEvent.setup()
    render(<RatingSelect />)

    await usuario.selectOptions(screen.getByLabelText('Nota mínima'), '7')

    expect(destinoDoPush().searchParams.has('pagina')).toBe(false)
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<RatingSelect />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
