import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { getCavemanRules } from '../compressor/caveman.js'

const HOME = homedir()

// Cursor stores settings in AppData on Windows, ~/.config/Cursor on Linux/Mac
function getCursorSettingsPath() {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA ?? join(HOME, 'AppData', 'Roaming'), 'Cursor', 'User', 'settings.json')
  }
  return join(HOME, '.config', 'Cursor', 'User', 'settings.json')
}

const CAVEMAN_RULE = getCavemanRules('full')

export function injectCursor() {
  const settingsPath = getCursorSettingsPath()

  if (!existsSync(settingsPath)) {
    return { skipped: true, reason: 'Cursor settings.json not found', path: settingsPath }
  }

  let settings = {}
  try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')) } catch {}

  const existing = settings['cursor.rules'] ?? ''
  if (!existing.includes('TOKENSAVE')) {
    settings['cursor.rules'] =
      `# TOKENSAVE\n${CAVEMAN_RULE}\n\n` + existing
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8')
  return { path: settingsPath }
}
