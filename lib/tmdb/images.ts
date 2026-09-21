const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export type PosterSize = 'w185' | 'w342' | 'w500'
/**
 * w300 existe para a luz de fundo do destaque na Home: a imagem entra
 * desfocada a 80px, então baixar a versão grande seria desperdício.
 */
export type BackdropSize = 'w300' | 'w780' | 'w1280'

function montar(path: string | null | undefined, size: string): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function posterUrl(path: string | null | undefined, size: PosterSize): string | null {
  return montar(path, size)
}

export function backdropUrl(
  path: string | null | undefined,
  size: BackdropSize = 'w780',
): string | null {
  return montar(path, size)
}

/**
 * Troca o tamanho de uma URL de backdrop já montada.
 *
 * O `Movie` guarda o backdrop em w780, tamanho certo para a página de
 * detalhe. O destaque da Home ocupa a tela inteira e precisa de w1280; a
 * luz de fundo, de w300. Remontar a URL aqui evita carregar o caminho cru
 * da imagem no tipo `Movie` só por causa de duas telas.
 */
export function backdropEmTamanho(url: string, size: BackdropSize): string {
  return url.replace(`${IMAGE_BASE}/w780/`, `${IMAGE_BASE}/${size}/`)
}

export function logoUrl(path: string | null | undefined): string | null {
  return montar(path, 'w92')
}

export function profileUrl(path: string | null | undefined): string | null {
  return montar(path, 'w185')
}
