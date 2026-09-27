'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { clienteNavegador } from '@/lib/supabase/browser'
import { removerDaLista, salvarNaLista, type ResultadoDaLista } from '@/lib/watchlist/actions'

export type WatchlistContexto = {
  /** Já sabe se há sessão e, havendo, quais filmes estão salvos. */
  pronto: boolean
  logado: boolean
  email: string | null
  /** Na ordem em que foram salvos. */
  ids: number[]
  /** Salva ou tira da lista. Muda na hora e desfaz se o servidor recusar. */
  alternar: (id: number) => void
  /** Relê a lista do banco (depois de uma importação, por exemplo). */
  recarregar: () => void
  sair: () => Promise<void>
}

const SEM_IDS: number[] = []

/**
 * Valor fora do provider (testes de componente isolado): o mesmo estado de
 * antes da hidratação, com o botão desabilitado e sem saber de nada.
 */
export const ContextoWatchlist = createContext<WatchlistContexto>({
  pronto: false,
  logado: false,
  email: null,
  ids: SEM_IDS,
  alternar: () => {},
  recarregar: () => {},
  sair: async () => {},
})

type Usuario = { id: string; email: string | null }
type Sessao = { user?: { id: string; email?: string } } | null

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [sessaoConhecida, setSessaoConhecida] = useState(false)
  const [ids, setIds] = useState<number[]>(SEM_IDS)
  // De quem são os `ids` carregados. Evita mostrar a lista de uma conta
  // como se fosse da seguinte, na troca de usuário no mesmo navegador.
  const [idsDoUsuario, setIdsDoUsuario] = useState<string | null>(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    const { data } = clienteNavegador().auth.onAuthStateChange((_evento, sessao: Sessao) => {
      // Só guarda o que chegou. Chamar o Supabase de dentro deste callback
      // trava o cliente (aviso da documentação do supabase-js); a leitura
      // da lista fica no efeito abaixo, disparado pela troca de usuário.
      const user = sessao?.user
      setUsuario(user ? { id: user.id, email: user.email ?? null } : null)
      setSessaoConhecida(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const usuarioId = usuario?.id ?? null

  // Guarda o usuário mais recente numa ref (nunca escrita durante a
  // renderização, só neste efeito) para o `alternar` conferir, quando a
  // chamada responder, se ainda é a mesma conta antes de desfazer.
  const usuarioAtualRef = useRef<string | null>(null)
  useEffect(() => {
    usuarioAtualRef.current = usuarioId
  }, [usuarioId])

  useEffect(() => {
    if (!usuarioId) return

    let ativo = true
    // Sem filtro por user_id: o RLS já devolve só as linhas desta sessão.
    clienteNavegador()
      .from('watchlist')
      .select('movie_id')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!ativo) return
        setIds(error || !data ? SEM_IDS : data.map((linha: { movie_id: number }) => linha.movie_id))
        setIdsDoUsuario(usuarioId)
      })

    return () => {
      ativo = false
    }
  }, [usuarioId, versao])

  const alternar = useCallback(
    (id: number) => {
      const jaSalvo = ids.includes(id)
      const dono = usuarioId
      const aplicar = (salvar: boolean) =>
        setIds((atual) =>
          salvar ? (atual.includes(id) ? atual : [...atual, id]) : atual.filter((x) => x !== id),
        )

      aplicar(!jaSalvo)
      const acao: Promise<ResultadoDaLista> = jaSalvo ? removerDaLista(id) : salvarNaLista(id)
      acao.then(
        (resultado) => {
          // Se a conta trocou enquanto a chamada estava pendente, a resposta
          // tardia não pode desfazer na lista da conta seguinte.
          if (usuarioAtualRef.current !== dono) return
          if (!resultado.ok) aplicar(jaSalvo)
        },
        () => {
          if (usuarioAtualRef.current !== dono) return
          aplicar(jaSalvo)
        },
      )
    },
    [ids, usuarioId],
  )

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  const sair = useCallback(async () => {
    await clienteNavegador().auth.signOut()
  }, [])

  const logado = usuarioId !== null
  const pronto = sessaoConhecida && (!logado || idsDoUsuario === usuarioId)

  const valor = useMemo<WatchlistContexto>(
    () => ({
      pronto,
      logado,
      email: usuario?.email ?? null,
      ids: logado ? ids : SEM_IDS,
      alternar,
      recarregar,
      sair,
    }),
    [pronto, logado, usuario?.email, ids, alternar, recarregar, sair],
  )

  return <ContextoWatchlist.Provider value={valor}>{children}</ContextoWatchlist.Provider>
}

export function useWatchlist(): WatchlistContexto {
  return useContext(ContextoWatchlist)
}
