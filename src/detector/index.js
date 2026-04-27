import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const HOME = homedir()

export function detectTools() {
  const found = []

  if (existsSync(join(HOME, '.claude'))) found.push('claude-code')
  if (existsSync(join(HOME, '.cursor'))) found.push('cursor')
  if (existsSync(join(HOME, '.codeium', 'windsurf'))) found.push('windsurf')

  // Copilot: check for VS Code extension directory
  const vsCodeExtDir = join(HOME, '.vscode', 'extensions')
  if (existsSync(vsCodeExtDir)) {
    try {
      const entries = readdirSync(vsCodeExtDir)
      if (entries.some((d) => d.startsWith('github.copilot'))) {
        found.push('copilot')
      }
    } catch {}
  }

  return found
}

export function getToolInfo(id) {
  const tools = {
    'claude-code': { id: 'claude-code', name: 'Claude Code', path: join(HOME, '.claude') },
    'cursor':      { id: 'cursor',      name: 'Cursor',      path: join(HOME, '.cursor') },
    'copilot':     { id: 'copilot',     name: 'GitHub Copilot', path: join(HOME, '.vscode', 'extensions') },
    'windsurf':    { id: 'windsurf',    name: 'Windsurf',    path: join(HOME, '.codeium', 'windsurf') },
  }
  return tools[id]
}

export const ALL_TOOLS = ['claude-code', 'cursor', 'copilot', 'windsurf']
