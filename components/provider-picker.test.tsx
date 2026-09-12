import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it } from 'vitest'
import type { Provider } from '@/lib/tmdb/types'
import { ProviderPicker } from './provider-picker'

const provedores: Provider[] = [
  { id: 8, name: 'Netflix', logoUrl: 'https://image.tmdb.org/t/p/w92/n.jpg', displayPriority: 1 },
  { id: 119, name: 'Amazon Prime Video', logoUrl: null, displayPriority: 2 },
  { id: 337, name: 'Disney Plus', logoUrl: null, displayPriority: 3 },
]

afterEach(() => {
  window.localStorage.clear()
})

describe('ProviderPicker', () => {
  it('lista todos os provedores como caixas de selecao', () => {
    render(<ProviderPicker providers={provedores} />)

    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByRole('checkbox', { name: 'Netflix' })).toBeInTheDocument()
  })

  it('marca e desmarca um provedor pelo teclado', async () => {
    const usuario = userEvent.setup()
    render(<ProviderPicker providers={provedores} />)

    const netflix = screen.getByRole('checkbox', { name: 'Netflix' })
    netflix.focus()
    await usuario.keyboard(' ')

    expect(netflix).toBeChecked()

    await usuario.keyboard(' ')
    expect(netflix).not.toBeChecked()
  })

  it('persiste a selecao no localStorage', async () => {
    const usuario = userEvent.setup()
    render(<ProviderPicker providers={provedores} />)

    await usuario.click(screen.getByRole('checkbox', { name: 'Netflix' }))
    await usuario.click(screen.getByRole('button', { name: /confirmar/i }))

    const salvo = JSON.parse(window.localStorage.getItem('streaming-catalog:v1') ?? '{}')
    expect(salvo.providerIds).toEqual([8])
    expect(salvo.hasOnboarded).toBe(true)
  })

  it('permite seguir sem escolher nenhum servico', async () => {
    const usuario = userEvent.setup()
    render(<ProviderPicker providers={provedores} />)

    await usuario.click(screen.getByRole('button', { name: /ver tudo/i }))

    const salvo = JSON.parse(window.localStorage.getItem('streaming-catalog:v1') ?? '{}')
    expect(salvo.providerIds).toEqual([])
    expect(salvo.hasOnboarded).toBe(true)
  })

  it('informa quantos servicos estao selecionados', async () => {
    const usuario = userEvent.setup()
    render(<ProviderPicker providers={provedores} />)

    await usuario.click(screen.getByRole('checkbox', { name: 'Netflix' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Disney Plus' }))

    expect(screen.getByRole('status')).toHaveTextContent('2 serviços selecionados')
  })

  it('mostra o nome quando o provedor nao tem logo', () => {
    render(<ProviderPicker providers={provedores} />)

    expect(screen.getByText('Amazon Prime Video')).toBeInTheDocument()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<ProviderPicker providers={provedores} />)

    expect(await axe(container)).toHaveNoViolations()
  })

  // Ruling F2: usePreferences() retorna PREFERENCIAS_PADRAO no primeiro
  // render e só carrega o valor real do localStorage após o mount. Se o
  // estado inicial do componente for `useState(preferences.providerIds)`,
  // ele nasce sempre vazio — mesmo para quem já tinha escolhido serviços — e
  // confirmar sem retocar nada sobrescreve a seleção salva com `[]`. Este
  // teste seed a preferência existente e garante que ela sobrevive tanto à
  // hidratação (aparece marcada) quanto à confirmação (não é apagada).
  it('carrega a selecao ja salva apos a hidratacao e nao a apaga ao confirmar', async () => {
    window.localStorage.setItem(
      'streaming-catalog:v1',
      JSON.stringify({ providerIds: [8, 119], watchlist: [], hasOnboarded: true }),
    )
    const usuario = userEvent.setup()

    render(<ProviderPicker providers={provedores} />)

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: 'Netflix' })).toBeChecked()
    })
    expect(screen.getByRole('checkbox', { name: 'Amazon Prime Video' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Disney Plus' })).not.toBeChecked()

    await usuario.click(screen.getByRole('button', { name: /confirmar/i }))

    const salvo = JSON.parse(window.localStorage.getItem('streaming-catalog:v1') ?? '{}')
    expect(salvo.providerIds).toEqual([8, 119])
  })
})
