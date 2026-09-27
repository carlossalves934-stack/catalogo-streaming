'use server'

import { revalidatePath } from 'next/cache'
import { criarClienteServidor, idDoUsuario } from '@/lib/supabase/server'
import { idValido, sanitizarIds } from './ids'

export type ResultadoDaLista =
  | { ok: true }
  | { ok: false; motivo: 'sem-sessao' | 'id-invalido' | 'erro' }

// Filme já salvo não é erro: salvar de novo e reimportar não fazem nada.
const SEM_DUPLICATA = { onConflict: 'user_id,movie_id', ignoreDuplicates: true }

/*
 * Server Actions são endpoints públicos: qualquer um pode chamá-las com
 * qualquer argumento. Por isso cada uma valida o id e confere a sessão por
 * conta própria, sem confiar no proxy.ts. O user_id vem sempre da sessão,
 * nunca do argumento, e o RLS confere de novo no banco.
 */

export async function salvarNaLista(id: number): Promise<ResultadoDaLista> {
  if (!idValido(id)) return { ok: false, motivo: 'id-invalido' }

  const supabase = await criarClienteServidor()
  const usuarioId = await idDoUsuario(supabase)
  if (!usuarioId) return { ok: false, motivo: 'sem-sessao' }

  const { error } = await supabase
    .from('watchlist')
    .upsert({ user_id: usuarioId, movie_id: id }, SEM_DUPLICATA)
  if (error) return { ok: false, motivo: 'erro' }

  revalidatePath('/minha-lista')
  return { ok: true }
}

export async function removerDaLista(id: number): Promise<ResultadoDaLista> {
  if (!idValido(id)) return { ok: false, motivo: 'id-invalido' }

  const supabase = await criarClienteServidor()
  const usuarioId = await idDoUsuario(supabase)
  if (!usuarioId) return { ok: false, motivo: 'sem-sessao' }

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('user_id', usuarioId)
    .eq('movie_id', id)
  if (error) return { ok: false, motivo: 'erro' }

  revalidatePath('/minha-lista')
  return { ok: true }
}

export async function importarLista(ids: unknown): Promise<ResultadoDaLista> {
  const validos = sanitizarIds(ids)

  const supabase = await criarClienteServidor()
  const usuarioId = await idDoUsuario(supabase)
  if (!usuarioId) return { ok: false, motivo: 'sem-sessao' }
  if (validos.length === 0) return { ok: true }

  const linhas = validos.map((movieId) => ({ user_id: usuarioId, movie_id: movieId }))
  const { error } = await supabase.from('watchlist').upsert(linhas, SEM_DUPLICATA)
  if (error) return { ok: false, motivo: 'erro' }

  revalidatePath('/minha-lista')
  return { ok: true }
}
