'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import { MENSAGEM_SEM_SESSAO, mensagemDeErro } from '@/lib/auth/mensagens'
import { clienteNavegador } from '@/lib/supabase/browser'

type Acao = 'entrar' | 'criar'

const FOCO =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lanterna'
const CAMPO = `w-full rounded-lg border border-contorno bg-sala px-4 py-2.5 text-texto ${FOCO}`

export function EntrarForm({ proximo }: { proximo: string }) {
  const router = useRouter()
  // Qual dos dois botões enviou. Enter num campo envia pelo primeiro botão
  // do formulário (Entrar): o navegador dispara o clique nele antes do submit.
  const acao = useRef<Acao>('entrar')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const dados = new FormData(evento.currentTarget)
    const credenciais = {
      email: String(dados.get('email') ?? ''),
      password: String(dados.get('senha') ?? ''),
    }

    setEnviando(true)
    setErro(null)

    const auth = clienteNavegador().auth
    const { data, error } =
      acao.current === 'criar'
        ? await auth.signUp(credenciais)
        : await auth.signInWithPassword(credenciais)

    if (error || !data.session) {
      setErro(error ? mensagemDeErro(error) : MENSAGEM_SEM_SESSAO)
      setEnviando(false)
      return
    }

    // refresh() faz o servidor renderizar de novo já enxergando o cookie novo.
    router.replace(proximo)
    router.refresh()
  }

  return (
    <form onSubmit={enviar} className="mx-auto flex max-w-sm flex-col gap-4 px-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm text-nevoa">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className={CAMPO} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="text-sm text-nevoa">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className={CAMPO}
        />
      </div>

      {/* Sempre no DOM: a região aria-live precisa existir antes da mensagem para ser anunciada. */}
      <p aria-live="polite" className="min-h-5 text-sm text-texto">
        {erro}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          onClick={() => {
            acao.current = 'entrar'
          }}
          disabled={enviando}
          className={`flex-1 rounded-lg bg-lanterna px-5 py-2.5 font-medium text-noite transition hover:bg-[#ffcb60] disabled:opacity-50 ${FOCO}`}
        >
          Entrar
        </button>
        <button
          type="submit"
          onClick={() => {
            acao.current = 'criar'
          }}
          disabled={enviando}
          className={`flex-1 rounded-lg border border-contorno px-5 py-2.5 font-medium text-texto transition hover:bg-sala disabled:opacity-50 ${FOCO}`}
        >
          Criar conta
        </button>
      </div>
    </form>
  )
}
