import chalk from 'chalk'
import inquirer from 'inquirer'
import { homedir } from 'os'
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'

const CFG_DIR = join(homedir(), '.tokensave')
const CFG_PATH = join(CFG_DIR, 'config.json')

function loadConfig() {
  if (!existsSync(CFG_PATH)) return {}
  try { return JSON.parse(readFileSync(CFG_PATH, 'utf8')) } catch { return {} }
}

function saveConfig(cfg) {
  mkdirSync(CFG_DIR, { recursive: true })
  writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2), 'utf8')
}

const MODELS = [
  { name: 'claude-sonnet-4-6 (recomendado)', value: 'claude-sonnet-4-6' },
  { name: 'claude-haiku-4-5 (mais rápido, mais barato)', value: 'claude-haiku-4-5' },
  { name: 'gpt-4o', value: 'gpt-4o' },
  { name: 'gpt-4o-mini', value: 'gpt-4o-mini' },
  { name: 'gemini-1.5-pro', value: 'gemini-1.5-pro' },
  { name: 'gemini-1.5-flash', value: 'gemini-1.5-flash' },
]

export async function runConfig() {
  console.log(chalk.bold.cyan('\n⚡ Tokensave Config\n'))

  const cfg = loadConfig()
  const current = (key) => cfg[key] ? chalk.dim(` (atual: ${key === 'anthropic_api_key' || key === 'openai_api_key' || key === 'google_api_key' ? '***' + String(cfg[key]).slice(-4) : cfg[key]})`) : ''

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'O que configurar?',
    choices: [
      { name: `API Key — Anthropic (Claude)${current('anthropic_api_key')}`, value: 'anthropic_api_key' },
      { name: `API Key — OpenAI (GPT)${current('openai_api_key')}`, value: 'openai_api_key' },
      { name: `API Key — Google (Gemini)${current('google_api_key')}`, value: 'google_api_key' },
      { name: `Modelo padrão${current('model')}`, value: 'model' },
      { name: 'Ver configuração atual', value: 'view' },
      { name: 'Sair', value: 'exit' },
    ],
  }])

  if (action === 'exit') return

  if (action === 'view') {
    console.log(chalk.dim(`\n  Config salva em: ${CFG_PATH}\n`))
    const display = { ...cfg }
    for (const k of ['anthropic_api_key', 'openai_api_key', 'google_api_key']) {
      if (display[k]) display[k] = '***' + String(display[k]).slice(-4)
    }
    console.log(JSON.stringify(display, null, 2))
    console.log()
    return
  }

  if (action === 'model') {
    const { model } = await inquirer.prompt([{
      type: 'list',
      name: 'model',
      message: 'Modelo padrão:',
      choices: MODELS,
      default: cfg.model ?? 'claude-sonnet-4-6',
    }])
    cfg.model = model
    saveConfig(cfg)
    console.log(chalk.green(`\n  ✓ Modelo definido: ${model}\n`))
    return
  }

  // API key
  const { key } = await inquirer.prompt([{
    type: 'password',
    name: 'key',
    message: `Cole a API key para ${action.replace('_api_key', '').replace('_', '-')}:`,
    mask: '*',
    validate: (v) => v.trim().length > 8 || 'Key muito curta',
  }])

  cfg[action] = key.trim()
  saveConfig(cfg)
  console.log(chalk.green(`\n  ✓ API key salva em ${CFG_PATH}\n`))
}
