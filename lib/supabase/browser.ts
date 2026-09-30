import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { configSupabase } from './config'

/**
 * No navegador, createBrowserClient devolve sempre a mesma instância. Por
 * isso o formulário de /entrar e o WatchlistProvider enxergam a mesma
 * sessão: o login feito por um dispara o onAuthStateChange do outro.
 */
export function clienteNavegador(): SupabaseClient {
  const { url, chave } = configSupabase()
  return createBrowserClient(url, chave)
}
