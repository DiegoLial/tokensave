import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { execSync } from 'child_process'

const CONFIG_DIR  = join(homedir(), '.tokensave')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

function readRaw() {
  if (!existsSync(CONFIG_PATH)) return {}
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) } catch { return {} }
}

function writeRaw(data) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export function getProjectRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
  } catch {}
  return process.cwd()
}

export function getConfig() {
  const raw  = readRaw()
  const root = getProjectRoot()
  const proj = raw.projects?.[root] ?? {}
  return {
    anthropic_api_key: raw.anthropic_api_key ?? process.env.ANTHROPIC_API_KEY ?? '',
    openai_api_key:    raw.openai_api_key    ?? process.env.OPENAI_API_KEY    ?? '',
    google_api_key:    raw.google_api_key    ?? process.env.GOOGLE_API_KEY    ?? '',
    default_model:     proj.default_model    ?? raw.default_model    ?? 'claude-sonnet-4-6',
    default_caveman:   proj.default_caveman  ?? raw.default_caveman  ?? 'full',
    default_papel:     proj.default_papel    ?? raw.default_papel    ?? '',
    ollama_base_url:   raw.ollama_base_url   ?? 'http://localhost:11434/v1',
  }
}

export function setGlobalConfig(key, value) {
  const raw = readRaw()
  raw[key] = value
  writeRaw(raw)
}

export function setProjectConfig(key, value) {
  const raw  = readRaw()
  const root = getProjectRoot()
  if (!raw.projects)       raw.projects = {}
  if (!raw.projects[root]) raw.projects[root] = {}
  raw.projects[root][key] = value
  writeRaw(raw)
}

export function getAllConfig() {
  return readRaw()
}
