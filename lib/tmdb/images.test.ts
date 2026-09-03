import { describe, expect, it } from 'vitest'
import { backdropUrl, logoUrl, posterUrl } from './images'

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
})
