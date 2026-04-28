import { describe, it, expect, vi } from 'vitest'
import { join } from 'path'
import os from 'os'

// Use a real tmpdir path — computed before any mock
const testDir = join(os.tmpdir(), 'tokensave-test-' + process.pid)

// Mock homedir only (not tmpdir) to isolate config from real ~/.tokensave
vi.mock('os', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, homedir: () => testDir }
})

const { getConfig, setGlobalConfig, setProjectConfig, getProjectRoot } = await import('../../src/core/config.js')

describe('config', () => {
  it('returns defaults when no config file exists', () => {
    const c = getConfig()
    expect(c.default_model).toBe('claude-sonnet-4-6')
    expect(c.default_caveman).toBe('full')
  })

  it('setGlobalConfig persists a key', () => {
    setGlobalConfig('default_model', 'gpt-4o')
    expect(getConfig().default_model).toBe('gpt-4o')
    setGlobalConfig('default_model', 'claude-sonnet-4-6')
  })

  it('project config overrides global', () => {
    setGlobalConfig('default_model', 'gpt-4o')
    setProjectConfig('default_model', 'claude-haiku-4-5')
    expect(getConfig().default_model).toBe('claude-haiku-4-5')
    setProjectConfig('default_model', undefined)
    setGlobalConfig('default_model', 'claude-sonnet-4-6')
  })

  it('env vars are picked up for api keys', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key-env'
    expect(getConfig().anthropic_api_key).toBe('test-key-env')
    delete process.env.ANTHROPIC_API_KEY
  })

  it('getProjectRoot returns a string', () => {
    expect(typeof getProjectRoot()).toBe('string')
  })
})
