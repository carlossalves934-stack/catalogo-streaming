import { urlDeEntrar } from './proximo'

/**
 * Navegação de página inteira, não router.push: o botão de salvar aparece
 * em componentes que os testes montam sem o roteador do Next, e ir para o
 * login não tem estado da página a preservar.
 */
export function irParaEntrar(): void {
  window.location.assign(urlDeEntrar(window.location.pathname + window.location.search))
}
