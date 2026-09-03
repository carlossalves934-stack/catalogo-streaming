// @types/jest-axe só amplia os tipos de matcher do Jest (`jest.Matchers`),
// não os do Vitest. Este arquivo replica a mesma extensão para o `expect`
// do Vitest, registrado em tempo de execução por `expect.extend(toHaveNoViolations)`
// em test/setup.tsx.
import 'vitest'

interface AxeMatchers<R = unknown> {
  toHaveNoViolations(): R
}

declare module 'vitest' {
  interface Assertion<T = unknown> extends AxeMatchers<T> {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
