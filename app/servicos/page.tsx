import { ProviderGate } from '@/components/provider-gate'
import { getProviders } from '@/lib/tmdb/providers'

// Ruling T9-b: a spec (§7.1) exige que a seleção de serviços seja editável a
// qualquer momento. Esta rota existe só para isso — quem chega aqui já
// passou pelo onboarding e quer trocar os serviços assinados.
//
// Página sempre renderizada por requisição: a experiência inteira depende de
// preferências salvas no localStorage do navegador, então não há nada de
// útil a pré-gerar em build. Isso também evita que `next build` precise de
// um TMDB_ACCESS_TOKEN válido só para pré-renderizar esta rota.
export const dynamic = 'force-dynamic'

export default async function ServicosPage() {
  const provedores = await getProviders()

  // redirectWhenConfigured=false: diferente da Home, aqui a pessoa chegou de
  // propósito para editar a seleção existente. Redirecioná-la de volta para
  // a Home tornaria esta tela impossível de usar.
  return <ProviderGate providers={provedores} redirectWhenConfigured={false} />
}
