import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { getCavemanRules } from '../compressor/caveman.js'

const CAVEMAN_RULE = getCavemanRules('full')

const INSTRUCTIONS = `# TOKENSAVE — Response Compression

${CAVEMAN_RULE}

ALWAYS ACTIVE. No revert after many turns. Off only if user says "stop caveman" or "normal mode".
`

export function injectCopilot(cwd = process.cwd()) {
  const dir = join(cwd, '.github')
  mkdirSync(dir, { recursive: true })

  const filePath = join(dir, 'copilot-instructions.md')
  let existing = ''
  if (existsSync(filePath)) {
    try { existing = readFileSync(filePath, 'utf8') } catch {}
  }

  if (!existing.includes('TOKENSAVE')) {
    writeFileSync(filePath, INSTRUCTIONS + '\n' + existing, 'utf8')
  }

  return filePath
}
