import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { configSupabase } from './config'

const ROTAS_COM_CONTA = ['/minha-lista']

function exigeConta(caminho: string): boolean {
  return ROTAS_COM_CONTA.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`))
}

/**
 * Roda antes de toda rota (ver proxy.ts). Faz duas coisas:
 *
 * 1. Renova a sessão. getClaims() troca um token expirado por um novo e o
 *    Supabase devolve os cookies novos por setAll. Sem isso a pessoa é
 *    deslogada sem motivo quando o token vence.
 * 2. Redireciona /minha-lista sem sessão para /entrar. É uma checagem
 *    otimista (guia de autenticação do Next): a página confere a sessão de
 *    novo no servidor, e o RLS é quem de fato protege os dados.
 */
export async function atualizarSessao(request: NextRequest): Promise<NextResponse> {
  const { url, chave } = configSupabase()
  let resposta = NextResponse.next({ request })
  let cabecalhosDeCache: Record<string, string> = {}

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesParaGravar, cabecalhos) {
        // O pedido também recebe os cookies novos: é dele que as páginas
        // leem a sessão nesta mesma requisição.
        cookiesParaGravar.forEach(({ name, value }) => request.cookies.set(name, value))
        resposta = NextResponse.next({ request })
        cookiesParaGravar.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options),
        )
        // Resposta que grava cookie de sessão não pode ficar em cache de
        // CDN, senão o token de uma pessoa é servido a outra.
        cabecalhosDeCache = cabecalhos
        Object.entries(cabecalhos).forEach(([nome, valor]) => resposta.headers.set(nome, valor))
      },
    },
  })

  const { data } = await supabase.auth.getClaims()

  if (data?.claims || !exigeConta(request.nextUrl.pathname)) {
    return resposta
  }

  const destino = request.nextUrl.clone()
  destino.pathname = '/entrar'
  destino.search = ''
  destino.searchParams.set('proximo', request.nextUrl.pathname)

  const redirecionamento = NextResponse.redirect(destino)
  resposta.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie))
  Object.entries(cabecalhosDeCache).forEach(([nome, valor]) =>
    redirecionamento.headers.set(nome, valor),
  )
  return redirecionamento
}
