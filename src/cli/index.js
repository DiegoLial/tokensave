import { Command } from 'commander'

const program = new Command()

program
  .name('tokensave')
  .description('Structured AI pipeline for any tool. One command. 70% less tokens.')
  .version('0.1.0')

program
  .command('setup')
  .description('Detecta AI tools instalados e injeta configurações nativas')
  .action(async () => {
    const { runSetup } = await import('./commands/setup.js')
    await runSetup()
  })

program
  .command('run')
  .description('Executa o pipeline builder interativo')
  .option('--mode <mode>', 'Pula menu e vai direto para um modo específico')
  .action(async (opts) => {
    const { runPipeline } = await import('./commands/run.js')
    await runPipeline(opts)
  })

program
  .command('dash')
  .description('Abre o dashboard de monitoramento')
  .option('--web', 'Abre dashboard no browser (localhost:7878)')
  .action(async (opts) => {
    const { runDash } = await import('./commands/dash.js')
    await runDash(opts)
  })

program
  .command('skills')
  .description('Menu interativo de bundles de domínio')
  .action(async () => {
    const { runSkills } = await import('./commands/skills.js')
    await runSkills()
  })

program
  .command('stats')
  .description('Resumo rápido de tokens economizados no terminal')
  .action(async () => {
    const { runStats } = await import('./commands/stats.js')
    await runStats()
  })

program
  .command('config')
  .description('Configura API keys e preferências')
  .action(async () => {
    const { runConfig } = await import('./commands/config.js')
    await runConfig()
  })

program.parse()
