import { describe, it, expect, vi } from 'vitest'

vi.mock('../../src/core/streamer.js', () => ({
  streamResponse: async function* () {
    yield 'Hello '
    yield 'world'
  }
}))

vi.mock('../../src/core/provider.js', () => ({
  detectProvider: () => 'anthropic',
  getApiKey:      () => 'test-key',
  createClient:   () => ({}),
}))

vi.mock('../../src/core/metrics.js', () => ({
  estimateCost: () => 0.001,
  saveRun:      vi.fn(),
}))

const { runPipeline } = await import('../../src/core/runner.js')

describe('runPipeline', () => {
  const base = {
    papel: 'Engineer',
    tarefa: 'review code',
    modo: 'revisar-codigo',
    model: 'claude-sonnet-4-6',
  }

  it('streams output and returns metrics', async () => {
    const chunks = []
    const result = await runPipeline(base, { silent: true, onChunk: (t) => chunks.push(t) })
    expect(chunks.join('')).toBe('Hello world')
    expect(result.metrics.papel).toBe('Engineer')
    expect(result.output).toBe('Hello world')
  })

  it('throws userFacing error for missing papel', async () => {
    await expect(
      runPipeline({ ...base, papel: '' }, { silent: true })
    ).rejects.toMatchObject({ userFacing: true })
  })

  it('throws userFacing error for invalid modo', async () => {
    await expect(
      runPipeline({ ...base, modo: 'not-a-mode' }, { silent: true })
    ).rejects.toMatchObject({ userFacing: true })
  })
})
