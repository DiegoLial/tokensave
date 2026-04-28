import { createStore } from '../store/db.js'

export const PRICING = {
  'claude-opus-4-7':    { input: 0.015,    output: 0.075   },
  'claude-sonnet-4-6':  { input: 0.003,    output: 0.015   },
  'claude-haiku-4-5':   { input: 0.00025,  output: 0.00125 },
  'gpt-4o':             { input: 0.0025,   output: 0.010   },
  'gpt-4o-mini':        { input: 0.00015,  output: 0.0006  },
  'gemini-1.5-pro':     { input: 0.00125,  output: 0.005   },
  'gemini-1.5-flash':   { input: 0.000075, output: 0.0003  },
}

export function estimateCost(model, tokensIn, tokensOut) {
  if (model?.startsWith('ollama')) return 0
  const pricing = PRICING[model]
  if (!pricing) return 0
  return (tokensIn / 1000) * pricing.input + (tokensOut / 1000) * pricing.output
}

export function saveRun(run) {
  const store = createStore()
  try { store.saveRun(run) } finally { store.close() }
}

export function getSummary() {
  const store = createStore()
  try { return store.getSummary() } finally { store.close() }
}

export function getTodaySummary() {
  const store = createStore()
  try { return store.getTodaySummary() } finally { store.close() }
}

export function getModeStats() {
  const store = createStore()
  try { return store.getModeStats() } finally { store.close() }
}

export function getRecentRuns(limit = 100) {
  const store = createStore()
  try { return store.getRecentRuns(limit) } finally { store.close() }
}

export function getProjectStats() {
  const store = createStore()
  try { return store.getProjectStats() } finally { store.close() }
}
