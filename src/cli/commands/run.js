import chalk from 'chalk'
import inquirer from 'inquirer'
import { loadTemplate, saveTemplate } from '../../store/templates.js'

export async function runPipeline(opts = {}) {
  console.log(chalk.bold.cyan('\n⚡ Tokensave — Pipeline\n'))

  const { buildPipeline } = await import('../../pipeline/builder.js')
  const { executePipeline } = await import('../../pipeline/executor.js')
  const { getModeById, getModeChoices } = await import('../../pipeline/modes/index.js')

  // Resolve mode id from --mode flag
  let modeOverride = opts.mode
  if (modeOverride) {
    const direct = getModeById(modeOverride)
    if (!direct) {
      const match = getModeChoices().find((c) => c.value.includes(modeOverride))
      modeOverride = match?.value ?? modeOverride
    } else {
      modeOverride = direct.id
    }
  }

  // Load template if --template flag given
  let templateDefaults = {}
  if (opts.template) {
    templateDefaults = loadTemplate(opts.template)
    if (!templateDefaults) {
      console.error(chalk.red(`✗ Template "${opts.template}" não encontrado. Use: tokensave templates`))
      process.exit(1)
    }
    console.log(chalk.dim(`  Usando template: ${opts.template}\n`))
    modeOverride = modeOverride || templateDefaults.modo
  }

  // Non-interactive when all required fields provided via flags or template
  const nonInteractive =
    (opts.papel || templateDefaults.papel) &&
    (opts.tarefa || templateDefaults.tarefa) &&
    (modeOverride || templateDefaults.modo)

  let pipeline

  if (nonInteractive) {
    let contexto = opts.contextText || templateDefaults.contexto || ''

    if (opts.contextFile) {
      const { readFileSync } = await import('fs')
      try { contexto = readFileSync(opts.contextFile.trim(), 'utf8') } catch {
        console.error(chalk.red(`✗ Não foi possível ler: ${opts.contextFile}`))
        process.exit(1)
      }
    }

    if (opts.contextUrl) contexto = await fetchUrl(opts.contextUrl)

    pipeline = {
      papel:    opts.papel    || templateDefaults.papel,
      tarefa:   opts.tarefa   || templateDefaults.tarefa,
      contexto,
      modo:     modeOverride  || templateDefaults.modo,
      condicao: opts.condicao || templateDefaults.condicao || '',
    }

    console.log(chalk.dim(`  Papel:    ${pipeline.papel}`))
    console.log(chalk.dim(`  Tarefa:   ${pipeline.tarefa}`))
    console.log(chalk.dim(`  Modo:     ${pipeline.modo}`))
    if (pipeline.condicao) console.log(chalk.dim(`  Condição: ${pipeline.condicao}`))
    console.log()
  } else {
    // Interactive — pre-fill what we have from flags/template
    pipeline = await buildPipeline({
      modeOverride,
      defaults: {
        papel:       opts.papel       || templateDefaults.papel,
        tarefa:      opts.tarefa      || templateDefaults.tarefa,
        condicao:    opts.condicao    || templateDefaults.condicao,
        contextUrl:  opts.contextUrl,
        contextFile: opts.contextFile,
        contextText: opts.contextText,
      },
    })
  }

  // Save template if --save-as given
  if (opts.saveAs) {
    saveTemplate(opts.saveAs, { papel: pipeline.papel, modo: pipeline.modo, condicao: pipeline.condicao })
    console.log(chalk.green(`  ✓ Template "${opts.saveAs}" salvo.\n`))
  }

  // Confirm unless --yes or non-interactive
  if (!opts.yes && !nonInteractive) {
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm', name: 'confirmed', message: 'Executar pipeline?', default: true,
    }])
    if (!confirmed) { console.log(chalk.dim('\n  Cancelado.\n')); return }
  }

  await executePipeline(pipeline, { model: opts.model })
}

async function fetchUrl(url) {
  try {
    console.log(chalk.dim(`  Fetching ${url} ...`))
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    return text
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{3,}/g, '\n\n')
      .trim()
  } catch (err) {
    console.error(chalk.red(`✗ Erro ao buscar URL: ${err.message}`))
    process.exit(1)
  }
}
