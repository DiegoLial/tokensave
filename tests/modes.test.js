import { describe, it, expect } from 'vitest'
import { MODES, getModeById, getModeChoices } from '../src/pipeline/modes/index.js'

const REQUIRED_FIELDS = ['id', 'name', 'description', 'systemPrompt', 'cavemanLevel', 'papeis']

describe('pipeline modes', () => {
  it('exports 11 modes', () => {
    expect(MODES).toHaveLength(11)
  })

  it('each mode has required fields', () => {
    for (const mode of MODES) {
      for (const field of REQUIRED_FIELDS) {
        expect(mode, `mode ${mode.id} missing field ${field}`).toHaveProperty(field)
      }
    }
  })

  it('each systemPrompt is a non-empty string > 100 chars', () => {
    for (const mode of MODES) {
      expect(mode.systemPrompt.length, `${mode.id} systemPrompt too short`).toBeGreaterThan(100)
    }
  })

  it('each cavemanLevel is valid', () => {
    const validLevels = ['lite', 'full', 'ultra']
    for (const mode of MODES) {
      expect(validLevels, `${mode.id} invalid cavemanLevel`).toContain(mode.cavemanLevel)
    }
  })

  it('getModeById returns correct mode', () => {
    const mode = getModeById('swot')
    expect(mode).toBeDefined()
    expect(mode.name).toMatch(/SWOT/i)
  })

  it('each mode has at least one papel suggestion', () => {
    for (const mode of MODES) {
      expect(mode.papeis.length, `${mode.id} has no papeis`).toBeGreaterThan(0)
    }
  })

  it('getModeChoices returns array with name/value/short per mode', () => {
    const choices = getModeChoices()
    expect(choices).toHaveLength(11)
    for (const c of choices) {
      expect(c).toHaveProperty('name')
      expect(c).toHaveProperty('value')
      expect(c).toHaveProperty('short')
    }
  })
})
