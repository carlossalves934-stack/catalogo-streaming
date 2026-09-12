'use client'

import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { MovieGrid } from '@/components/movie-grid'
import { MovieCardSkeleton } from '@/components/skeletons'
import { usePreferences } from '@/lib/hooks/use-preferences'
import type { Movie } from '@/lib/tmdb/types'

export function WatchlistView() {
  const { preferences, hydrated } = usePreferences()
  const [filmes, setFilmes] = useState<Movie[]>([])
  const [carregando, setCarregando] = useState(true)

  const ids = preferences.watchlist.join(',')

  // Lista vazia é conhecida de imediato assim que hidrata — não é um estado
  // "carregando" que precise de round-trip à API, então essa condição é
  // resolvida direto no render abaixo em vez de sincronizada via setState
  // dentro do efeito (que só existe para o caso que de fato busca dados).
  //
  // `carregando` nasce true e só é desligado dentro do `.finally` — nunca
  // ligado de volta a true de forma síncrona no corpo do efeito — porque
  // react-hooks/set-state-in-effect proíbe setState direto ali (só abre
  // exceção para setState guardado por uma ref, como em provider-picker.tsx).
  // Uma troca de watchlist enquanto a página já está montada refaz a busca
  // sem reexibir o esqueleto, o que é aceitável: essa tela não promete
  // recarregar visivelmente a cada mudança, só carregar corretamente uma vez.
  useEffect(() => {
    if (!hydrated || ids === '') return

    let ativo = true

    fetch(`/api/filmes?ids=${ids}`)
      .then((resposta) => resposta.json())
      .then((dados: { movies: Movie[] }) => {
        if (ativo) setFilmes(dados.movies)
      })
      .catch(() => {
        if (ativo) setFilmes([])
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [hydrated, ids])

  if (!hydrated || (ids !== '' && carregando)) {
    return (
      <div
        className="flex flex-wrap justify-center gap-6 px-4"
        role="status"
        aria-label="Carregando sua lista"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (filmes.length === 0) {
    // `ids !== ''` distingue "nunca salvou nada" de "salvou, mas nenhum id
    // resolveu no TMDB" (cada filme 404 upstream) — sem essa distinção, a
    // segunda situação mostraria a mesma mensagem da primeira e diria à
    // pessoa que ela nunca guardou nada, quando na verdade guardou.
    if (ids !== '') {
      return (
        <EmptyState
          title="Não foi possível carregar sua lista"
          hint="Os filmes salvos não puderam ser encontrados agora. Tente novamente mais tarde."
        />
      )
    }

    return (
      <EmptyState
        title="Sua lista está vazia"
        hint="Toque na estrela de qualquer filme para guardá-lo aqui e assistir depois."
      />
    )
  }

  // Minha lista não é filtrada por serviço, então `servicos` fica de
  // propósito sem valor — mesmo raciocínio da Busca em app/busca/page.tsx.
  return <MovieGrid movies={filmes} />
}
