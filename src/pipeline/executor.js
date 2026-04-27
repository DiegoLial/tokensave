import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import chalk from 'chalk'
import { getModeById } from './modes/index.js'
import { getSystemSuffix } from '../compressor/caveman.js'
import { compressWithHeadroom } from '../compressor/headroom.js'
import { countTokensEstimate } from '../compressor/native.js'
import { createStore } from '../store/db.js'

const COST_PER_1K = {
  'claude-sonnet-4-6':     { input: 0.003, output: 0.015 },
  'claude-haiku-4-5':      { input: 0.00025, output: 0.00125 },
  'gpt-4o':                { input: 0.005, output: 0.015 },
  'gpt-4o-mini':           { input: 0.00015, output: 0.0006 },
  'gemini-1.5-pro':        { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash':      { input: 0.000075, output: 0.0003 },
}

function resolveModel(provider) {
  const defaults = {
    anthropic: 'claude-sonnet-4-6',
    openai: 'gpt-4o',
    google: 'gemini-1.5-pro',
  }
  return defaults[provider] ?? 'claude-sonnet-4-6'
}

function detectProvider(model) {
  if (model?.startsWith('claude')) return 'anthropic'
  if (model?.startsWith('gpt') || model?.startsWith('o1') || model?.startsWith('o3')) return 'openai'
  if (model?.startsWith('gemini')) return 'google'
  return 'anthropic'
}

function estimateCost(model, tokensIn, tokensOut) {
  const pricing = COST_PER_1K[model]
  if (!pricing) return 0
  return (tokensIn / 1000) * pricing.input + (tokensOut / 1000) * pricing.output
}

function buildMessages(pipeline, mode, compressedContext) {
  const { papel, tarefa, condicao } = pipeline
  const userParts = [
    `PAPEL: ${papel}`,
    `TAREFA: ${tarefa}`,
    compressedContext ? `CONTEXTO:\n${compressedContext}` : '',
    condicao ? `CONDIÇÃO DE CONCLUSÃO: ${condicao}` : '',
  ].filter(Boolean)

  return userParts.join('\n\n')
}

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
  const tokensOut = final.usage?.output_tokens ?? countTokensEstimate(output)
  const tokensIn = final.usage?.input_tokens ?? 0
  return { output, tokensIn, tokensOut }
}

async function executeOpenAI(systemPrompt, userMessage, model, apiKey) {
  const client = new OpenAI({ apiKey })
  let output = ''

  process.stdout.write(chalk.dim('\n▶ '))
  const stream = await client.chat.completions.create({
    model,
    stream: true,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })

  let tokensIn = 0
  let tokensOut = 0
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? ''
    process.stdout.write(delta)
    output += delta
    if (chunk.usage) {
      tokensIn = chunk.usage.prompt_tokens ?? 0
      tokensOut = chunk.usage.completion_tokens ?? 0
    }
  }

  if (!tokensOut) tokensOut = countTokensEstimate(output)
  return { output, tokensIn, tokensOut }
}

async function executeGoogle(systemPrompt, userMessage, model, apiKey) {
  const genai = new GoogleGenerativeAI(apiKey)
  const genModel = genai.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  })

  process.stdout.write(chalk.dim('\n▶ '))
  const result = await genModel.generateContentStream(userMessage)
  let output = ''
  for await (const chunk of result.stream) {
    const text = chunk.text()
    process.stdout.write(text)
    output += text
  }

  const tokensIn = countTokensEstimate(systemPrompt + userMessage)
  const tokensOut = countTokensEstimate(output)
  return { output, tokensIn, tokensOut }
}

