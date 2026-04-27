import { describe, it, expect } from 'vitest'
import { getCavemanRules, getSystemSuffix, LEVELS } from '../src/compressor/caveman.js'

describe('getCavemanRules', () => {
  it('returns a non-empty string for each valid level', () => {
    for (const level of LEVELS) {
      const rules = getCavemanRules(level)
      expect(typeof rules).toBe('string')
      expect(rules.length).toBeGreaterThan(50)
    }
  })

  it('lite rules mention keeping articles or full sentences', () => {
    const rules = getCavemanRules('lite')
    expect(rules.toLowerCase()).toMatch(/article|full sentence/i)
  })

  it('ultra rules mention abbreviation or arrows', () => {
    const rules = getCavemanRules('ultra')
    expect(rules.toLowerCase()).toMatch(/abbreviat|arrow|→/i)
  })

  it('full is the default level', () => {
    const withDefault = getCavemanRules()
    const withFull = getCavemanRules('full')
    expect(withDefault).toBe(withFull)
  })

  it('getSystemSuffix wraps rules in a section header', () => {
    const suffix = getSystemSuffix('full')
    expect(suffix).toMatch(/RESPONSE STYLE/i)
  })
})
