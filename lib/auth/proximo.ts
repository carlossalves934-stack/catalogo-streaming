export const DESTINO_PADRAO = '/minha-lista'

/**
 * Só aceita caminho interno. Sem esta checagem,
 * /entrar?proximo=https://site-falso.com vira um open redirect: a vítima vê
 * o domínio do app no link, entra, e cai no site do atacante.
 *
 * "//site" e "/\site" também saem do domínio: o navegador lê os dois como
 * endereço de outro host. Caracteres de controle são recusados porque o
 * navegador remove tab e quebra de linha de URLs, e "/\t/site" vira "//site".
 */
export function proximoSeguro(valor: unknown): string {
  if (typeof valor !== 'string') return DESTINO_PADRAO
  if (!valor.startsWith('/')) return DESTINO_PADRAO
  if (valor.startsWith('//') || valor.startsWith('/\\')) return DESTINO_PADRAO
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(valor)) return DESTINO_PADRAO
  return valor
}

export function urlDeEntrar(caminhoAtual: string): string {
  return `/entrar?proximo=${encodeURIComponent(caminhoAtual)}`
}
