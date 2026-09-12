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

type Listener = () => void

// Conjunto de callbacks de todas as instâncias de usePreferences() montadas.
// Sem isso, cada usePreferences() era um useState isolado: escrever em uma
// instância (um botão de watchlist) nunca chegava a outra (a tela Minha
// Lista) até a página recarregar — o próprio botão de remover da lista não
// tinha efeito visível na tela criada para gerenciar essa lista.
const listeners = new Set<Listener>()

/** Chamado por usePreferences() para saber quando outra instância escreveu. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function writePreferences(preferences: Preferences): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(preferences))
  } catch {
    // Sem persistência é aceitável; quebrar a interface não é. Uma escrita
    // que falhou não notifica ninguém — não há nada de novo para reler.
    return
  }

  for (const listener of listeners) {
    listener()
  }
}
