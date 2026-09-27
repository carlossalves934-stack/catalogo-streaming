import { vi } from 'vitest'

export type ResultadoFalso = { data: unknown; error: unknown }

/**
 * Dublê do construtor de consultas do supabase-js. Todo método encadeia
 * (from().select().order()...) e fica registrado em `chamadas`, na ordem;
 * o `await` no fim da cadeia resolve `resultado`. Assim o teste confere a
 * consulta montada sem depender da forma interna do supabase-js.
 */
export function consultaFalsa(resultado: ResultadoFalso = { data: null, error: null }) {
  const chamadas: Array<{ metodo: string; args: unknown[] }> = []

  const consulta: object = new Proxy(
    {},
    {
      get(_alvo, propriedade) {
        if (typeof propriedade === 'symbol') return undefined
        if (propriedade === 'then') {
          return (ok: (valor: ResultadoFalso) => unknown, falha?: (erro: unknown) => unknown) =>
            Promise.resolve(resultado).then(ok, falha)
        }
        return (...args: unknown[]) => {
          chamadas.push({ metodo: propriedade, args })
          return consulta
        }
      },
    },
  )

  return { consulta, chamadas }
}

/**
 * Cliente de servidor falso: `auth.getClaims()` devolve a sessão de
 * `usuarioId` (ou nenhuma, com `usuarioId: null`), e `from()` devolve uma
 * consultaFalsa que resolve `resultado`.
 */
export function clienteServidorFalso(
  opcoes: { usuarioId?: string | null; resultado?: ResultadoFalso } = {},
) {
  const usuarioId = opcoes.usuarioId === undefined ? 'usuario-1' : opcoes.usuarioId
  const { consulta, chamadas } = consultaFalsa(opcoes.resultado)

  const cliente = {
    auth: {
      getClaims: vi.fn(async () => ({
        data: usuarioId ? { claims: { sub: usuarioId, email: 'ana@exemplo.com' } } : null,
        error: null,
      })),
    },
    from: vi.fn(() => consulta),
  }

  return { cliente, chamadas }
}
