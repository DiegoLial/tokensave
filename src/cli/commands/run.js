import chalk from 'chalk'
import inquirer from 'inquirer'

export async function runPipeline({ mode: modeArg } = {}) {
  console.log(chalk.bold.cyan('\n⚡ Tokensave — Pipeline Builder\n'))

  const { buildPipeline } = await import('../../pipeline/builder.js')
  const { executePipeline } = await import('../../pipeline/executor.js')

  let modeOverride = modeArg
  // Support --mode by id or partial match
  if (modeArg) {
    const { getModeById, getModeChoices } = await import('../../pipeline/modes/index.js')
    const direct = getModeById(modeArg)
    if (!direct) {
      const choices = getModeChoices()
      const match = choices.find((c) => c.value.includes(modeArg))
      modeOverride = match?.value ?? modeArg
    } else {
      modeOverride = direct.id
    }
  }

  const pipeline = await buildPipeline({ modeOverride })

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: 'Executar pipeline?',
    default: true,
  }])

  if (!confirmed) {
    console.log(chalk.dim('\n  Cancelado.\n'))
    return
  }

  await executePipeline(pipeline)
}
