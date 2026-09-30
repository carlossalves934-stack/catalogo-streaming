/**
 * Notas oferecidas pelo seletor "Nota mínima", na home e em /explorar.
 *
 * A lista mora aqui, e não dentro do componente, porque o parser da URL
 * precisa aceitar exatamente estes valores: uma nota numericamente válida
 * mas ausente da lista filtraria o resultado de verdade enquanto o <select>
 * controlado cairia para "Qualquer" — o filtro ficaria invisível, e sem
 * controle para desfazê-lo.
 *
 * 7.5 é obrigatório aqui: é a nota dos trilhos "Muito bem avaliados" e
 * "Vale redescobrir".
 */
export const NOTAS_DISPONIVEIS = [6, 7, 7.5, 8]

/**
 * Converte o parâmetro de URL `nota` na nota mínima a aplicar.
 *
 * Ausência, string vazia, lixo não numérico e qualquer valor fora de
 * `NOTAS_DISPONIVEIS` significam "sem filtro de nota" e viram undefined —
 * nunca um NaN repassado ao TMDB.
 */
export function notaDaUrl(bruto: string | undefined): number | undefined {
  if (!bruto) return undefined

  const nota = Number(bruto)

  return NOTAS_DISPONIVEIS.includes(nota) ? nota : undefined
}
