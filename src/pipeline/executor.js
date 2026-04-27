import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import chalk from 'chalk'
import { execSync } from 'child_process'
import { getModeById } from './modes/index.js'
import { getSystemSuffix } from '../compressor/caveman.js'
import { compressWithHeadroom } from '../compressor/headroom.js'
import { countTokensEstimate } from '../compressor/native.js'
import { createStore } from '../store/db.js'

const COST_PER_1K = {
  'claude-sonnet-4-6':  { input: 0.003,    output: 0.015   },
  'claude-haiku-4-5':   { input: 0.00025,  output: 0.00125 },
  'gpt-4o':             { input: 0.005,    output: 0.015   },
  'gpt-4o-mini':        { input: 0.00015,  output: 0.0006  },
  'gemini-1.5-pro':     { input: 0.00125,  output: 0.005   },
  'gemini-1.5-flash':   { input: 0.000075, output: 0.0003  },
}

function detectProvider(model) {
  if (!model) return 'anthropic'
  if (model.startsWith('ollama/') || model.startsWith('ollama:')) return 'ollama'
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai'
  if (model.startsWith('gemini')) return 'google'
  return 'anthropic'
}

function estimateCost(model, tokensIn, tokensOut) {
  const pricing = COST_PER_1K[model]
  if (!pricing) return 0
  return (tokensIn / 1000) * pricing.input + (tokensOut / 1000) * pricing.output
}

function buildUserMessage(pipeline, compressedContext) {
  return [
    `PAPEL: ${pipeline.papel}`,
    `TAREFA: ${pipeline.tarefa}`,
    compressedContext ? `CONTEXTO:\n${compressedContext}` : '',
    pipeline.condicao ? `CONDIÇÃO DE CONCLUSÃO: ${pipeline.condicao}` : '',
  ].filter(Boolean).join('\n\n')
}

function getProjectRoot() {
  try { return execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: ['pipe','pipe','ignore'] }).trim() } catch {}
  return process.cwd()
}

// Retry with exponential backoff for transient errors (429, 5xx)
async function withRetry(fn, { retries = 3, baseDelay = 1000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const status = err.status ?? err.statusCode ?? 0
      const retryable = status === 429 || status >= 500
      if (!retryable || attempt === retries) throw err
      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(chalk.yellow(`\n  ⚠ ${status} — retentando em ${delay / 1000}s... (${attempt + 1}/${retries})`))
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}

// ── Provider handlers ──────────────────────────────────────────────────────

async function executeAnthropic(systemPrompt, userMessage, model, apiKey) {
  const client = new Anthropic({ apiKey })
  let output = ''
  process.stdout.write(chalk.dim('\n▶ '))

  const stream = client.messages.stream({
    model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      process.stdout.write(event.delta.text)
      output += event.delta.text
    }
  }

  const final = await stream.finalMessage()
  return {
    output,
    tokensIn:  final.usage?.input_tokens  ?? countTokensEstimate(systemPrompt + userMessage),
    tokensOut: final.usage?.output_tokens ?? countTokensEstimate(output),
  }
}

async function executeOpenAI(systemPrompt, userMessage, model, apiKey, baseURL) {
  const client = new OpenAI({ apiKey: apiKey || 'ollama', baseURL })
  let output = ''
  process.stdout.write(chalk.dim('\n▶ '))

  const stream = await client.chat.completions.create({
    model,
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userMessage  },
    ],
  })

  let tokensIn = 0, tokensOut = 0
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? ''
    process.stdout.write(delta)
    output += delta
    if (chunk.usage) {
      tokensIn  = chunk.usage.prompt_tokens     ?? tokensIn
      tokensOut = chunk.usage.completion_tokens ?? tokensOut
    }
  }

  return {
    output,
    tokensIn:  tokensIn  || countTokensEstimate(systemPrompt + userMessage),
    tokensOut: tokensOut || countTokensEstimate(output),
  }
}

async function executeGoogle(systemPrompt, userMessage, model, apiKey) {
  const genai = new GoogleGenerativeAI(apiKey)
  const genModel = genai.getGenerativeModel({ model, systemInstruction: systemPrompt })

  // Count tokens before generating (exact count from API)
  let tokensIn = countTokensEstimate(systemPrompt + userMessage)
  try {
    const ct = await genModel.countTokens(userMessage)
    tokensIn = ct.totalTokens ?? tokensIn
  } catch {}

  process.stdout.write(chalk.dim('\n▶ '))
  const result = await genModel.generateContentStream(userMessage)
  let output = ''
  for await (const chunk of result.stream) {
    const text = chunk.text()
    process.stdout.write(text)
    output += text
  }

  return { output, tokensIn, tokensOut: countTokensEstimate(output) }
}

// ── Main export ────────────────────────────────────────────────────────────

