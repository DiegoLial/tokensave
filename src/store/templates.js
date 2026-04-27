import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const DIR = join(homedir(), '.tokensave')
const FILE = join(DIR, 'templates.json')

function load() {
  if (!existsSync(FILE)) return {}
  try { return JSON.parse(readFileSync(FILE, 'utf8')) } catch { return {} }
}

function persist(data) {
  mkdirSync(DIR, { recursive: true })
  writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8')
}

export function saveTemplate(name, template) {
  const all = load()
  all[name] = { ...template, savedAt: new Date().toISOString() }
  persist(all)
}

export function loadTemplate(name) {
  const all = load()
  return all[name] ?? null
}

export function listTemplates() {
  return Object.entries(load()).map(([name, t]) => ({ name, ...t }))
}

export function deleteTemplate(name) {
  const all = load()
  if (!all[name]) return false
  delete all[name]
  persist(all)
  return true
}
