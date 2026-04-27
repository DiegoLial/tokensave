import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { getCavemanRules } from '../compressor/caveman.js'

const HOME = homedir()
const WINDSURF_DIR = join(HOME, '.codeium', 'windsurf')
const RULES_PATH = join(WINDSURF_DIR, '.windsurfrc')

const CAVEMAN_RULE = getCavemanRules('full')

export function injectWindsurf() {
  if (!existsSync(WINDSURF_DIR)) {
    return { skipped: true, reason: 'Windsurf not found', path: RULES_PATH }
  }

  let existing = ''
  if (existsSync(RULES_PATH)) {
    try { existing = readFileSync(RULES_PATH, 'utf8') } catch {}
  }

  if (!existing.includes('TOKENSAVE')) {
    const content = `# TOKENSAVE — Response Compression\n${CAVEMAN_RULE}\n\n` + existing
    writeFileSync(RULES_PATH, content, 'utf8')
  }

  return { path: RULES_PATH }
}
