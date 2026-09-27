import { redirect } from 'next/navigation'
import { EntrarForm } from '@/components/entrar-form'
import { proximoSeguro } from '@/lib/auth/proximo'
import { criarClienteServidor, idDoUsuario } from '@/lib/supabase/server'

type Props = {
  searchParams: Promise<{ proximo?: string | string[] }>
}

export default async function EntrarPage({ searchParams }: Props) {
  const proximo = proximoSeguro((await searchParams).proximo)

  // Quem já está logado não tem o que fazer aqui.
  if (await idDoUsuario(await criarClienteServidor())) redirect(proximo)

  return (
    <div className="mx-auto max-w-7xl py-12">
      <h1 className="titulo px-4 pb-2 text-center text-2xl font-semibold text-texto sm:text-3xl">
        Entrar
      </h1>
      <p className="mx-auto max-w-sm px-4 pb-8 text-center text-sm text-nevoa">
        Sua lista de filmes fica salva na sua conta e aparece em qualquer navegador.
      </p>
      <EntrarForm proximo={proximo} />
    </div>
  )
}
