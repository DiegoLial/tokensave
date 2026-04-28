import chalk from 'chalk'
import inquirer from 'inquirer'
import { loadTemplate, saveTemplate } from '../../store/templates.js'

export async function runPipeline(opts = {}) {
  const { buildPipeline } = await import('../../pipeline/builder.js')
  const { runPipeline: execute } = await import('../../core/runner.js')
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
    // Collect context from all sources
    let contexto = opts.contextText || templateDefaults.contexto || ''

    // stdin pipe support
    if (!process.stdin.isTTY) {
      const chunks = []
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      for await (const chunk of process.stdin) chunks.push(chunk)
      if (chunks.length) contexto = chunks.join('') + (contexto ? '\n' + contexto : '')
    }

    // multiple --context-file (Commander stores repeated options as array)
    if (opts.contextFile) {
      const { readFileSync } = await import('fs')
      const files = Array.isArray(opts.contextFile) ? opts.contextFile : [opts.contextFile]
      for (const f of files) {
        try {
          contexto += (contexto ? '\n\n---\n\n' : '') + readFileSync(f.trim(), 'utf8')
        } catch {
          console.error(chalk.red(`✗ Não foi possível ler: ${f}`))
          process.exit(1)
        }
      }
    }

    if (opts.contextUrl) {
      try {
        process.stdout.write(chalk.dim(`  Fetching ${opts.contextUrl} ...\n`))
        const res = await fetch(opts.contextUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const raw = await res.text()
        const clean = raw
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s{3,}/g, '\n\n')
          .trim()
        contexto = (contexto ? contexto + '\n\n---\n\n' : '') + clean
      } catch (err) {
        console.error(chalk.red(`✗ Falha ao buscar URL: ${opts.contextUrl}`))
        process.exit(1)
      }
    }

    pipeline = {
      papel:    opts.papel    || templateDefaults.papel,
      tarefa:   opts.tarefa   || templateDefaults.tarefa,
      contexto,
      modo:     modeOverride  || templateDefaults.modo,
      condicao: opts.condicao || templateDefaults.condicao || '',
      model:    opts.model,
    }
  } else {
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
    if (opts.model) pipeline.model = opts.model
  }

  // Save template if --save-as given
  if (opts.saveAs) {
    saveTemplate(opts.saveAs, { papel: pipeline.papel, modo: pipeline.modo, condicao: pipeline.condicao })
    console.log(chalk.green(`  ✓ Template "${opts.saveAs}" salvo.\n`))
  }

  // --dry-run: show compressed prompt + estimated cost without calling API
  if (opts.dryRun) {
    const { compress } = await import('../../core/compressor/index.js')
    const { estimateCost } = await import('../../core/metrics.js')
    const { getConfig } = await import('../../core/config.js')
    const cfg = getConfig()
    const model = pipeline.model ?? cfg.default_model
    const result = await compress(pipeline.contexto ?? '')
    const cost = estimateCost(model, result.compressedTokens + Math.ceil((pipeline.tarefa?.length ?? 0) / 4), 0)
    console.log(chalk.cyan('\n⚡ dry-run\n'))
    console.log(chalk.dim(`  Tokens originais:  ${result.originalTokens}`))
    console.log(chalk.dim(`  Após compressão:   ${result.compressedTokens} (${result.method})`))
    console.log(chalk.dim(`  Custo estimado:    $${cost.toFixed(4)}`))
    if (result.text) {
      console.log(chalk.dim(`\n  Contexto comprimido:\n`))
      console.log(result.text.slice(0, 500) + (result.text.length > 500 ? '\n...' : ''))
    }
    return
  }

  // Confirm unless --yes or non-interactive
  if (!opts.yes && !nonInteractive) {
    const { confirmed } = await inquirer.prompt([{
      type: 'confirm', name: 'confirmed', message: 'Executar pipeline?', default: true,
    }])
    if (!confirmed) { console.log(chalk.dim('\n  Cancelado.\n')); return }
  }

  try {
    await execute(pipeline)
  } catch (err) {
    if (err.userFacing) {
      console.error(err.message)
      process.exit(1)
    }
    throw err
  }
}
