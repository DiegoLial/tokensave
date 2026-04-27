import chalk from 'chalk'
import { createStore } from '../store/db.js'

function pad(str, len) {
  return String(str).padEnd(len).slice(0, len)
}

function rpad(str, len) {
  return String(str).padStart(len).slice(-len)
}

function formatPct(orig, compressed) {
  if (!orig || orig === 0) return '  —  '
  const pct = Math.round((1 - compressed / orig) * 100)
  return `${pct}%`
}

function formatCost(usd) {
  return '$' + Number(usd).toFixed(4)
}

function formatDuration(ms) {
  return (ms / 1000).toFixed(1) + 's'
}

function renderDash(store) {
  const total = store.getSummary()
  const today = store.getTodaySummary()
  const modeStats = store.getModeStats()
  const recent = store.getRecentRuns(8)

  const topMode = modeStats[0]

  console.clear()
  const W = 62
  const line = '─'.repeat(W)
  const pad2 = (s) => `  ${s}`

  console.log(chalk.bold.cyan('┌─ TOKENSAVE ' + '─'.repeat(W - 12) + '┐'))

  console.log(chalk.cyan('│') + pad2(
    `${chalk.bold('Sessão')}        ${chalk.bold('Pipelines')}   ${chalk.bold('Tokens economizados')}   ${chalk.bold('Custo')}`
  ).padEnd(W + 10) + chalk.cyan('│'))

  console.log(chalk.cyan('│') + '  ' + chalk.dim('─────         ─────────   ───────────────────   ──────') + ' '.repeat(4) + chalk.cyan('│'))

  const todayTokensSaved = today.tokens_original_today - today.tokens_compressed_today
  const totalTokensSaved = total.total_tokens_original - total.total_tokens_compressed
  const todayPct = today.tokens_original_today > 0
    ? Math.round((todayTokensSaved / today.tokens_original_today) * 100)
    : 0
  const totalPct = Math.round(total.avg_compression_pct ?? 0)

  console.log(chalk.cyan('│') + pad2(
    `${'hoje'.padEnd(14)}${String(today.runs_today).padEnd(13)}${(todayTokensSaved + ' (-' + todayPct + '%)').padEnd(21)}${formatCost(today.cost_today)}`
  ).padEnd(W + 10) + chalk.cyan('│'))

  console.log(chalk.cyan('│') + pad2(
    `${'total'.padEnd(14)}${String(total.total_runs).padEnd(13)}${(totalTokensSaved + ' (-' + totalPct + '%)').padEnd(21)}${formatCost(total.total_cost_usd)}`
  ).padEnd(W + 10) + chalk.cyan('│'))

  console.log(chalk.cyan('│') + ' '.repeat(W) + chalk.cyan('│'))

  const topModeStr = topMode ? `Modo mais usado: ${topMode.modo} (${topMode.count} runs)` : 'Sem execuções ainda'
  console.log(chalk.cyan('│') + pad2(chalk.dim(topModeStr)).padEnd(W + 10) + chalk.cyan('│'))

  console.log(chalk.cyan('│') + ' '.repeat(W) + chalk.cyan('│'))
  console.log(chalk.cyan('│') + pad2(chalk.bold('Últimos pipelines')).padEnd(W + 10) + chalk.cyan('│'))
  console.log(chalk.cyan('│') + pad2(chalk.dim('─────────────────')).padEnd(W + 10) + chalk.cyan('│'))

  if (recent.length === 0) {
    console.log(chalk.cyan('│') + pad2(chalk.dim('  Nenhuma execução ainda')).padEnd(W + 10) + chalk.cyan('│'))
  } else {
    for (const run of recent) {
      const time = run.created_at?.slice(11, 16) ?? '--:--'
      const tarefa = pad(run.tarefa, 22)
      const pct = formatPct(run.tokens_original, run.tokens_compressed)
      const dur = formatDuration(run.duration_ms)
      const status = run.success ? chalk.green('✓') : chalk.red('✗')
      const model = run.model?.replace('claude-', '').replace('-sonnet-4-6', 'sonnet').slice(0, 12)
      console.log(chalk.cyan('│') + pad2(
        `${chalk.dim(time)}  ${tarefa}  ${chalk.green('-' + pct)}  ${chalk.dim(dur)}  ${status} ${chalk.dim(model)}`
      ).padEnd(W + 20) + chalk.cyan('│'))
    }
  }

  console.log(chalk.bold.cyan('└' + '─'.repeat(W) + '┘'))
  console.log(chalk.dim('  [r] refresh  [h] histórico  [w] abrir web  [q] sair'))
}

export async function runTUI({ web = false } = {}) {
  const store = createStore()

  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    renderDash(store)
    if (!process.stdin.isTTY) { store.close(); return }
    console.log(chalk.dim('\n  Terminal não suporta modo interativo. Use Ctrl+C para sair.\n'))
    store.close()
    return
  }

  renderDash(store)

  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')

  await new Promise((resolve) => {
    process.stdin.on('data', (key) => {
      if (key === 'q' || key === '') {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        store.close()
        resolve()
      } else if (key === 'r') {
        renderDash(store)
      } else if (key === 'h') {
        const all = store.getRecentRuns(50)
        console.clear()
        console.log(chalk.bold('Histórico completo (últimas 50 execuções)\n'))
        for (const run of all) {
          console.log(
            chalk.dim(run.created_at?.slice(0, 16)) + '  ' +
            pad(run.modo, 18) + '  ' +
            pad(run.tarefa, 30) + '  ' +
            chalk.green('-' + formatPct(run.tokens_original, run.tokens_compressed)) + '  ' +
            formatCost(run.cost_usd)
          )
        }
        console.log(chalk.dim('\n[q] voltar'))
      } else if (key === 'w') {
        import('open').then(({ default: open }) => open('http://localhost:7878'))
          .catch(() => console.log('\n  Abra: http://localhost:7878'))
      }
    })
  })
}
