import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return { ...actual, existsSync: vi.fn() }
})

import { existsSync } from 'fs'
import { detectTools } from '../src/detector/index.js'

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
