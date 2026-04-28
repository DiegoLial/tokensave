import chalk from 'chalk'
import inquirer from 'inquirer'
import { getConfig, setGlobalConfig } from '../../core/config.js'

export async function runConfig() {
  const current = getConfig()

  console.log(chalk.cyan('\n⚡ tokensave config\n'))
  console.log(chalk.dim('  Config atual:'))
  console.log(chalk.dim(`  Modelo padrão:   ${current.default_model}`))
  console.log(chalk.dim(`  Caveman padrão:  ${current.default_caveman}`))
  console.log(chalk.dim(`  Anthropic key:   ${current.anthropic_api_key ? '✓ configurada' : '✗ não configurada'}`))
  console.log(chalk.dim(`  OpenAI key:      ${current.openai_api_key    ? '✓ configurada' : '✗ não configurada'}`))
  console.log(chalk.dim(`  Google key:      ${current.google_api_key    ? '✓ configurada' : '✗ não configurada'}`))
  console.log()

  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'anthropic_api_key',
      message: 'Anthropic API Key (Enter para manter):',
      mask: '*',
    },
    {
      type: 'password',
      name: 'openai_api_key',
      message: 'OpenAI API Key (Enter para manter):',
      mask: '*',
    },
    {
      type: 'password',
      name: 'google_api_key',
      message: 'Google API Key (Enter para manter):',
      mask: '*',
    },
    {
      type: 'list',
      name: 'default_model',
      message: 'Modelo padrão:',
      default: current.default_model,
      choices: [
        'claude-sonnet-4-6',
        'claude-opus-4-7',
        'claude-haiku-4-5',
        'gpt-4o',
        'gpt-4o-mini',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
        'ollama/llama3',
      ],
    },
    {
      type: 'list',
      name: 'default_caveman',
      message: 'Caveman level padrão:',
      default: current.default_caveman,
      choices: ['lite', 'full', 'ultra'],
    },
  ])

  for (const [key, value] of Object.entries(answers)) {
    if (value) setGlobalConfig(key, value)
  }

  console.log(chalk.green('\n  ✓ Config salva.\n'))
}
