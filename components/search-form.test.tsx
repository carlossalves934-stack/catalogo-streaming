import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchForm } from './search-form'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(''),
}))

beforeEach(() => {
  push.mockClear()
})

describe('SearchForm', () => {
  it('tem um campo de busca rotulado', () => {
    render(<SearchForm />)

    expect(screen.getByLabelText(/buscar filme/i)).toBeInTheDocument()
  })

  it('navega para a busca ao enviar o formulario', async () => {
    const usuario = userEvent.setup()
    render(<SearchForm />)

    await usuario.type(screen.getByLabelText(/buscar filme/i), 'matrix')
    await usuario.click(screen.getByRole('button', { name: /buscar/i }))

    expect(push).toHaveBeenCalledWith('/busca?q=matrix')
  })

  it('nao navega quando o campo esta vazio', async () => {
    const usuario = userEvent.setup()
    render(<SearchForm />)

    await usuario.click(screen.getByRole('button', { name: /buscar/i }))

    expect(push).not.toHaveBeenCalled()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<SearchForm />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
