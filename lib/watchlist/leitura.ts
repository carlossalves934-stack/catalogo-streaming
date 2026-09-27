import 'server-only'
import { criarClienteServidor, idDoUsuario } from '@/lib/supabase/server'
import { MAXIMO_NA_LISTA } from './ids'

export type MinhaLista =
  | { logado: false }
  | { logado: true; usuarioId: string; ids: number[]; erro: boolean }

export async function lerMinhaLista(): Promise<MinhaLista> {
  const supabase = await criarClienteServidor()
  const usuarioId = await idDoUsuario(supabase)
  if (!usuarioId) return { logado: false }

  // Sem filtro por user_id: o RLS já devolve só as linhas desta sessão.
  const { data, error } = await supabase
    .from('watchlist')
    .select('movie_id')
    .order('created_at', { ascending: true })
    .limit(MAXIMO_NA_LISTA)

  if (error || !data) return { logado: true, usuarioId, ids: [], erro: true }

  return {
    logado: true,
    usuarioId,
    ids: data.map((linha: { movie_id: number }) => linha.movie_id),
    erro: false,
  }
}
