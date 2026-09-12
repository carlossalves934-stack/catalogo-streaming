import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import type { WatchOptions } from '@/lib/tmdb/types'
import { WatchProviderBlock } from './watch-provider-block'

const netflix = { id: 8, name: 'Netflix', logoUrl: null, displayPriority: 1 }
const appleTv = { id: 2, name: 'Apple TV', logoUrl: null, displayPriority: 2 }

const completo: WatchOptions = {
  flatrate: [netflix],
  rent: [appleTv],
  buy: [appleTv],
  tmdbLink: 'https://www.themoviedb.org/movie/1/watch',
}

describe('WatchProviderBlock', () => {
  it('separa assinatura, aluguel e compra com rotulos claros', () => {
    render(<WatchProviderBlock options={completo} subscribedIds={[]} />)

    expect(screen.getByRole('heading', { name: /incluso na assinatura/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /alugar/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /comprar/i })).toBeInTheDocument()
  })

  it('destaca os servicos que o usuario ja assina', () => {
    render(<WatchProviderBlock options={completo} subscribedIds={[8]} />)

    // String exata (com acento) em vez de regex solto: evita que a cópia
    // desacentue de novo silenciosamente sem quebrar o teste.
    expect(screen.getByText('Você assina')).toBeInTheDocument()
  })

  it('nao destaca nada quando o usuario nao assina o servico', () => {
    render(<WatchProviderBlock options={completo} subscribedIds={[119]} />)

    expect(screen.queryByText('Você assina')).not.toBeInTheDocument()
  })

  it('nao destaca aluguel ou compra mesmo quando o provedor tambem esta na assinatura', () => {
    // Apple TV (id 2) aparece em rent e buy no fixture `completo`, mas não
    // em flatrate. Assinar o id 2 nunca deve acender "Você assina" nessas
    // duas seções — o selo significa "incluso no seu plano", o que nunca é
    // verdade para aluguel ou compra.
    render(<WatchProviderBlock options={completo} subscribedIds={[2]} />)

    expect(screen.queryByText('Você assina')).not.toBeInTheDocument()
  })

  it('omite secoes vazias', () => {
    render(
      <WatchProviderBlock
        options={{ flatrate: [netflix], rent: [], buy: [], tmdbLink: null }}
        subscribedIds={[]}
      />,
    )

    expect(screen.queryByRole('heading', { name: /alugar/i })).not.toBeInTheDocument()
  })

  it('avisa quando o filme nao esta disponivel no Brasil', () => {
    render(
      <WatchProviderBlock
        options={{ flatrate: [], rent: [], buy: [], tmdbLink: null }}
        subscribedIds={[]}
      />,
    )

    expect(screen.getByText(/não está disponível/i)).toBeInTheDocument()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<WatchProviderBlock options={completo} subscribedIds={[8]} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
