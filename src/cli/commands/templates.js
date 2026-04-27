import chalk from 'chalk'
import { listTemplates, deleteTemplate } from '../../store/templates.js'

export async function runTemplates(opts = {}) {
  if (opts.delete) {
    const ok = deleteTemplate(opts.delete)
    console.log(ok
      ? chalk.green(`\n  ✓ Template "${opts.delete}" removido.\n`)
      : chalk.red(`\n  ✗ Template "${opts.delete}" não encontrado.\n`)
    )
    return
  }

  const templates = listTemplates()
  console.log(chalk.bold.cyan('\n⚡ Templates salvos\n'))

  if (templates.length === 0) {
    console.log(chalk.dim('  Nenhum template salvo ainda.'))
    console.log(chalk.dim('  Use: tokensave run --save-as <nome>\n'))
    return
  }

  for (const t of templates) {
    console.log(`  ${chalk.bold(t.name)}`)
    console.log(chalk.dim(`    Papel:   ${t.papel}`))
    console.log(chalk.dim(`    Modo:    ${t.modo}`))
    if (t.condicao) console.log(chalk.dim(`    Condição: ${t.condicao}`))
    console.log(chalk.dim(`    Salvo:   ${t.savedAt?.slice(0, 10) ?? '—'}`))
    console.log()
  }

  console.log(chalk.dim('  Usar template: tokensave run --template <nome>'))
  console.log(chalk.dim('  Remover:       tokensave templates --delete <nome>\n'))
}
