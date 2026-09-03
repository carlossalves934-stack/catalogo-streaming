const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export type PosterSize = 'w185' | 'w342' | 'w500'

function montar(path: string | null | undefined, size: string): string | null {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

export function posterUrl(path: string | null | undefined, size: PosterSize): string | null {
  return montar(path, size)
}

export function backdropUrl(path: string | null | undefined): string | null {
  return montar(path, 'w780')
}

export function logoUrl(path: string | null | undefined): string | null {
  return montar(path, 'w92')
}

export function profileUrl(path: string | null | undefined): string | null {
  return montar(path, 'w185')
}
