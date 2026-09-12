import { describe, expect, it } from 'vitest'
import { SEM_FILTRO, idsDeServicos } from './servicos'

describe('idsDeServicos', () => {
  it('trata parâmetro ausente como sem filtro', () => {
    expect(idsDeServicos(undefined)).toEqual([])
  })

  it('trata string vazia como sem filtro', () => {
    expect(idsDeServicos('')).toEqual([])
  })

  it('trata o sentinela "todos" como sem filtro', () => {
    expect(idsDeServicos(SEM_FILTRO)).toEqual([])
  })

  it('lê uma lista normal separada por vírgula', () => {
    expect(idsDeServicos('8,119')).toEqual([8, 119])
  })

  it('remove ids duplicados', () => {
    expect(idsDeServicos('8,8,119')).toEqual([8, 119])
  })

  it('descarta entradas vazias entre vírgulas', () => {
    expect(idsDeServicos(',')).toEqual([])
  })

  it('descarta números fracionários', () => {
    expect(idsDeServicos('1.5')).toEqual([])
  })

  it('descarta números negativos e zero', () => {
    expect(idsDeServicos('-3,0')).toEqual([])
  })

  it('descarta lixo não numérico misturado com ids válidos', () => {
    expect(idsDeServicos('8,abc,119')).toEqual([8, 119])
  })
})
