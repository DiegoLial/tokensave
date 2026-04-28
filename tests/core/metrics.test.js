import { describe, it, expect } from 'vitest'
import { estimateCost, PRICING } from '../../src/core/metrics.js'

describe('estimateCost', () => {
  it('calculates cost for claude-sonnet-4-6', () => {
    // 1000 input tokens * $0.003/1K + 500 output * $0.015/1K = $0.003 + $0.0075 = $0.0105
    const cost = estimateCost('claude-sonnet-4-6', 1000, 500)
    expect(cost).toBeCloseTo(0.0105, 6)
  })

  it('calculates cost for gpt-4o', () => {
    // 1000 input * $0.0025/1K + 500 output * $0.010/1K = $0.0025 + $0.005 = $0.0075
    const cost = estimateCost('gpt-4o', 1000, 500)
    expect(cost).toBeCloseTo(0.0075, 6)
  })

  it('returns 0 for ollama (local, no cost)', () => {
    expect(estimateCost('ollama/llama3', 1000, 500)).toBe(0)
  })

  it('returns 0 for unknown model', () => {
    expect(estimateCost('unknown-model', 1000, 500)).toBe(0)
  })

  it('has pricing for all standard models', () => {
    const models = [
      'claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5',
      'gpt-4o', 'gpt-4o-mini', 'gemini-1.5-pro', 'gemini-1.5-flash'
    ]
    models.forEach(m => expect(PRICING[m]).toBeDefined())
  })
})
