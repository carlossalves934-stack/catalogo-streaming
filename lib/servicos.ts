/**
 * Sentinela usado no parâmetro de URL `servicos` para "sem filtro de
 * serviço" — a pessoa escolheu "Ver tudo, sem filtrar" no onboarding.
 *
 * Isso existe porque `providerIds: []` sozinho é ambíguo: tanto quem nunca
 * escolheu um serviço quanto quem escolheu "ver tudo" acabam com a lista
 * vazia. A Home precisa distinguir os dois casos pela URL (presença do
 * parâmetro), não pelo conteúdo da lista — ver `idsDeServicos` e
 * `ProviderGate`.
 */
export const SEM_FILTRO = 'todos'

/**
 * Converte o parâmetro de URL `servicos` numa lista de ids de provedor.
 *
 * Ausência, string vazia e o sentinela `SEM_FILTRO` significam explicitamente
 * "sem filtro" e viram lista vazia. Qualquer outro valor é lido como lista
 * separada por vírgula; entradas que não são inteiros positivos (frações,
 * negativos, zero, lixo não numérico, vírgulas vazias) são descartadas, e
 * ids repetidos são removidos.
 */
export function idsDeServicos(bruto: string | undefined): number[] {
  if (!bruto || bruto === SEM_FILTRO) return []

  const ids = bruto
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)

  return Array.from(new Set(ids))
}
