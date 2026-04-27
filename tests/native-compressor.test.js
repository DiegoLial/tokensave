import { describe, it, expect } from 'vitest'
import { compressNative, countTokensEstimate } from '../src/compressor/native.js'

describe('compressNative', () => {
  it('removes excess blank lines', () => {
    const input = 'line one\n\n\n\nline two'
    const result = compressNative(input)
    expect(result).not.toMatch(/\n{3,}/)
  })

  it('strips single-line JS comments not inside strings', () => {
    const input = `const x = 1 // this is a comment\nconst y = 2`
    const result = compressNative(input)
    expect(result).not.toContain('this is a comment')
    expect(result).toContain('const x = 1')
  })

  it('strips Python single-line comments', () => {
    const input = `x = 1  # python comment\ny = 2`
    const result = compressNative(input)
    expect(result).not.toContain('python comment')
  })

  it('truncates when content exceeds maxTokens', () => {
    const longText = 'word '.repeat(10000)
    const result = compressNative(longText, { maxTokens: 500 })
    expect(countTokensEstimate(result)).toBeLessThanOrEqual(650)
  })
})

describe('countTokensEstimate', () => {
  it('estimates ~4 chars per token', () => {
    const tokens = countTokensEstimate('a'.repeat(400))
    expect(tokens).toBeCloseTo(100, -1)
  })
})
