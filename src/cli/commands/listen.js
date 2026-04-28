import chalk from 'chalk'

export async function startListen() {
  let ws
  let reconnectTimer
  const WS_URL = 'ws://localhost:7878/ws'

  async function connect() {
    try {
      const { default: WS } = await import('ws')
      ws = new WS(WS_URL)
      setupHandlers()
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        console.error(chalk.red('✗ Instale o pacote ws: npm install ws'))
        process.exit(1)
      }
      throw err
    }
  }

  function setupHandlers() {
    ws.on('open', () => {
      console.log(chalk.cyan('\n⚡ tokensave listen') + chalk.dim(` → ${WS_URL}\n`))
      console.log(chalk.dim('  Aguardando jobs do dashboard. Ctrl+C para parar.\n'))
    })

    ws.on('message', async (data) => {
      let msg
      try { msg = JSON.parse(data.toString()) } catch { return }

      if (msg.type !== 'run_request') return

      const { job_id, pipeline } = msg
      console.log(chalk.dim(`\n  Job ${job_id}: ${pipeline.modo} — ${pipeline.tarefa}`))

      const { runPipeline } = await import('../../core/runner.js')

      try {
        await runPipeline(pipeline, {
          silent: true,
          onChunk: (text) => {
            ws.send(JSON.stringify({ type: 'chunk', job_id, text }))
            process.stdout.write(text)
          },
        })
        ws.send(JSON.stringify({ type: 'done', job_id }))
        process.stdout.write('\n')
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', job_id, message: err.message }))
        console.error(chalk.red(`\n  ✗ ${err.message}`))
      }
    })

    ws.on('close', () => {
      console.log(chalk.dim('\n  Conexão encerrada. Reconectando em 3s...'))
      reconnectTimer = setTimeout(connect, 3000)
    })

    ws.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(chalk.dim(`  Dashboard não encontrado em ${WS_URL}. Tentando em 3s...`))
      }
      ws.terminate?.()
    })
  }

  process.on('SIGINT', () => {
    clearTimeout(reconnectTimer)
    ws?.close?.()
    console.log(chalk.dim('\n  Listen encerrado.'))
    process.exit(0)
  })

  await connect()

  // Keep process alive
  await new Promise(() => {})
}
