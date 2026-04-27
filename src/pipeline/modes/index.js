import criarSistema from './criar-sistema.js'
import revisarCodigo from './revisar-codigo.js'
import documentacao from './documentacao.js'
import consultor from './consultor.js'
import swot from './swot.js'
import compare from './compare.js'
import multiPerspectiva from './multi-perspectiva.js'
import parallelLens from './parallel-lens.js'
import pitfalls from './pitfalls.js'
import metricsMode from './metrics-mode.js'
import contextStack from './context-stack.js'

const MODES = [
  criarSistema,
  revisarCodigo,
  documentacao,
  consultor,
  swot,
  compare,
  multiPerspectiva,
  parallelLens,
  pitfalls,
  metricsMode,
  contextStack,
]

export function getModeById(id) {
  return MODES.find((m) => m.id === id)
}

export function getModeChoices() {
  return MODES.map((m, i) => ({
    name: `[${i + 1}] ${m.name} — ${m.description}`,
    value: m.id,
    short: m.name,
  }))
}

export { MODES }