export async function executePipeline(pipeline, { model: modelOverride } = {}) {
  // Load config
  let cfg = {}
  try {
    const { homedir } = await import('os')
    const { join }    = await import('path')
    const { readFileSync } = await import('fs')
    cfg = JSON.parse(readFileSync(join(homedir(), '.tokensave', 'config.json'), 'utf8'))
  } catch {}

  const model    = modelOverride ?? cfg.model ?? 'claude-sonnet-4-6'
  const provider = detectProvider(model)

  // Resolve API key — Ollama needs no key
  let apiKey = null
  let baseURL = undefined
  if (provider === 'ollama') {
    const ollamaModel = model.replace(/^ollama[/:]/i, '')
    baseURL = cfg.ollama_base_url ?? 'http://localhost:11434/v1'
    // executeOpenAI handles apiKey = 'ollama' when null
    return _execute({ provider: 'openai', model: ollamaModel, apiKey: 'ollama', baseURL, cfg, pipeline })
  }

  apiKey =
    cfg[`${provider}_api_key`] ??
    (provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : null) ??
    (provider === 'openai'    ? process.env.OPENAI_API_KEY    : null) ??
    (provider === 'google'    ? process.env.GOOGLE_API_KEY    : null)

  if (!apiKey) {
    console.error(chalk.red(`\n✗ Sem API key para ${provider}. Execute: tokensave config`))
    process.exit(1)
  }

  return _execute({ provider, model, apiKey, baseURL, cfg, pipeline })
}

async function _execute({ provider, model, apiKey, baseURL, pipeline }) {
  const modeObj = getModeById(pipeline.modo)
  if (!modeObj) {
    console.error(chalk.red(`\n✗ Modo desconhecido: ${pipeline.modo}`))
    process.exit(1)
  }

  // Compress context
  const tokensOriginal = countTokensEstimate(pipeline.contexto || '')
  let compressedContext = pipeline.contexto || ''
  let tokensCompressed  = tokensOriginal
  let usedHeadroom      = false

  if (pipeline.contexto?.trim()) {
    const c = compressWithHeadroom(pipeline.contexto)
    compressedContext = c.text
    tokensCompressed  = c.tokensCompressed
    usedHeadroom      = c.usedHeadroom
  }

  const systemPrompt = modeObj.systemPrompt + getSystemSuffix(modeObj.cavemanLevel)
  const userMessage  = buildUserMessage(pipeline, compressedContext)
  const estimatedCost = estimateCost(model, tokensCompressed + countTokensEstimate(systemPrompt), 800)

  // Pre-execution summary
  console.log(chalk.dim('\n─────────────────────────────────────────'))
  if (pipeline.contexto?.trim()) {
    console.log(`  Tokens originais:    ${chalk.yellow(tokensOriginal)}`)
    console.log(`  Após compressão:     ${chalk.green(tokensCompressed)} (${usedHeadroom ? 'headroom' : 'native'})`)
  }
  console.log(`  Custo estimado:      ${chalk.cyan(estimatedCost > 0 ? '~$' + estimatedCost.toFixed(4) : 'local')}`)
  console.log(`  Modelo:              ${chalk.cyan(model)}`)
  console.log(chalk.dim('─────────────────────────────────────────\n'))

  const start = Date.now()
  let result

  try {
    result = await withRetry(async () => {
      if (provider === 'anthropic') return executeAnthropic(systemPrompt, userMessage, model, apiKey)
      if (provider === 'openai')    return executeOpenAI(systemPrompt, userMessage, model, apiKey, baseURL)
      return executeGoogle(systemPrompt, userMessage, model, apiKey)
    })
  } catch (err) {
    console.error(chalk.red(`\n\n✗ API error: ${err.message}`))
    process.exit(1)
  }

  const duration = Date.now() - start
  process.stdout.write('\n')

  const cost = estimateCost(model, result.tokensIn, result.tokensOut)
  const pct  = tokensOriginal > 0 ? Math.round((1 - tokensCompressed / tokensOriginal) * 100) : 0

  // Persist metrics
  try {
    const store = createStore()
    store.saveRun({
      papel:             pipeline.papel,
      tarefa:            pipeline.tarefa,
      contexto:          pipeline.contexto || '',
      modo:              pipeline.modo,
      condicao:          pipeline.condicao || '',
      model,
      project_root:      getProjectRoot(),
      tokens_original:   tokensOriginal,
      tokens_compressed: tokensCompressed,
      tokens_output:     result.tokensOut,
      cost_usd:          cost,
      duration_ms:       duration,
      success:           1,
    })
    store.close()
  } catch {}

  // Post-execution summary
  console.log(chalk.dim('\n─────────────────────────────────────────'))
  console.log(`  Tokens in: ${result.tokensIn}  out: ${result.tokensOut}${pct > 0 ? `  compressão: -${pct}%` : ''}`)
  console.log(`  Custo real: ${cost > 0 ? '$' + cost.toFixed(4) : 'local (sem custo)'}   Tempo: ${(duration / 1000).toFixed(1)}s`)
  console.log(chalk.dim('─────────────────────────────────────────'))

  return { output: result.output, cost, duration, tokensIn: result.tokensIn, tokensOut: result.tokensOut }
}
