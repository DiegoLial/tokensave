import { compressWithHeadroom } from '../../compressor/headroom.js'
import { compressNative, countTokensEstimate } from '../../compressor/native.js'

/**
 * Always returns { text, originalTokens, compressedTokens, method }
 */
export async function compress(text, { maxTokens = 8000 } = {}) {
  if (!text?.trim()) return { text: text ?? '', originalTokens: 0, compressedTokens: 0, method: 'none' }

  const originalTokens = countTokensEstimate(text)

  const result = compressWithHeadroom(text, { maxTokens })
  const method = result.usedHeadroom ? 'headroom' : 'native'
  return {
    text:             result.text,
    originalTokens,
    compressedTokens: result.tokensCompressed,
    method,
  }
}

export { countTokensEstimate }
