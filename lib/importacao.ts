/**
 * Quem já respondeu à pergunta "trazer a lista deste navegador para a
 * conta?", por id de usuário. Separado de streaming-catalog:v1 de
 * propósito: a lista antiga fica lá intocada, recuperável mesmo depois de
 * um Descartar clicado por engano.
 */
const CHAVE = 'streaming-catalog:importacao-v1'

function lerDecididos(): string[] {
  try {
    const bruto: unknown = JSON.parse(window.localStorage.getItem(CHAVE) ?? '[]')
    return Array.isArray(bruto) ? bruto.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function jaDecidiu(usuarioId: string): boolean {
  return lerDecididos().includes(usuarioId)
}

export function registrarDecisao(usuarioId: string): void {
  const decididos = lerDecididos()
  if (decididos.includes(usuarioId)) return

  try {
    window.localStorage.setItem(CHAVE, JSON.stringify([...decididos, usuarioId]))
  } catch {
    // Sem persistência, a pergunta volta na próxima visita. Aceitável.
  }
}
