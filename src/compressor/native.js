export function countTokensEstimate(text) {
  return Math.ceil(text.length / 4)
}

export function compressNative(text, { maxTokens = 8000 } = {}) {
  let result = text

  // Strip single-line JS/TS comments (// ...) not inside strings
  result = result.replace(/^((?:[^"'`\n]|"[^"\n]*"|'[^'\n]*'|`[^`\n]*`)*)\/\/[^\n]*/gm, '$1')
  // Strip Python comments (# ...) not inside strings
  result = result.replace(/^((?:[^"'`#\n]|"[^"\n]*"|'[^'\n]*'|`[^`\n]*`)*)\s*#[^\n]*/gm, '$1')

  // Collapse multiple blank lines to one
  result = result.replace(/\n{3,}/g, '\n\n')

  // Trim trailing whitespace per line
  result = result.replace(/[ \t]+$/gm, '')

  // Truncate if too long
  if (countTokensEstimate(result) > maxTokens) {
    const charLimit = maxTokens * 4
    const half = Math.floor(charLimit / 2)
    result =
      result.slice(0, half) +
      '\n\n... [truncated by tokensave] ...\n\n' +
      result.slice(-half)
  }

  return result.trim()
}
