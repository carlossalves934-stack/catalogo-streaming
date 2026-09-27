/** Teto da lista exibida e importada. Ver as limitações conhecidas no spec, §8. */
export const MAXIMO_NA_LISTA = 50

/** Maior valor da coluna `integer` do Postgres. */
const MAIOR_INTEGER = 2_147_483_647

export function idValido(valor: unknown): valor is number {
  return (
    typeof valor === 'number' && Number.isInteger(valor) && valor > 0 && valor <= MAIOR_INTEGER
  )
}

/**
 * Para ids que vêm de fora: do localStorage (que qualquer script da página
 * pode ter escrito) ou do argumento de uma Server Action (que qualquer um
 * pode chamar com o que quiser).
 */
export function sanitizarIds(valor: unknown): number[] {
  if (!Array.isArray(valor)) return []
  return Array.from(new Set(valor.filter(idValido))).slice(0, MAXIMO_NA_LISTA)
}
