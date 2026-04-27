import chalk from 'chalk'
import { detectTools } from '../../detector/index.js'

export async function runSetup() {
  console.log(chalk.bold.cyan('\n⚡ Tokensave Setup\n'))
  console.log(chalk.dim('Detectando AI tools instalados...\n'))

  const detected = detectTools()

  if (detected.length === 0) {
    console.log(chalk.yellow('  Nenhum AI tool detectado automaticamente.\n'))
    const { injectGeneric } = await import('../../injector/generic.js').catch(() => ({ injectGeneric: null }))
    if (injectGeneric) {
      const path = injectGeneric()
      console.log(chalk.dim(`  Gerado .ai-rules.md em ${path}`))
    }
    return
  }

  console.log(`  Detectados: ${detected.map((t) => chalk.cyan(t)).join(', ')}\n`)

  for (const tool of detected) {
    process.stdout.write(`  Injetando configurações em ${chalk.bold(tool)}... `)

    try {
      if (tool === 'claude-code') {
        const { injectClaudeCode } = await import('../../injector/claude-code.js')
        const path = injectClaudeCode()
        console.log(chalk.green('✓') + chalk.dim(` ${path}`))
      } else if (tool === 'cursor') {
        const { injectCursor } = await import('../../injector/cursor.js')
        const result = injectCursor()
        if (result.skipped) {
          console.log(chalk.yellow(`⚠ skipped — ${result.reason}`))
        } else {
          console.log(chalk.green('✓') + chalk.dim(` ${result.path}`))
        }
      } else if (tool === 'copilot') {
        const { injectCopilot } = await import('../../injector/copilot.js')
        const path = injectCopilot()
        console.log(chalk.green('✓') + chalk.dim(` ${path}`))
      } else if (tool === 'windsurf') {
        const { injectWindsurf } = await import('../../injector/windsurf.js')
        const result = injectWindsurf()
        if (result.skipped) {
          console.log(chalk.yellow(`⚠ skipped — ${result.reason}`))
        } else {
          console.log(chalk.green('✓') + chalk.dim(` ${result.path}`))
        }
      }
    } catch (err) {
      console.log(chalk.red('✗') + chalk.dim(` ${err.message}`))
    }
  }

  console.log(chalk.green('\n✓ Setup concluído.\n'))
  console.log(chalk.dim('  Regras Caveman injetadas. Respostas serão mais curtas e técnicas.'))
  console.log(chalk.dim('  Para executar um pipeline: tokensave run\n'))
}
