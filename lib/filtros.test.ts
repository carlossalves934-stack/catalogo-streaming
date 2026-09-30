import { describe, expect, it } from 'vitest'
import {
  anosDisponiveis,
  decadasDisponiveis,
  lerFiltros,
  PRIMEIRO_ANO,
  temFiltroDeGrade,
} from './filtros'

const HOJE = new Date('2026-09-26T12:00:00Z')

describe('anosDisponiveis', () => {
  it('comeca no ano corrente', () => {
    expect(anosDisponiveis(HOJE)[0]).toBe(2026)
  })

  it('termina no primeiro ano oferecido', () => {
    const anos = anosDisponiveis(HOJE)

    expect(anos[anos.length - 1]).toBe(PRIMEIRO_ANO)
  })

  it('lista do mais novo para o mais antigo, sem buracos', () => {
    const anos = anosDisponiveis(HOJE)

    expect(anos).toHaveLength(2026 - PRIMEIRO_ANO + 1)
    expect(anos.every((ano, i) => i === 0 || anos[i - 1] === ano + 1)).toBe(true)
  })
})

describe('decadasDisponiveis', () => {
  it('vai da decada corrente ate a primeira oferecida', () => {
    expect(decadasDisponiveis(HOJE)).toEqual([2020, 2010, 2000, 1990, 1980, 1970])
  })
})

describe('lerFiltros', () => {
  it('sem parametros, ordena por popularidade e nao filtra nada', () => {
    const filtros = lerFiltros({}, HOJE)

    expect(filtros.sortBy).toBe('popularity')
    expect(filtros.genreId).toBeUndefined()
    expect(filtros.year).toBeUndefined()
    expect(filtros.decade).toBeUndefined()
    expect(filtros.minRating).toBeUndefined()
  })

  it('le o genero', () => {
    expect(lerFiltros({ genero: '27' }, HOJE).genreId).toBe(27)
  })

  it('descarta genero que nao e inteiro positivo', () => {
    expect(lerFiltros({ genero: 'abc' }, HOJE).genreId).toBeUndefined()
    expect(lerFiltros({ genero: '-3' }, HOJE).genreId).toBeUndefined()
    expect(lerFiltros({ genero: '0' }, HOJE).genreId).toBeUndefined()
  })

  it('le o ano', () => {
    expect(lerFiltros({ ano: '2015' }, HOJE).year).toBe(2015)
  })

  it('descarta ano fora da faixa oferecida', () => {
    // Um ano que o seletor nao lista filtraria de verdade enquanto o
    // controle exibiria "Qualquer": filtro invisivel, sem como desfazer.
    expect(lerFiltros({ ano: '1969' }, HOJE).year).toBeUndefined()
    expect(lerFiltros({ ano: '2027' }, HOJE).year).toBeUndefined()
    expect(lerFiltros({ ano: 'abc' }, HOJE).year).toBeUndefined()
  })

  it('le a decada e descarta decada fora da lista', () => {
    expect(lerFiltros({ decada: '1990' }, HOJE).decade).toBe(1990)
    expect(lerFiltros({ decada: '1960' }, HOJE).decade).toBeUndefined()
    expect(lerFiltros({ decada: '1995' }, HOJE).decade).toBeUndefined()
  })

  it('le a nota pelas mesmas regras do seletor', () => {
    expect(lerFiltros({ nota: '7.5' }, HOJE).minRating).toBe(7.5)
    expect(lerFiltros({ nota: '9.9' }, HOJE).minRating).toBeUndefined()
  })

  it('le cada ordenacao oferecida, inclusive a crescente por nota', () => {
    expect(lerFiltros({ ordenar: 'rating' }, HOJE).sortBy).toBe('rating')
    expect(lerFiltros({ ordenar: 'ratingAsc' }, HOJE).sortBy).toBe('ratingAsc')
    expect(lerFiltros({ ordenar: 'releaseDate' }, HOJE).sortBy).toBe('releaseDate')
  })

  it('cai para popularidade quando a ordenacao e desconhecida', () => {
    expect(lerFiltros({ ordenar: 'aleatorio' }, HOJE).sortBy).toBe('popularity')
  })
})

describe('temFiltroDeGrade', () => {
  function filtros(brutos: Parameters<typeof lerFiltros>[0]) {
    return lerFiltros(brutos, HOJE)
  }

  it('e falso quando nada foi filtrado', () => {
    expect(temFiltroDeGrade(filtros({}))).toBe(false)
  })

  it('e falso quando so a nota foi escolhida', () => {
    // A nota compoe com os trilhos: e um piso, e "Muito bem avaliados" com
    // nota 8 continua honesto. Por isso ela sozinha nao troca a Home por
    // uma grade — ver `comNotaMinima`.
    expect(temFiltroDeGrade(filtros({ nota: '8' }))).toBe(false)
  })

  it('e verdadeiro com genero, que contradiz o trilho do genero do dia', () => {
    expect(temFiltroDeGrade(filtros({ genero: '35' }))).toBe(true)
  })

  it('e verdadeiro com ano, que contradiz "Estreias recentes"', () => {
    expect(temFiltroDeGrade(filtros({ ano: '1995' }))).toBe(true)
  })

  it('e verdadeiro com decada', () => {
    expect(temFiltroDeGrade(filtros({ decada: '1990' }))).toBe(true)
  })

  it('e verdadeiro com ordenacao diferente da padrao', () => {
    expect(temFiltroDeGrade(filtros({ ordenar: 'ratingAsc' }))).toBe(true)
  })

  it('e falso quando a ordenacao escolhida e a propria padrao', () => {
    // Escolher "Mais populares" e o mesmo que nao escolher nada: trocar a
    // Home por uma grade identica aos trilhos seria perda pura.
    expect(temFiltroDeGrade(filtros({ ordenar: 'popularity' }))).toBe(false)
  })

  it('e verdadeiro quando a nota acompanha um filtro de grade', () => {
    expect(temFiltroDeGrade(filtros({ nota: '8', genero: '35' }))).toBe(true)
  })

  it('ignora valor invalido: nao vira grade por causa de lixo na URL', () => {
    expect(temFiltroDeGrade(filtros({ genero: 'abc', ano: '1800' }))).toBe(false)
  })
})
