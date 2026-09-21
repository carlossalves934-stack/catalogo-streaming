import type { ReactNode } from 'react'

type Props = {
  title: string
  hint: string
  action?: ReactNode
}

export function EmptyState({ title, hint, action }: Props) {
  return (
    // role="status" anuncia o estado vazio para leitores de tela: trocar um
    // filtro é navegação client-side, sem recarregar a página, e sem isso
    // quem usa leitor de tela não recebe nenhum aviso de que a lista zerou.
    <div className="mx-auto max-w-md px-4 py-16 text-center" role="status">
      <h2 className="text-lg font-medium text-texto">{title}</h2>
      <p className="mt-2 text-sm text-nevoa">{hint}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
