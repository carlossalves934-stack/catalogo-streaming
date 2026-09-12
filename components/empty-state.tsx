import type { ReactNode } from 'react'

type Props = {
  title: string
  hint: string
  action?: ReactNode
}

export function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h2 className="text-lg font-medium text-neutral-100">{title}</h2>
      <p className="mt-2 text-sm text-neutral-400">{hint}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
