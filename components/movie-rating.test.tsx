import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it } from 'vitest'
import { MovieRating } from './movie-rating'

describe('MovieRating', () => {
  it('mostra a nota com um nome acessivel', () => {
    render(<MovieRating rating={8.2} />)

    expect(screen.getByText(/8\.2/)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /nota 8\.2 de 10/i })).toBeInTheDocument()
  })

  it('nao renderiza nada quando a nota e nula', () => {
    const { container } = render(<MovieRating rating={null} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('nao tem violacoes de acessibilidade', async () => {
    const { container } = render(<MovieRating rating={7} />)

    expect(await axe(container)).toHaveNoViolations()
  })
})
