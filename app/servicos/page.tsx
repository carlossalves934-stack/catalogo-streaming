import { ProviderGate } from '@/components/provider-gate'
import { getProviders } from '@/lib/tmdb/providers'

// Ruling T9-b: a spec (§7.1) exige que a seleção de serviços seja editável a
// qualquer momento. Esta rota existe só para isso — quem chega aqui já
// passou pelo onboarding e quer trocar os serviços assinados.
//
// Esta rota não lê nenhuma entrada por requisição (sem searchParams, sem
// cookies), então o Next tentaria pré-renderizá-la como estática em build —
// o que exigiria rede e um TMDB_ACCESS_TOKEN válido só para gerar o HTML,
// quebrando `next build` em qualquer ambiente sem token (CI, um clone
// novo). force-dynamic evita essa pré-renderização; o cache de dados de
// getProviders() (revalidate de 7 dias) continua valendo normalmente.
export const dynamic = 'force-dynamic'

export default async function ServicosPage() {
  const provedores = await getProviders()

  // redirectWhenConfigured=false: diferente da Home, aqui a pessoa chegou de
  // propósito para editar a seleção existente. Redirecioná-la de volta para
  // a Home tornaria esta tela impossível de usar.
  return <ProviderGate providers={provedores} redirectWhenConfigured={false} />
}
