import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import React from 'react'
import { SERVER_ONLY_ALIAS_OK } from '@/test/fixtures/server-only-consumer'

describe('infraestrutura de testes', () => {
  it('resolve o alias @ e importa um módulo que depende do stub de server-only', () => {
    expect(SERVER_ONLY_ALIAS_OK).toBe('ok')
  })

  it('renderiza no jsdom e expõe os matchers do testing-library', () => {
    render(React.createElement('p', null, 'ola'))
    expect(screen.getByText('ola')).toBeInTheDocument()
  })

  it('registra o matcher toHaveNoViolations do jest-axe para um fragmento acessível', async () => {
    const { container } = render(
      React.createElement(
        'button',
        { type: 'button', 'aria-label': 'Fechar' },
        'X'
      )
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('acusa uma violação real de acessibilidade (controle negativo do jest-axe)', async () => {
    const { container } = render(React.createElement('img', { src: 'foto.png' }))
    const results = await axe(container)
    expect(results).not.toHaveNoViolations()
  })
})
