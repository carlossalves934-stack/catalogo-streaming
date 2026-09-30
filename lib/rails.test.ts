import { describe, expect, it } from 'vitest'
import { comNotaMinima, railDefinitions, type RailDefinition } from './rails'

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

  it('propaga minRating para o parametro nota do href, em todo trilho que o define', () => {
    // A prévia do trilho e o "Ver mais" precisam mostrar o mesmo conjunto:
    // se o filtro de nota da prévia não aparecer no href, o clique leva a
    // um resultado mais amplo do que o usuário viu na home.
    for (const trilho of railDefinitions(new Date('2026-03-15'))) {
      if (trilho.filters.minRating === undefined) continue

      const url = new URL(trilho.href, 'http://x')
      expect(url.searchParams.get('nota')).toBe(String(trilho.filters.minRating))
    }
  })
})

function trilho(id: string): RailDefinition {
  const encontrado = railDefinitions(new Date('2026-03-15')).find((t) => t.id === id)
  if (!encontrado) throw new Error(`nenhum trilho com id ${id}`)
  return encontrado
}

describe('comNotaMinima', () => {
  it('devolve a definicao inalterada quando nao ha nota escolhida', () => {
    const curado = trilho('bem-avaliados')

    expect(comNotaMinima(curado, undefined)).toEqual(curado)
  })

  it('aplica a nota escolhida a um trilho que nao tinha nota propria', () => {
    expect(comNotaMinima(trilho('em-alta'), 8).filters.minRating).toBe(8)
  })

  it('nao afrouxa a curadoria de um trilho com nota propria mais alta', () => {
    // Escolher 6 nao pode rebaixar "Muito bem avaliados" a um trilho de nota 6:
    // a curadoria do trilho e um piso, nao um valor que o filtro substitui.
    expect(comNotaMinima(trilho('bem-avaliados'), 6).filters.minRating).toBe(7.5)
  })

  it('sobrepoe a nota curada quando a escolha do usuario e mais estrita', () => {
    expect(comNotaMinima(trilho('bem-avaliados'), 8).filters.minRating).toBe(8)
  })

  it('preserva os demais filtros e a identidade do trilho', () => {
    const curado = trilho('redescobrir')

    const resultado = comNotaMinima(curado, 8)

    expect(resultado.id).toBe(curado.id)
    expect(resultado.title).toBe(curado.title)
    expect(resultado.filters.sortBy).toBe(curado.filters.sortBy)
    expect(resultado.filters.decade).toBe(curado.filters.decade)
  })
})

describe('comNotaMinima e o href do "Ver mais"', () => {
  function params(href: string): URLSearchParams {
    return new URL(href, 'http://x').searchParams
  }

  it('acrescenta a nota ao href de um trilho que nao tinha nota propria', () => {
    expect(params(comNotaMinima(trilho('em-alta'), 8).href).get('nota')).toBe('8')
  })

  it('reescreve a nota do href quando a escolha do usuario sobrepoe a curada', () => {
    expect(params(comNotaMinima(trilho('bem-avaliados'), 8).href).get('nota')).toBe('8')
  })

  it('mantem a nota curada no href quando a escolha do usuario e mais frouxa', () => {
    expect(params(comNotaMinima(trilho('bem-avaliados'), 6).href).get('nota')).toBe('7.5')
  })

  it('preserva os demais parametros do href', () => {
    const destino = params(comNotaMinima(trilho('redescobrir'), 8).href)

    expect(destino.get('ordenar')).toBe('rating')
    expect(destino.get('decada')).toBe('2000')
  })

  it('mantem href e filters em acordo em todo trilho filtrado', () => {
    // Mesma invariante que os trilhos crus ja respeitam: a previa e o
    // "Ver mais" precisam mostrar o mesmo conjunto.
    for (const cru of railDefinitions(new Date('2026-03-15'))) {
      const filtrado = comNotaMinima(cru, 8)

      expect(params(filtrado.href).get('nota')).toBe(String(filtrado.filters.minRating))
    }
  })
})
