const CHAVE = 'streaming-catalog:v1'

export type Preferences = {
  providerIds: number[]
  watchlist: number[]
  hasOnboarded: boolean
}

export const PREFERENCIAS_PADRAO: Preferences = {
  providerIds: [],
  watchlist: [],
  hasOnboarded: false,
}

function listaDeNumeros(valor: unknown): number[] | null {
  if (!Array.isArray(valor)) return null
  return valor.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
}

function validar(bruto: unknown): Preferences {
  if (typeof bruto !== 'object' || bruto === null) return PREFERENCIAS_PADRAO

  const objeto = bruto as Record<string, unknown>
  const providerIds = listaDeNumeros(objeto.providerIds)
  const watchlist = listaDeNumeros(objeto.watchlist)
  const hasOnboarded = objeto.hasOnboarded

  // Se qualquer campo veio com o tipo errado, o registro inteiro é suspeito.
  if (providerIds === null || watchlist === null || typeof hasOnboarded !== 'boolean') {
    return PREFERENCIAS_PADRAO
  }

  return { providerIds, watchlist, hasOnboarded }
}

/**
 * Toda leitura é defensiva: em aba anônima o acesso ao localStorage pode
 * lançar exceção, e o app precisa continuar funcionando sem persistência.
 */
export function readPreferences(): Preferences {
  try {
    const salvo = window.localStorage.getItem(CHAVE)
    if (!salvo) return PREFERENCIAS_PADRAO
    return validar(JSON.parse(salvo))
  } catch {
    return PREFERENCIAS_PADRAO
  }
}

export function writePreferences(preferences: Preferences): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(preferences))
  } catch {
    // Sem persistência é aceitável; quebrar a interface não é.
  }
}
