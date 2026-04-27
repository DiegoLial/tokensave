import chalk from 'chalk'

export async function runDash({ web = false } = {}) {
  if (web) {
    const { startWebServer } = await import('../../dashboard/web/server.js')
    const port = startWebServer(7878)
    console.log(chalk.bold.cyan(`\n⚡ Tokensave Dashboard → http://localhost:${port}\n`))
    console.log(chalk.dim('  Ctrl+C para parar.\n'))
    try {
      const { default: open } = await import('open')
      await open(`http://localhost:${port}`)
    } catch {}
    // Keep alive
    await new Promise(() => {})
  } else {
    const { runTUI } = await import('../../dashboard/tui.js')
    await runTUI()
  }
}
