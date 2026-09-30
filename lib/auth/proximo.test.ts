import { describe, expect, it } from 'vitest'
import { proximoSeguro, urlDeEntrar } from './proximo'

describe('proximoSeguro', () => {
  it.each(['/filme/550', '/minha-lista', '/explorar?genero=18&nota=8', '/'])(
    'aceita o caminho interno %s',
    (valor) => {
      expect(proximoSeguro(valor)).toBe(valor)
    },
  )

  it.each([
    ['ausente', undefined],
    ['vazio', ''],
    ['url absoluta', 'https://site-falso.com'],
    ['url sem protocolo', '//site-falso.com'],
    ['barra invertida', '/\\site-falso.com'],
    ['javascript:', 'javascript:alert(1)'],
    ['relativo sem barra', 'filme/550'],
    // O navegador remove tab e quebra de linha de URLs: "/\t/site" vira "//site".
    ['tab escondido', '/\t/site-falso.com'],
    ['quebra de linha escondida', '/\n/site-falso.com'],
    ['parâmetro repetido (array)', ['/filme/1', '/filme/2']],
  ])('recusa %s e volta para /minha-lista', (_caso, valor) => {
    expect(proximoSeguro(valor)).toBe('/minha-lista')
  })
})

describe('urlDeEntrar', () => {
  it('leva o caminho atual, codificado, no parâmetro proximo', () => {
    expect(urlDeEntrar('/filme/550?servicos=8')).toBe(
      '/entrar?proximo=%2Ffilme%2F550%3Fservicos%3D8',
    )
  })
})
