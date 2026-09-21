import { describe, expect, it } from 'vitest'
import { backdropEmTamanho, backdropUrl, logoUrl, posterUrl } from './images'

describe('URLs de imagem', () => {
  it('monta a URL do poster no tamanho pedido', () => {
    expect(posterUrl('/abc.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg')
  })

  it('devolve null quando o filme nao tem poster', () => {
    expect(posterUrl(null, 'w342')).toBeNull()
    expect(posterUrl(undefined, 'w342')).toBeNull()
  })

  it('usa w780 para backdrop e w92 para logo de provedor', () => {
    expect(backdropUrl('/bg.jpg')).toBe('https://image.tmdb.org/t/p/w780/bg.jpg')
    expect(logoUrl('/netflix.jpg')).toBe('https://image.tmdb.org/t/p/w92/netflix.jpg')
  })

  it('aceita um tamanho explicito de backdrop', () => {
    expect(backdropUrl('/bg.jpg', 'w1280')).toBe('https://image.tmdb.org/t/p/w1280/bg.jpg')
    expect(backdropUrl('/bg.jpg', 'w300')).toBe('https://image.tmdb.org/t/p/w300/bg.jpg')
  })

  it('troca o tamanho de uma URL de backdrop ja montada', () => {
    const url = 'https://image.tmdb.org/t/p/w780/bg.jpg'

    expect(backdropEmTamanho(url, 'w1280')).toBe('https://image.tmdb.org/t/p/w1280/bg.jpg')
    expect(backdropEmTamanho(url, 'w300')).toBe('https://image.tmdb.org/t/p/w300/bg.jpg')
  })

  it('devolve a URL intacta quando ela nao esta em w780', () => {
    const url = 'https://image.tmdb.org/t/p/original/bg.jpg'

    expect(backdropEmTamanho(url, 'w1280')).toBe(url)
  })
})
