import 'server-only'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { configSupabase } from './config'

/**
 * Um cliente por requisição: ele carrega os cookies desta requisição, e
 * reaproveitá-lo entre requisições misturaria sessões de pessoas diferentes.
 */
export async function criarClienteServidor(): Promise<SupabaseClient> {
  const { url, chave } = configSupabase()
  const cookieStore = await cookies()

  return createServerClient(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesParaGravar) {
        try {
          cookiesParaGravar.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Component não pode gravar cookie; só Server Action e o
          // proxy podem. Aqui é seguro ignorar: quem renova a sessão em
          // toda requisição é o proxy.ts.
        }
      },
    },
  })
}

/**
 * getClaims() valida o token antes de confiar nele (getSession() não
 * valida). Sem sessão ou com token inválido, devolve null.
 */
export async function idDoUsuario(supabase: Pick<SupabaseClient, 'auth'>): Promise<string | null> {
  const { data } = await supabase.auth.getClaims()
  return data?.claims?.sub ?? null
}
