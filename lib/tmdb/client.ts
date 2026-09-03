import 'server-only'
import { LANGUAGE, TMDB_BASE_URL } from './config'

export class TmdbError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'TmdbError'
    this.status = status
  }
}

type RequestOptions = {
  params?: Record<string, string | number | undefined>
  /** Segundos de cache, ou false para nunca cachear. */
  revalidate: number | false
  /** Base do backoff. Os testes passam 0 para não esperar. */
  retryBaseMs?: number
}

function montarUrl(path: string, params: RequestOptions['params']): string {
  const url = new URL(TMDB_BASE_URL + path)
  url.searchParams.set('language', LANGUAGE)

  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor === undefined || valor === '') continue
    url.searchParams.set(chave, String(valor))
  }

  return url.toString()
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Faz uma requisição autenticada ao TMDB.
 *
 * Repete uma vez em 429 (respeitando Retry-After) e uma vez em 5xx.
 * Erros 4xx que não sejam 429 falham imediatamente: repetir não ajudaria.
 */
export async function tmdbFetch<T>(path: string, options: RequestOptions): Promise<T> {
  const token = process.env.TMDB_ACCESS_TOKEN
  if (!token) {
    throw new Error(
      'TMDB_ACCESS_TOKEN não configurado. Copie .env.example para .env.local e preencha o token.',
    )
  }

  const url = montarUrl(path, options.params)
  const retryBaseMs = options.retryBaseMs ?? 500
  const maxTentativas = 2

  let ultimoErro: TmdbError | null = null

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa += 1) {
    const resposta = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      next: options.revalidate === false
        ? { revalidate: 0 }
        : { revalidate: options.revalidate },
    })

    if (resposta.ok) {
      return (await resposta.json()) as T
    }

    ultimoErro = new TmdbError(
      `TMDB respondeu ${resposta.status} para ${path}`,
      resposta.status,
    )

    const podeRepetir = resposta.status === 429 || resposta.status >= 500
    if (!podeRepetir || tentativa === maxTentativas) {
      throw ultimoErro
    }

    const retryAfter = Number(resposta.headers.get('retry-after') ?? '0')
    const espera = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : retryBaseMs * tentativa

    await esperar(espera)
  }

  throw ultimoErro ?? new TmdbError(`Falha ao consultar ${path}`, 0)
}
