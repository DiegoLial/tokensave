import chalk from 'chalk'
import inquirer from 'inquirer'
import { SKILLS, getSkillChoices } from '../../../skills/index.js'

export async function runSkills() {
  console.log(chalk.bold.cyan('\n⚡ Tokensave Skills — Bundles por Domínio\n'))

  const { skillId } = await inquirer.prompt([{
    type: 'list',
    name: 'skillId',
    message: 'Escolha um bundle:',
    choices: getSkillChoices(),
    pageSize: 12,
  }])

  const skill = SKILLS.find((s) => s.id === skillId)
  if (!skill) return

  console.log(chalk.dim(`\n  Papel: ${skill.papel}`))
  console.log(chalk.dim(`  Modos: ${skill.modos.join(', ')}`))
  console.log(chalk.dim(`  Condição padrão: ${skill.defaultCondicao}\n`))

  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'O que fazer com este skill?',
    choices: [
      { name: 'Executar pipeline com configurações do skill', value: 'run' },
      { name: 'Ver detalhes e modos disponíveis', value: 'info' },
      { name: 'Voltar', value: 'back' },
    ],
  }])

  if (action === 'back') return

  if (action === 'info') {
    const { getModeById } = await import('../../pipeline/modes/index.js')
    console.log(chalk.bold(`\n  ${skill.name}\n`))
    console.log(`  ${skill.description}\n`)
    console.log(`  Papel pré-configurado: ${chalk.cyan(skill.papel)}`)
    console.log(`  Modos disponíveis:`)
    for (const modeId of skill.modos) {
      const m = getModeById(modeId)
      if (m) console.log(`    • ${chalk.cyan(m.name)} — ${m.description}`)
    }
    console.log()
    return
  }

  if (action === 'run') {
    const { modoId } = await inquirer.prompt([{
      type: 'list',
      name: 'modoId',
      message: 'Modo para esta execução:',
      choices: skill.modos.map((id) => ({ name: id, value: id })),
    }])

    const { buildPipeline } = await import('../../pipeline/builder.js')
    const { executePipeline } = await import('../../pipeline/executor.js')

    // Pre-fill papel from skill
    const pipeline = await buildPipeline({ modeOverride: modoId })
    pipeline.papel = pipeline.papel || skill.papel
    if (!pipeline.condicao) pipeline.condicao = skill.defaultCondicao

    const { confirmed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: 'Executar?',
      default: true,
    }])

    if (confirmed) await executePipeline(pipeline)
  }
}
