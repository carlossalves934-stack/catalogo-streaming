// @types/jest-axe só amplia os tipos de matcher do Jest (`jest.Matchers`),
// não os do Vitest. Este arquivo replica a mesma extensão para o `expect`
// do Vitest, registrado em tempo de execução por `expect.extend(toHaveNoViolations)`
// em test/setup.tsx.
import 'vitest'

declare module 'vitest' {
  // Declarado diretamente na interface (em vez de herdar de um supertipo vazio)
  // para continuar mesclando com as interfaces do Vitest sem violar
  // @typescript-eslint/no-empty-object-type.
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): unknown
  }
}
