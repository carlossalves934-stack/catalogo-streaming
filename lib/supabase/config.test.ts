import { afterEach, describe, expect, it, vi } from 'vitest'
import { configSupabase } from './config'

describe('configSupabase', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('devolve url e chave quando as duas existem', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')

    expect(configSupabase()).toEqual({
      url: 'https://abc.supabase.co',
      chave: 'sb_publishable_teste',
    })
  })

  it('falha apontando o .env.local quando falta a url', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')

    expect(() => configSupabase()).toThrow(/\.env\.local/)
  })

  it('falha apontando o .env.local quando falta a chave', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')

    expect(() => configSupabase()).toThrow(/\.env\.local/)
  })
})
