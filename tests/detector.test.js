import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return { ...actual, existsSync: vi.fn() }
})

import { existsSync } from 'fs'
import { detectTools, getToolInfo, ALL_TOOLS } from '../src/detector/index.js'

describe('detectTools', () => {
  beforeEach(() => { existsSync.mockReset() })

  it('detects Claude Code when ~/.claude/ exists', () => {
    existsSync.mockImplementation((p) => String(p).includes('.claude'))
    const tools = detectTools()
    expect(tools).toContain('claude-code')
  })

  it('detects Cursor when ~/.cursor/ exists', () => {
    existsSync.mockImplementation((p) => String(p).includes('.cursor'))
    const tools = detectTools()
    expect(tools).toContain('cursor')
  })

  it('detects Windsurf when ~/.codeium/windsurf exists', () => {
    existsSync.mockImplementation((p) => String(p).includes('windsurf'))
    const tools = detectTools()
    expect(tools).toContain('windsurf')
  })

  it('returns empty array when nothing found', () => {
    existsSync.mockReturnValue(false)
    const tools = detectTools()
    expect(tools).toEqual([])
  })

  it('detects multiple tools simultaneously', () => {
    existsSync.mockImplementation((p) => String(p).includes('.claude') || String(p).includes('.cursor'))
    const tools = detectTools()
    expect(tools).toContain('claude-code')
    expect(tools).toContain('cursor')
  })
})

describe('getToolInfo', () => {
  it('returns info object for claude-code', () => {
    const info = getToolInfo('claude-code')
    expect(info).toBeDefined()
    expect(info.id).toBe('claude-code')
    expect(info.name).toBeTypeOf('string')
    expect(info.name.length).toBeGreaterThan(0)
  })

  it('returns info object for cursor', () => {
    const info = getToolInfo('cursor')
    expect(info).toBeDefined()
    expect(info.id).toBe('cursor')
  })

  it('returns undefined for unknown tool', () => {
    const info = getToolInfo('unknown-tool')
    expect(info).toBeUndefined()
  })
})

describe('ALL_TOOLS', () => {
  it('is a non-empty array of strings', () => {
    expect(Array.isArray(ALL_TOOLS)).toBe(true)
    expect(ALL_TOOLS.length).toBeGreaterThan(0)
    for (const t of ALL_TOOLS) expect(typeof t).toBe('string')
  })

  it('includes the four known tools', () => {
    expect(ALL_TOOLS).toContain('claude-code')
    expect(ALL_TOOLS).toContain('cursor')
    expect(ALL_TOOLS).toContain('copilot')
    expect(ALL_TOOLS).toContain('windsurf')
  })
})
