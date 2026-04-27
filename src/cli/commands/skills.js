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
  console.log(chalk.dim(`  Modos: ${skill.modos.join(' → ')}`))
  if (skill.chain) console.log(chalk.dim(`  Encadeamento: ${skill.chain.length} etapas`))
  console.log()

  const actions = [
    { name: 'Executar pipeline (modo único)', value: 'run' },
  ]
  if (skill.chain?.length > 1) {
    actions.push({ name: `Executar encadeado (${skill.chain.length} modos em sequência)`, value: 'chain' })
  }
  actions.push({ name: 'Ver context template', value: 'template' })
  actions.push({ name: 'Voltar', value: 'back' })

  const { action } = await inquirer.prompt([{
    type: 'list', name: 'action', message: 'O que fazer?', choices: actions,
  }])

  if (action === 'back') return

  if (action === 'template') {
    if (skill.contextTemplate) {
      console.log(chalk.bold(`\n  Template de contexto — ${skill.name}\n`))
      console.log(chalk.dim(skill.contextTemplate))
    } else {
      console.log(chalk.dim('\n  Este skill não tem template de contexto.\n'))
    }
    return
  }

  const { buildPipeline } = await import('../../pipeline/builder.js')
  const { executePipeline } = await import('../../pipeline/executor.js')

  if (action === 'chain') {
    console.log(chalk.bold.cyan(`\n  Executando ${skill.chain.length} modos em sequência...\n`))

    const base = await buildPipeline({
      modeOverride: skill.chain[0].modo,
      defaults: {
        papel:       skill.papel,
        condicao:    skill.defaultCondicao,
        contextText: skill.contextTemplate,
      },
    })

    let previousOutput = ''
    for (const step of skill.chain) {
      console.log(chalk.bold.cyan(`\n  ${step.label}\n`))

      const stepPipeline = {
        ...base,
        modo: step.modo,
        contexto: previousOutput
          ? `${base.contexto}\n\n---\nSAÍDA DA ETAPA ANTERIOR:\n${previousOutput}`
          : base.contexto,
      }

      const result = await executePipeline(stepPipeline)
      previousOutput = result?.output ?? ''

      const isLast = skill.chain.indexOf(step) === skill.chain.length - 1
      if (!isLast) {
        const { cont } = await inquirer.prompt([{
          type: 'confirm', name: 'cont', message: 'Continuar para próxima etapa?', default: true,
        }])
        if (!cont) break
      }
    }
    return
  }

  // Single mode run
  const { modoId } = await inquirer.prompt([{
    type: 'list',
    name: 'modoId',
    message: 'Modo para esta execução:',
    choices: skill.modos.map((id) => ({ name: id, value: id })),
  }])

  const pipeline = await buildPipeline({
    modeOverride: modoId,
    defaults: {
      papel:       skill.papel,
      condicao:    skill.defaultCondicao,
      contextText: skill.contextTemplate,
    },
  })

  const { confirmed } = await inquirer.prompt([{
    type: 'confirm', name: 'confirmed', message: 'Executar?', default: true,
  }])

  if (confirmed) await executePipeline(pipeline)
}
