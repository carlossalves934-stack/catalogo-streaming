import type { NextRequest } from 'next/server'
import { atualizarSessao } from '@/lib/supabase/proxy'

// Next 16: "middleware.ts" foi renomeado para "proxy.ts", com export "proxy".
export async function proxy(request: NextRequest) {
  return atualizarSessao(request)
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens: renovar sessão ali é custo sem ganho.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
