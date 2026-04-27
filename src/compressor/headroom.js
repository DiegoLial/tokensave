import { spawnSync } from 'child_process'
import { compressNative, countTokensEstimate } from './native.js'

export function compressWithHeadroom(text, { maxTokens = 8000 } = {}) {
  try {
    const result = spawnSync(
      'headroom',
      ['compress', '--stdin', '--format', 'text'],
      { input: text, encoding: 'buffer', timeout: 15000 }
    )

    if (result.status === 0 && result.stdout && result.stdout.length > 0) {
      const compressed = result.stdout.toString('utf8').trim()
      return {
        text: compressed,
        tokensOriginal: countTokensEstimate(text),
        tokensCompressed: countTokensEstimate(compressed),
        usedHeadroom: true,
      }
    }
  } catch {}

  const compressed = compressNative(text, { maxTokens })
  return {
    text: compressed,
    tokensOriginal: countTokensEstimate(text),
    tokensCompressed: countTokensEstimate(compressed),
    usedHeadroom: false,
  }
}
