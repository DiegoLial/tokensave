import { Command } from 'commander'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json')

const program = new Command()

program
  .name('tokensave')
  .description('Structured AI pipeline for any tool. One command. 70% less tokens.')
  .version(version)

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
  .option('--mode <mode>',    'Modo de raciocínio (ex: swot, pitfalls)')
  .option('--papel <papel>',  'Papel/persona do AI (modo não-interativo)')
  .option('--tarefa <tarefa>','Tarefa a executar (modo não-interativo)')
  .option('--condicao <c>',   'Condição de saída (modo não-interativo)')
  .option('--context-file <path>', 'Arquivo de contexto (modo não-interativo)')
  .option('--context-url <url>',   'URL de contexto — faz fetch do conteúdo')
  .option('--context-text <text>', 'Texto de contexto inline')
  .option('--model <model>',  'Modelo a usar (ex: gpt-4o, ollama/llama3)')
  .option('--save-as <name>', 'Salva o pipeline como template com este nome')
  .option('--template <name>','Carrega um template salvo previamente')
  .option('--yes',            'Confirma execução sem perguntar')
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
  .command('mcp')
  .description('Inicia o MCP server de compressão (usado pelo Claude Code)')
  .action(async () => {
    const { runMCP } = await import('./commands/mcp.js')
    await runMCP()
  })

program
  .command('templates')
  .description('Lista e gerencia templates de pipeline salvos')
  .option('--delete <name>', 'Remove um template')
  .action(async (opts) => {
    const { runTemplates } = await import('./commands/templates.js')
    await runTemplates(opts)
  })

program
  .command('config')
  .description('Configura API keys e preferências')
  .action(async () => {
    const { runConfig } = await import('./commands/config.js')
    await runConfig()
  })

program.parse()
