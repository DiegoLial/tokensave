import chalk from 'chalk'
import { createStore } from '../../store/db.js'

export async function runStats() {
  const store = createStore()
  const total = store.getSummary()
  const today = store.getTodaySummary()
  const modes = store.getModeStats()
  const recent = store.getRecentRuns(5)
  store.close()

  const saved = total.total_tokens_original - total.total_tokens_compressed
  const pct = Math.round(total.avg_compression_pct ?? 0)

  console.log(chalk.bold.cyan('\n⚡ Tokensave Stats\n'))

  console.log(`  Total de pipelines:   ${chalk.bold(total.total_runs)}`)
  console.log(`  Tokens economizados:  ${chalk.green(saved.toLocaleString('pt-BR'))} (${chalk.green('-' + pct + '%')})`)
  console.log(`  Custo total:          ${chalk.cyan('$' + Number(total.total_cost_usd).toFixed(4))}`)
  console.log(`  Hoje (pipelines):     ${today.runs_today}`)
  console.log(`  Hoje (custo):         $${Number(today.cost_today).toFixed(4)}\n`)

  if (modes.length > 0) {
    console.log(chalk.dim('  Modos mais usados:'))
    for (const m of modes.slice(0, 5)) {
      console.log(chalk.dim(`    ${m.modo.padEnd(22)} ${m.count} runs`))
    }
    console.log()
  }

  if (recent.length > 0) {
    console.log(chalk.dim('  Últimas execuções:'))
    for (const r of recent) {
      const pctR = r.tokens_original > 0
        ? Math.round((1 - r.tokens_compressed / r.tokens_original) * 100)
        : 0
      const time = r.created_at?.slice(0, 16) ?? ''
      console.log(chalk.dim(`    ${time}  ${r.modo.padEnd(18)}  -${pctR}%  $${Number(r.cost_usd).toFixed(4)}`))
    }
  }

  console.log()
}
