import { describe, expect, it } from 'vitest'
import { railDefinitions } from './rails'

describe('railDefinitions', () => {
  it('define cinco trilhos', () => {
    expect(railDefinitions(new Date('2026-03-15'))).toHaveLength(5)
  })

  it('da a cada trilho um id unico', () => {
    const ids = railDefinitions(new Date('2026-03-15')).map((t) => t.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('escolhe o genero em destaque de forma deterministica pelo dia do ano', () => {
    // Determinismo importa: servidor e cliente precisam concordar.
    const a = railDefinitions(new Date('2026-03-15T23:00:00Z'))
    const b = railDefinitions(new Date('2026-03-15T02:00:00Z'))

    expect(a[3].title).toBe(b[3].title)
  })

  it('muda o genero em destaque de um dia para o outro', () => {
    const dias = Array.from({ length: 8 }, (_, i) =>
      railDefinitions(new Date(2026, 0, i + 1))[3].title,
    )

    expect(new Set(dias).size).toBeGreaterThan(1)
  })

  it('rotula o trilho de novidades pela data de estreia, nao de entrada no catalogo', () => {
    // O TMDB nao informa quando um filme entrou no streaming; o rotulo
    // precisa dizer o que o dado realmente e.
    const trilho = railDefinitions(new Date('2026-03-15'))[2]

    expect(trilho.title).toMatch(/estre/i)
    expect(trilho.title).not.toMatch(/chegou|entrou/i)
  })

  it('ordena o trilho de bem avaliados por nota', () => {
    expect(railDefinitions(new Date('2026-03-15'))[1].filters.sortBy).toBe('rating')
  })
})
