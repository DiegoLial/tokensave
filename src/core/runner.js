import chalk from 'chalk'
import { getConfig, getProjectRoot } from './config.js'
import { validatePipeline } from './validator.js'
import { detectProvider, getApiKey, createClient } from './provider.js'
import { streamResponse } from './streamer.js'
import { compress } from './compressor/index.js'
import { estimateCost, saveRun } from './metrics.js'
import { getModeById } from '../pipeline/modes/index.js'
import { getSystemSuffix } from '../compressor/caveman.js'

function buildUserMessage(pipeline, compressedContext) {
  return [
    `PAPEL: ${pipeline.papel}`,
    `TAREFA: ${pipeline.tarefa}`,
    compressedContext ? `CONTEXTO:\n${compressedContext}` : '',
    pipeline.condicao ? `CONDIÇÃO DE CONCLUSÃO: ${pipeline.condicao}` : '',
  ].filter(Boolean).join('\n\n')
}

/**
 * Execute a pipeline. onChunk is called with each streamed text chunk.
 * Returns { metrics, output } or throws with a user-friendly message.
 */
export async function runPipeline(pipeline, { onChunk = null, silent = false } = {}) {
  const config = getConfig()

  const model        = pipeline.model       ?? config.default_model
  const cavemanLevel = pipeline.cavemanLevel ?? config.default_caveman

  const resolved = { ...pipeline, model, cavemanLevel }

  const { valid, errors } = validatePipeline(resolved)
  if (!valid) {
    const msg = errors.map(e => `✗ ${e}`).join('\n')
    throw Object.assign(new Error(msg), { userFacing: true })
  }

  const mode = getModeById(resolved.modo)
  if (!mode) {
    throw Object.assign(
      new Error(`✗ Modo "${resolved.modo}" não encontrado.`),
      { userFacing: true }
    )
  }

  const provider = detectProvider(model)
  const apiKey   = getApiKey(provider, config)

  if (!apiKey && provider !== 'ollama') {
    throw Object.assign(
      new Error(`✗ Sem API key para ${provider}. Execute: tokensave config`),
      { userFacing: true }
    )
  }

  const { text: compressedContext, originalTokens, compressedTokens, method } =
    await compress(resolved.contexto ?? '')

  const systemPrompt = mode.systemPrompt + '\n\n' + getSystemSuffix(cavemanLevel)
  const userMessage  = buildUserMessage(resolved, compressedContext)

  const inputTokens   = compressedTokens + Math.ceil(userMessage.length / 4)
  const estimatedCost = estimateCost(model, inputTokens, 0)

  if (!silent) {
    const savings = originalTokens > 0
      ? chalk.dim(` (${method}, -${Math.round((1 - compressedTokens / originalTokens) * 100)}%)`)
      : ''
    process.stdout.write(
      `\n${chalk.cyan('⚡')} ${chalk.bold(resolved.modo)}  ${chalk.dim('·')}  ${chalk.dim(model)}  ${chalk.dim('·')}  ~$${estimatedCost.toFixed(4)}\n` +
      `${chalk.dim(resolved.papel)} ${chalk.dim('→')} ${resolved.tarefa}\n` +
      (originalTokens > 0 ? chalk.dim(`   ${compressedTokens}/${originalTokens} tokens${savings}\n`) : '') +
      `\n`
    )
  }

  const client = await createClient(provider, apiKey, config)
  const startMs = Date.now()
  let outputText = ''

  const emit = onChunk ?? ((text) => process.stdout.write(text))

  for await (const chunk of streamResponse({ provider, client, model, systemPrompt, userMessage })) {
    outputText += chunk
    emit(chunk)
  }

  if (!silent) process.stdout.write('\n')

  const durationMs   = Date.now() - startMs
  const outputTokens = Math.ceil(outputText.length / 4)
  const realCost     = estimateCost(model, inputTokens, outputTokens)

  const run = {
    papel:             resolved.papel,
    tarefa:            resolved.tarefa,
    contexto:          resolved.contexto ?? '',
    modo:              resolved.modo,
    condicao:          resolved.condicao ?? '',
    model,
    project_root:      getProjectRoot(),
    tokens_original:   originalTokens,
    tokens_compressed: compressedTokens,
    tokens_output:     outputTokens,
    cost_usd:          realCost,
    duration_ms:       durationMs,
    success:           1,
  }

  saveRun(run)

  if (!silent) {
    process.stdout.write(
      `\n${chalk.green('✓')} ${compressedTokens}/${originalTokens} tokens  ${chalk.dim('·')}  $${realCost.toFixed(4)}  ${chalk.dim('·')}  ${(durationMs / 1000).toFixed(1)}s\n`
    )
  }

  return { metrics: run, output: outputText }
}