export async function executePipeline(pipeline, { model: modelOverride } = {}) {
  // Load config (API keys, preferred model)
  let cfg = {}
  try {
    const { homedir } = await import('os')
    const { join } = await import('path')
    const { readFileSync } = await import('fs')
    const cfgPath = join(homedir(), '.tokensave', 'config.json')
    cfg = JSON.parse(readFileSync(cfgPath, 'utf8'))
  } catch {}

  const model = modelOverride ?? cfg.model ?? 'claude-sonnet-4-6'
  const provider = detectProvider(model)

  const apiKey =
    cfg[`${provider}_api_key`] ??
    process.env.ANTHROPIC_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.GOOGLE_API_KEY

  if (!apiKey) {
    console.error(chalk.red(`\n✗ No API key for ${provider}. Run: tokensave config`))
    process.exit(1)
  }

  const modeObj = getModeById(pipeline.modo)
  if (!modeObj) {
    console.error(chalk.red(`\n✗ Unknown mode: ${pipeline.modo}`))
    process.exit(1)
  }

  // Compress context
  const tokensOriginal = countTokensEstimate(pipeline.contexto || '')
  let compressedContext = pipeline.contexto || ''
  let tokensCompressed = tokensOriginal
  let usedHeadroom = false

  if (pipeline.contexto?.trim()) {
    const compressed = compressWithHeadroom(pipeline.contexto)
    compressedContext = compressed.text
    tokensCompressed = compressed.tokensCompressed
    usedHeadroom = compressed.usedHeadroom
  }

  const systemPrompt = modeObj.systemPrompt + getSystemSuffix(modeObj.cavemanLevel)
  const userMessage = buildMessages(pipeline, modeObj, compressedContext)

  const estimatedCost = estimateCost(model, tokensCompressed + countTokensEstimate(systemPrompt), 800)

  // Pre-execution summary
  console.log(chalk.dim('\n─────────────────────────────────────────'))
  if (pipeline.contexto?.trim()) {
    console.log(`  Tokens originais:    ${chalk.yellow(tokensOriginal)}`)
    console.log(`  Após compressão:     ${chalk.green(tokensCompressed)} (${usedHeadroom ? 'headroom' : 'native'})`)
  }
  console.log(`  Custo estimado:      ${chalk.cyan('~$' + estimatedCost.toFixed(4))}`)
  console.log(`  Modelo:              ${chalk.cyan(model)}`)
  console.log(chalk.dim('─────────────────────────────────────────\n'))

  const start = Date.now()
  let result

  try {
    if (provider === 'anthropic') {
      result = await executeAnthropic(systemPrompt, userMessage, model, apiKey)
    } else if (provider === 'openai') {
      result = await executeOpenAI(systemPrompt, userMessage, model, apiKey)
    } else {
      result = await executeGoogle(systemPrompt, userMessage, model, apiKey)
    }
  } catch (err) {
    console.error(chalk.red(`\n\n✗ API error: ${err.message}`))
    process.exit(1)
  }

  const duration = Date.now() - start
  process.stdout.write('\n')

  const cost = estimateCost(model, result.tokensIn || tokensCompressed, result.tokensOut)

  // Persist metrics
  try {
    const store = createStore()
    store.saveRun({
      papel: pipeline.papel,
      tarefa: pipeline.tarefa,
      contexto: pipeline.contexto || '',
      modo: pipeline.modo,
      condicao: pipeline.condicao || '',
      model,
      tokens_original: tokensOriginal,
      tokens_compressed: tokensCompressed,
      tokens_output: result.tokensOut,
      cost_usd: cost,
      duration_ms: duration,
      success: 1,
    })
    store.close()
  } catch {}

  // Post-execution summary
  const pct = tokensOriginal > 0 ? Math.round((1 - tokensCompressed / tokensOriginal) * 100) : 0
  console.log(chalk.dim('\n─────────────────────────────────────────'))
  console.log(`  Tokens in:  ${result.tokensIn || tokensCompressed}  out: ${result.tokensOut}${pct > 0 ? `  compressão: -${pct}%` : ''}`)
  console.log(`  Custo real: $${cost.toFixed(4)}   Tempo: ${(duration / 1000).toFixed(1)}s`)
  console.log(chalk.dim('─────────────────────────────────────────'))

  return { output: result.output, cost, duration, tokensIn: result.tokensIn, tokensOut: result.tokensOut }
}
