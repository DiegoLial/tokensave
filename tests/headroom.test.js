import { describe, it, expect, vi } from 'vitest'

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}))

import { spawnSync } from 'child_process'
import { compressWithHeadroom } from '../src/compressor/headroom.js'

describe('compressWithHeadroom', () => {
  it('returns compressed text from headroom subprocess', () => {
    spawnSync.mockReturnValue({
      status: 0,
      stdout: Buffer.from('compressed content'),
      stderr: Buffer.from(''),
    })
    const result = compressWithHeadroom('original long content')
    expect(result.text).toBe('compressed content')
    expect(result.usedHeadroom).toBe(true)
  })

  it('falls back to native when headroom exits non-zero', () => {
    spawnSync.mockReturnValue({ status: 1, stdout: Buffer.from(''), stderr: Buffer.from('err') })
    const result = compressWithHeadroom('original content')
    expect(result.usedHeadroom).toBe(false)
    expect(result.text).toBeTruthy()
  })

  it('falls back when headroom is not installed (ENOENT)', () => {
    spawnSync.mockReturnValue({ status: null, error: new Error('ENOENT') })
    const result = compressWithHeadroom('some content')
    expect(result.usedHeadroom).toBe(false)
  })
})
