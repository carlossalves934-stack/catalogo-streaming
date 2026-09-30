import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))

vi.mock('@/lib/supabase/browser', () => ({
  clienteNavegador: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword, signUp: mocks.signUp },
  }),
}))

import { EntrarForm } from './entrar-form'

const COM_SESSAO = { data: { session: { access_token: 't' } }, error: null }

async function preencher() {
  await userEvent.type(screen.getByLabelText('Email'), 'ana@exemplo.com')
  await userEvent.type(screen.getByLabelText('Senha'), 'segredo123')
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset())
})

describe('EntrarForm', () => {
  it('Entrar: faz login e volta para onde a pessoa estava', async () => {
    mocks.signInWithPassword.mockResolvedValue(COM_SESSAO)
    render(<EntrarForm proximo="/filme/550" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'ana@exemplo.com',
      password: 'segredo123',
    })
    expect(mocks.signUp).not.toHaveBeenCalled()
    expect(mocks.replace).toHaveBeenCalledWith('/filme/550')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('Criar conta: cadastra e já entra', async () => {
    mocks.signUp.mockResolvedValue(COM_SESSAO)
    render(<EntrarForm proximo="/minha-lista" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: 'ana@exemplo.com',
      password: 'segredo123',
    })
    expect(mocks.replace).toHaveBeenCalledWith('/minha-lista')
  })

  it('mostra o erro traduzido e não navega', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials' },
    })
    render(<EntrarForm proximo="/minha-lista" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Email ou senha incorretos.')).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('cadastro sem sessão (confirmação por email ligada): avisa em vez de ficar parado', async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null })
    render(<EntrarForm proximo="/minha-lista" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      await screen.findByText('Conta criada, mas o login não foi concluído. Tente Entrar.'),
    ).toBeInTheDocument()
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('desabilita os dois botões enquanto envia', async () => {
    mocks.signInWithPassword.mockReturnValue(new Promise(() => {}))
    render(<EntrarForm proximo="/minha-lista" />)

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled()
  })

  it('não tem violações de acessibilidade, nem com erro na tela', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials' },
    })
    const { container } = render(<EntrarForm proximo="/minha-lista" />)
    expect(await axe(container)).toHaveNoViolations()

    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await screen.findByText('Email ou senha incorretos.')

    expect(await axe(container)).toHaveNoViolations()
  })
})
