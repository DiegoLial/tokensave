import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { getCavemanRules } from '../compressor/caveman.js'

const HOME = homedir()
const SETTINGS_PATH = join(HOME, '.claude', 'settings.json')
const CAVEMAN_RULE = getCavemanRules('full')

export function injectClaudeCode() {
  mkdirSync(join(HOME, '.claude'), { recursive: true })

  let settings = {}
  if (existsSync(SETTINGS_PATH)) {
    try { settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')) } catch {}
  }

  // Inject Caveman rules into customInstructions
  const existing = settings.customInstructions ?? ''
  if (!existing.includes('TOKENSAVE')) {
    settings.customInstructions =
      `# TOKENSAVE — Response Compression (injected by tokensave setup)\n${CAVEMAN_RULE}\n\n` +
      existing
  }

  // Inject MCP server for headroom compression
  if (!settings.mcpServers) settings.mcpServers = {}
  if (!settings.mcpServers['tokensave-headroom']) {
    settings.mcpServers['tokensave-headroom'] = {
      command: 'npx',
      args: ['-y', 'tokensave', 'mcp'],
      description: 'tokensave headroom compressor MCP server',
    }
  }

  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8')
  return SETTINGS_PATH
}
