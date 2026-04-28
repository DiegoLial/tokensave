import chalk from 'chalk'
import { basename } from 'path'
import { getSummary, getTodaySummary, getModeStats, getProjectStats } from '../../core/metrics.js'

export async function runStats() {
  const total    = getSummary()
  const today    = getTodaySummary()
  const modes    = getModeStats()
  const projects = getProjectStats()

  const savedPct = total.total_tokens_original > 0
    ? Math.round((1 - total.total_tokens_compressed / total.total_tokens_original) * 100)
    : 0

  console.log(`\n${chalk.cyan('⚡')} tokensave stats\n`)

  if (total.total_runs === 0) {
    console.log(chalk.dim('  Nenhuma execução ainda. Use: tokensave run\n'))
    return
  }

  console.log(
    `  ${chalk.bold(total.total_runs)} runs  ${chalk.dim('·')}  ` +
    `${chalk.bold('$' + Number(total.total_cost_usd).toFixed(4))} total  ${chalk.dim('·')}  ` +
    `${chalk.green(savedPct + '% salvo')}\n`
  )

  if (modes.length > 0) {
    const topModes = modes.slice(0, 5).map(m => `${m.modo} (${m.count})`).join('  ')
    console.log(`  ${chalk.dim('Top modos:')}  ${topModes}`)
  }

  if (today.runs_today > 0) {
    console.log(
      `  ${chalk.dim('Hoje:')}        ${today.runs_today} runs  ${chalk.dim('·')}  $${Number(today.cost_today).toFixed(4)}`
    )
  }

  if (projects.length > 1) {
    console.log(`\n  ${chalk.dim('Por projeto:')}`)
    for (const p of projects.slice(0, 6)) {
      const name = p.project === '(global)' ? '(global)' : basename(p.project)
      const pct  = p.tokens_original > 0
        ? Math.round((1 - p.tokens_compressed / p.tokens_original) * 100) : 0
      console.log(chalk.dim(`    ${name.padEnd(24)} ${String(p.runs).padStart(3)} runs  -${pct}%  $${Number(p.cost_usd).toFixed(4)}`))
    }
  }

  console.log()
}
