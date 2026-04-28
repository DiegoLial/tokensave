# tokensave v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor tokensave into a clean-architecture platform with a WebSocket dashboard cockpit, per-project config, and polished terminal output.

**Architecture:** Core modules replace the monolithic executor; a WebSocket layer connects dashboard to terminal execution; config supports per-project overrides with global fallback.

**Tech Stack:** Node.js ESM, Hono + @hono/node-server, ws (WebSocket), better-sqlite3, Anthropic/OpenAI/Google SDKs, Inquirer, Chalk, Vitest.

---

## Phase 1 — Core Modules

---

### Task 1: src/core/config.js

**Files:**
- Create: `src/core/config.js`
- Create: `tests/core/config.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/core/config.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// We mock homedir to use a temp dir so tests don't touch real config
vi.mock('os', () => ({ homedir: () => join(tmpdir(), 'tokensave-test-' + process.pid) }))

import { getConfig, setGlobalConfig, setProjectConfig, getProjectRoot } from '../../src/core/config.js'

describe('config', () => {
  it('returns defaults when no config file exists', () => {
    const c = getConfig()
    expect(c.default_model).toBe('claude-sonnet-4-6')
    expect(c.default_caveman).toBe('full')
  })

  it('setGlobalConfig persists a key', () => {
    setGlobalConfig('default_model', 'gpt-4o')
    expect(getConfig().default_model).toBe('gpt-4o')
  })

  it('project config overrides global', () => {
    setGlobalConfig('default_model', 'gpt-4o')
    const root = getProjectRoot()
    setProjectConfig('default_model', 'claude-haiku-4-5')
    expect(getConfig().default_model).toBe('claude-haiku-4-5')
  })

  it('env vars are picked up for api keys', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    expect(getConfig().anthropic_api_key).toBe('test-key')
    delete process.env.ANTHROPIC_API_KEY
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**
```bash
npm test -- tests/core/config.test.js
```
Expected: `Cannot find module '../../src/core/config.js'`

- [ ] **Step 3: Create `src/core/config.js`**

```js
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { execSync } from 'child_process'

const CONFIG_DIR  = join(homedir(), '.tokensave')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

function readRaw() {
  if (!existsSync(CONFIG_PATH)) return {}
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) } catch { return {} }
}

function writeRaw(data) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8')
}

export function getProjectRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
  } catch {}
  return process.cwd()
}

export function getConfig() {
  const raw  = readRaw()
  const root = getProjectRoot()
  const proj = raw.projects?.[root] ?? {}
  return {
    anthropic_api_key: raw.anthropic_api_key ?? process.env.ANTHROPIC_API_KEY ?? '',
    openai_api_key:    raw.openai_api_key    ?? process.env.OPENAI_API_KEY    ?? '',
    google_api_key:    raw.google_api_key    ?? process.env.GOOGLE_API_KEY    ?? '',
    default_model:     proj.default_model    ?? raw.default_model    ?? 'claude-sonnet-4-6',
    default_caveman:   proj.default_caveman  ?? raw.default_caveman  ?? 'full',
    default_papel:     proj.default_papel    ?? raw.default_papel    ?? '',
    ollama_base_url:   raw.ollama_base_url   ?? 'http://localhost:11434/v1',
  }
}

export function setGlobalConfig(key, value) {
  const raw = readRaw()
  raw[key] = value
  writeRaw(raw)
}

export function setProjectConfig(key, value) {
  const raw  = readRaw()
  const root = getProjectRoot()
  if (!raw.projects)       raw.projects = {}
  if (!raw.projects[root]) raw.projects[root] = {}
  raw.projects[root][key] = value
  writeRaw(raw)
}

export function getAllConfig() {
  return readRaw()
}
```

- [ ] **Step 4: Run test — expect PASS**
```bash
npm test -- tests/core/config.test.js
```

- [ ] **Step 5: Commit**
```bash
git add src/core/config.js tests/core/config.test.js
git commit -m "feat(core): add config module with per-project support"
```

---

### Task 2: src/core/validator.js

**Files:**
- Create: `src/core/validator.js`
- Create: `tests/core/validator.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/core/validator.test.js
import { describe, it, expect } from 'vitest'
import { validatePipeline, VALID_MODELS } from '../../src/core/validator.js'

describe('validatePipeline', () => {
  const base = { papel: 'Engineer', tarefa: 'review code', modo: 'revisar-codigo' }

  it('passes a valid pipeline', () => {
    const r = validatePipeline(base)
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('fails when papel is missing', () => {
    const r = validatePipeline({ ...base, papel: '' })
    expect(r.valid).toBe(false)
    expect(r.errors[0]).toMatch(/papel/)
  })

  it('fails when tarefa is missing', () => {
    const r = validatePipeline({ ...base, tarefa: '' })
    expect(r.valid).toBe(false)
    expect(r.errors[0]).toMatch(/tarefa/)
  })

  it('fails when modo is invalid', () => {
    const r = validatePipeline({ ...base, modo: 'not-a-mode' })
    expect(r.valid).toBe(false)
    expect(r.errors[0]).toMatch(/modo/)
  })

  it('fails on unknown explicit model', () => {
    const r = validatePipeline({ ...base, model: 'unknown-model-xyz' })
    expect(r.valid).toBe(false)
    expect(r.errors[0]).toMatch(/model/)
  })

  it('allows ollama/* models', () => {
    const r = validatePipeline({ ...base, model: 'ollama/llama3' })
    expect(r.valid).toBe(true)
  })

  it('collects multiple errors', () => {
    const r = validatePipeline({ papel: '', tarefa: '', modo: 'bad' })
    expect(r.errors.length).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**
```bash
npm test -- tests/core/validator.test.js
```

- [ ] **Step 3: Create `src/core/validator.js`**

```js
import { MODES } from '../pipeline/modes/index.js'

export const VALID_MODELS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'gpt-4o',
  'gpt-4o-mini',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

const VALID_MODE_IDS = new Set(MODES.map(m => m.id))

export function validatePipeline(pipeline) {
  const errors = []

  if (!pipeline.papel?.trim())
    errors.push('papel é obrigatório')

  if (!pipeline.tarefa?.trim())
    errors.push('tarefa é obrigatória')

  if (!pipeline.modo?.trim())
    errors.push('modo é obrigatório')
  else if (!VALID_MODE_IDS.has(pipeline.modo))
    errors.push(`modo "${pipeline.modo}" inválido. Use: ${[...VALID_MODE_IDS].join(', ')}`)

  if (pipeline.model && !pipeline.model.startsWith('ollama/') && !pipeline.model.startsWith('ollama:')) {
    if (!VALID_MODELS.includes(pipeline.model))
      errors.push(`model "${pipeline.model}" não reconhecido. Modelos válidos: ${VALID_MODELS.join(', ')} (ou ollama/<nome>)`)
  }

  return { valid: errors.length === 0, errors }
}
```

- [ ] **Step 4: Run test — expect PASS**
```bash
npm test -- tests/core/validator.test.js
```

- [ ] **Step 5: Commit**
```bash
git add src/core/validator.js tests/core/validator.test.js
git commit -m "feat(core): add validator module with pipeline and model validation"
```

---

### Task 3: src/core/provider.js

**Files:**
- Create: `src/core/provider.js`
- Create: `tests/core/provider.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/core/provider.test.js
import { describe, it, expect } from 'vitest'
import { detectProvider, getApiKey } from '../../src/core/provider.js'

describe('detectProvider', () => {
  it('detects anthropic from claude- prefix', () => {
    expect(detectProvider('claude-sonnet-4-6')).toBe('anthropic')
    expect(detectProvider('claude-opus-4-7')).toBe('anthropic')
  })
  it('detects openai from gpt- prefix', () => {
    expect(detectProvider('gpt-4o')).toBe('openai')
    expect(detectProvider('gpt-4o-mini')).toBe('openai')
  })
  it('detects openai from o1/o3 prefix', () => {
    expect(detectProvider('o1-preview')).toBe('openai')
    expect(detectProvider('o3-mini')).toBe('openai')
  })
  it('detects google from gemini- prefix', () => {
    expect(detectProvider('gemini-1.5-pro')).toBe('google')
  })
  it('detects ollama from ollama/ prefix', () => {
    expect(detectProvider('ollama/llama3')).toBe('ollama')
    expect(detectProvider('ollama:mistral')).toBe('ollama')
  })
  it('defaults to anthropic for unknown', () => {
    expect(detectProvider(undefined)).toBe('anthropic')
  })
})

describe('getApiKey', () => {
  it('returns empty string when key not set', () => {
    const backup = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    expect(getApiKey('anthropic', {})).toBe('')
    if (backup) process.env.ANTHROPIC_API_KEY = backup
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**
```bash
npm test -- tests/core/provider.test.js
```

- [ ] **Step 3: Create `src/core/provider.js`**

```js
export function detectProvider(model) {
  if (!model) return 'anthropic'
  if (model.startsWith('ollama/') || model.startsWith('ollama:')) return 'ollama'
  if (model.startsWith('claude'))  return 'anthropic'
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai'
  if (model.startsWith('gemini'))  return 'google'
  return 'anthropic'
}

export function getApiKey(provider, config) {
  switch (provider) {
    case 'anthropic': return config.anthropic_api_key ?? process.env.ANTHROPIC_API_KEY ?? ''
    case 'openai':    return config.openai_api_key    ?? process.env.OPENAI_API_KEY    ?? ''
    case 'google':    return config.google_api_key    ?? process.env.GOOGLE_API_KEY    ?? ''
    case 'ollama':    return 'ollama'
    default:          return ''
  }
}

export async function createClient(provider, apiKey, config) {
  switch (provider) {
    case 'anthropic': {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      return new Anthropic({ apiKey })
    }
    case 'openai': {
      const { default: OpenAI } = await import('openai')
      return new OpenAI({ apiKey })
    }
    case 'google': {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      return new GoogleGenerativeAI(apiKey)
    }
    case 'ollama': {
      const { default: OpenAI } = await import('openai')
      return new OpenAI({ apiKey: 'ollama', baseURL: config.ollama_base_url ?? 'http://localhost:11434/v1' })
    }
  }
}
```

- [ ] **Step 4: Run test — expect PASS**
```bash
npm test -- tests/core/provider.test.js
```

- [ ] **Step 5: Commit**
```bash
git add src/core/provider.js tests/core/provider.test.js
git commit -m "feat(core): add provider detection and client factory"
```

---

### Task 4: src/core/metrics.js

**Files:**
- Create: `src/core/metrics.js`
- Create: `tests/core/metrics.test.js`

- [ ] **Step 1: Write failing tests**

```js
// tests/core/metrics.test.js
import { describe, it, expect } from 'vitest'
import { estimateCost, PRICING } from '../../src/core/metrics.js'

describe('estimateCost', () => {
  it('calculates cost for claude-sonnet-4-6', () => {
    // 1000 input tokens * $0.003/1K + 500 output * $0.015/1K = $0.003 + $0.0075 = $0.0105
    const cost = estimateCost('claude-sonnet-4-6', 1000, 500)
    expect(cost).toBeCloseTo(0.0105, 6)
  })

  it('calculates cost for gpt-4o', () => {
    // 1000 input * $0.0025/1K + 500 output * $0.010/1K = $0.0025 + $0.005 = $0.0075
    const cost = estimateCost('gpt-4o', 1000, 500)
    expect(cost).toBeCloseTo(0.0075, 6)
  })

  it('returns 0 for ollama (local, no cost)', () => {
    expect(estimateCost('ollama/llama3', 1000, 500)).toBe(0)
  })

  it('returns 0 for unknown model', () => {
    expect(estimateCost('unknown-model', 1000, 500)).toBe(0)
  })

  it('has pricing for all standard models', () => {
    const models = ['claude-opus-4-7','claude-sonnet-4-6','claude-haiku-4-5','gpt-4o','gpt-4o-mini','gemini-1.5-pro','gemini-1.5-flash']
    models.forEach(m => expect(PRICING[m]).toBeDefined())
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**
```bash
npm test -- tests/core/metrics.test.js
```

- [ ] **Step 3: Create `src/core/metrics.js`**

```js
import { createStore } from '../store/db.js'

export const PRICING = {
  'claude-opus-4-7':    { input: 0.015,    output: 0.075   },
  'claude-sonnet-4-6':  { input: 0.003,    output: 0.015   },
  'claude-haiku-4-5':   { input: 0.00025,  output: 0.00125 },
  'gpt-4o':             { input: 0.0025,   output: 0.010   },
  'gpt-4o-mini':        { input: 0.00015,  output: 0.0006  },
  'gemini-1.5-pro':     { input: 0.00125,  output: 0.005   },
  'gemini-1.5-flash':   { input: 0.000075, output: 0.0003  },
}

export function estimateCost(model, tokensIn, tokensOut) {
  const pricing = PRICING[model]
  if (!pricing) return 0
  return (tokensIn / 1000) * pricing.input + (tokensOut / 1000) * pricing.output
}

export function saveRun(run) {
  const store = createStore()
  try { store.saveRun(run) } finally { store.close() }
}

export function getSummary() {
  const store = createStore()
  try { return store.getSummary() } finally { store.close() }
}

export function getTodaySummary() {
  const store = createStore()
  try { return store.getTodaySummary() } finally { store.close() }
}

export function getModeStats() {
  const store = createStore()
  try { return store.getModeStats() } finally { store.close() }
}

export function getRecentRuns(limit = 100) {
  const store = createStore()
  try { return store.getRecentRuns(limit) } finally { store.close() }
}
```

- [ ] **Step 4: Run test — expect PASS**
```bash
npm test -- tests/core/metrics.test.js
```

- [ ] **Step 5: Commit**
```bash
git add src/core/metrics.js tests/core/metrics.test.js
git commit -m "feat(core): add metrics module with updated 2025 pricing table"
```

---

### Task 5: src/core/compressor/index.js (facade)

**Files:**
- Create: `src/core/compressor/index.js`

- [ ] **Step 1: Create facade**

```js
// src/core/compressor/index.js
import { compressWithHeadroom } from '../../compressor/headroom.js'
import { compressNative, countTokensEstimate } from '../../compressor/native.js'

/**
 * Always returns { text, originalTokens, compressedTokens, method }
 */
export async function compress(text, { maxTokens = 8000 } = {}) {
  if (!text) return { text: '', originalTokens: 0, compressedTokens: 0, method: 'none' }

  const originalTokens = countTokensEstimate(text)

  const headroom = compressWithHeadroom(text)
  if (headroom !== null) {
    const compressedTokens = countTokensEstimate(headroom)
    return { text: headroom, originalTokens, compressedTokens, method: 'headroom' }
  }

  const native = compressNative(text, maxTokens)
  const compressedTokens = countTokensEstimate(native)
  return { text: native, originalTokens, compressedTokens, method: 'native' }
}

export { countTokensEstimate }
```

- [ ] **Step 2: Update `src/compressor/native.js` to export `compressNative`**

Open `src/compressor/native.js`. Find the export. It currently exports `compressWithNative` or similar. Ensure it exports `compressNative`:

```js
// at bottom of src/compressor/native.js — add if missing:
export { compressContext as compressNative }
// OR rename the existing export to compressNative
```

Check what the function is currently called:
```bash
grep "^export" src/compressor/native.js
```

If it exports `compressContext`, add at the bottom:
```js
export { compressContext as compressNative }
```

- [ ] **Step 3: Run existing compressor tests to ensure nothing broken**
```bash
npm test -- tests/native-compressor.test.js tests/headroom.test.js
```
Expected: all PASS

- [ ] **Step 4: Commit**
```bash
git add src/core/compressor/index.js src/compressor/native.js
git commit -m "feat(core): add compressor facade with normalized return shape"
```

---

### Task 6: src/core/streamer.js

**Files:**
- Create: `src/core/streamer.js`

- [ ] **Step 1: Create `src/core/streamer.js`**

```js
import chalk from 'chalk'

const MAX_RETRIES = 3
const BASE_DELAY  = 1000

function isRetryable(err) {
  const status = err.status ?? err.statusCode ?? 0
  return status === 429 || status >= 500
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Returns an AsyncGenerator that yields string chunks.
 * Works for Anthropic, OpenAI-compat (OpenAI + Ollama), and Google.
 */
export async function* streamResponse({ provider, client, model, systemPrompt, userMessage }) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (provider === 'anthropic') {
        const stream = client.messages.stream({
          model,
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        })
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            yield event.delta.text
          }
        }
        return

      } else if (provider === 'openai' || provider === 'ollama') {
        const stream = await client.chat.completions.create({
          model: model.replace(/^ollama[/:]/, ''),
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMessage  },
          ],
        })
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content
          if (text) yield text
        }
        return

      } else if (provider === 'google') {
        const genModel = client.getGenerativeModel({ model })
        const result = await genModel.generateContentStream([
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
        ])
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) yield text
        }
        return
      }

    } catch (err) {
      if (!isRetryable(err) || attempt === MAX_RETRIES) throw err
      const delay = BASE_DELAY * Math.pow(2, attempt)
      process.stderr.write(chalk.yellow(`\n  ⚠ ${err.status ?? 'error'} — retrying in ${delay/1000}s...\n`))
      await sleep(delay)
    }
  }
}
```

- [ ] **Step 2: Run full test suite to ensure nothing broken**
```bash
npm test
```
Expected: 35 passing

- [ ] **Step 3: Commit**
```bash
git add src/core/streamer.js
git commit -m "feat(core): add normalized streamer with retry for all providers"
```

---

### Task 7: src/core/runner.js

**Files:**
- Create: `src/core/runner.js`

- [ ] **Step 1: Create `src/core/runner.js`**

```js
import chalk from 'chalk'
import { getConfig } from './config.js'
import { validatePipeline } from './validator.js'
import { detectProvider, getApiKey, createClient } from './provider.js'
import { streamResponse } from './streamer.js'
import { compress } from './compressor/index.js'
import { estimateCost, saveRun } from './metrics.js'
import { getModeById } from '../pipeline/modes/index.js'
import { getSystemSuffix } from '../compressor/caveman.js'
import { getProjectRoot } from './config.js'

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
 * Returns { metrics } or throws with a user-friendly message.
 */
export async function runPipeline(pipeline, { onChunk = null, silent = false } = {}) {
  const config = getConfig()

  // Resolve defaults from config
  const model       = pipeline.model    ?? config.default_model
  const cavemanLevel = pipeline.cavemanLevel ?? config.default_caveman

  const resolved = { ...pipeline, model, cavemanLevel }

  // Validate
  const { valid, errors } = validatePipeline(resolved)
  if (!valid) {
    const msg = errors.map(e => `✗ ${e}`).join('\n')
    throw Object.assign(new Error(msg), { userFacing: true })
  }

  // Mode
  const mode = getModeById(resolved.modo)
  if (!mode) throw Object.assign(new Error(`✗ Modo "${resolved.modo}" não encontrado.`), { userFacing: true })

  // Provider + key
  const provider = detectProvider(model)
  const apiKey   = getApiKey(provider, config)

  if (!apiKey && provider !== 'ollama') {
    throw Object.assign(
      new Error(`✗ Sem API key para ${provider}. Execute: tokensave config`),
      { userFacing: true }
    )
  }

  // Compress context
  const { text: compressedContext, originalTokens, compressedTokens, method } = await compress(resolved.contexto ?? '')

  // System prompt
  const systemPrompt = mode.systemPrompt + '\n\n' + getSystemSuffix(cavemanLevel)

  // User message
  const userMessage = buildUserMessage(resolved, compressedContext)

  const inputTokens   = compressedTokens + Math.ceil(userMessage.length / 4)
  const estimatedCost = estimateCost(model, inputTokens, 0)

  // Pre-run summary
  if (!silent) {
    const savings = originalTokens > 0
      ? chalk.dim(` (${method}, -${Math.round((1 - compressedTokens/originalTokens)*100)}%)`)
      : ''
    process.stdout.write(
      `\n${chalk.cyan('⚡')} ${chalk.bold(resolved.modo)}  ${chalk.dim('·')}  ${chalk.dim(model)}  ${chalk.dim('·')}  ~$${estimatedCost.toFixed(4)}\n` +
      `${chalk.dim(resolved.papel)} ${chalk.dim('→')} ${resolved.tarefa}\n` +
      (originalTokens > 0 ? chalk.dim(`   ${compressedTokens}/${originalTokens} tokens${savings}\n`) : '') +
      `\n`
    )
  }

  // Create client
  const client = await createClient(provider, apiKey, config)

  // Stream
  const startMs = Date.now()
  let outputText = ''

  const emit = onChunk ?? ((text) => process.stdout.write(text))

  for await (const chunk of streamResponse({ provider, client, model, systemPrompt, userMessage })) {
    outputText += chunk
    emit(chunk)
  }

  if (!silent) process.stdout.write('\n')

  const durationMs    = Date.now() - startMs
  const outputTokens  = Math.ceil(outputText.length / 4)
  const realCost      = estimateCost(model, inputTokens, outputTokens)

  // Save metrics
  const run = {
    papel:             resolved.papel,
    tarefa:            resolved.tarefa,
    modo:              resolved.modo,
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

  // Post-run summary
  if (!silent) {
    process.stdout.write(
      `\n${chalk.green('✓')} ${compressedTokens}/${originalTokens} tokens  ${chalk.dim('·')}  $${realCost.toFixed(4)}  ${chalk.dim('·')}  ${(durationMs/1000).toFixed(1)}s\n`
    )
  }

  return { metrics: run, output: outputText }
}
```

- [ ] **Step 2: Run all tests**
```bash
npm test
```
Expected: 35 passing

- [ ] **Step 3: Commit**
```bash
git add src/core/runner.js
git commit -m "feat(core): add runner — orchestrates compress→stream→save with clean output"
```

---

### Task 8: Wire executor.js to core runner

**Files:**
- Modify: `src/pipeline/executor.js`
- Modify: `src/cli/commands/run.js`

- [ ] **Step 1: Replace `src/pipeline/executor.js` with thin wrapper**

```js
// src/pipeline/executor.js
// Thin wrapper — delegates to src/core/runner.js
export { runPipeline as executePipeline } from '../core/runner.js'
```

- [ ] **Step 2: Update `src/cli/commands/run.js` — remove old executor call, use runPipeline directly**

Open `src/cli/commands/run.js`. Find where it calls `executePipeline`. Change the import:

```js
// remove old import:
// import { executePipeline } from '../../pipeline/executor.js'

// add new import:
import { runPipeline } from '../../core/runner.js'
```

Find the call site (currently something like `await executePipeline(pipeline, model, opts)`).

Replace the entire executor call block with:

```js
try {
  await runPipeline({
    papel:      pipeline.papel,
    tarefa:     pipeline.tarefa,
    contexto:   pipeline.contexto ?? '',
    modo:       pipeline.modo,
    condicao:   pipeline.condicao ?? '',
    model:      opts.model,
    cavemanLevel: undefined, // uses config default
  })
} catch (err) {
  if (err.userFacing) {
    console.error(err.message)
    process.exit(1)
  }
  throw err
}
```

- [ ] **Step 3: Test the CLI manually**
```bash
node bin/tokensave.js run --help
node bin/tokensave.js run --papel "Engineer" --tarefa "test" --mode swot --yes 2>&1 | head -5
```
Expected: shows pre-run summary line, then error about API key (if not configured)

- [ ] **Step 4: Run all tests**
```bash
npm test
```
Expected: 35 passing

- [ ] **Step 5: Commit**
```bash
git add src/pipeline/executor.js src/cli/commands/run.js
git commit -m "refactor: wire CLI to core runner, executor becomes thin wrapper"
```

---

### Task 9: Update stats.js output

**Files:**
- Modify: `src/cli/commands/stats.js`

- [ ] **Step 1: Read current stats.js**
```bash
cat src/cli/commands/stats.js
```

- [ ] **Step 2: Replace with new format**

```js
// src/cli/commands/stats.js
import chalk from 'chalk'
import { getSummary, getTodaySummary, getModeStats } from '../../core/metrics.js'

export async function showStats() {
  const total = getSummary()
  const today = getTodaySummary()
  const modes = getModeStats()

  const savedPct = total.tokens_original > 0
    ? Math.round((1 - total.tokens_compressed / total.tokens_original) * 100)
    : 0

  console.log(`\n${chalk.cyan('⚡')} tokensave stats\n`)

  if (total.total_runs === 0) {
    console.log(chalk.dim('  Nenhuma execução ainda. Use: tokensave run\n'))
    return
  }

  console.log(
    `  ${chalk.bold(total.total_runs)} runs  ${chalk.dim('·')}  ` +
    `${chalk.bold('$' + (total.total_cost ?? 0).toFixed(4))} total  ${chalk.dim('·')}  ` +
    `${chalk.green(savedPct + '% salvo')}\n`
  )

  if (modes.length > 0) {
    const topModes = modes.slice(0, 5).map(m => `${m.modo} (${m.count})`).join('  ')
    console.log(`  ${chalk.dim('Top modos:')}  ${topModes}`)
  }

  if (today.total_runs > 0) {
    console.log(
      `  ${chalk.dim('Hoje:')}        ${today.total_runs} runs  ${chalk.dim('·')}  $${(today.total_cost ?? 0).toFixed(4)}`
    )
  }

  console.log()
}
```

- [ ] **Step 3: Test manually**
```bash
node bin/tokensave.js stats
```
Expected: clean one-liner format

- [ ] **Step 4: Commit**
```bash
git add src/cli/commands/stats.js
git commit -m "feat(cli): update stats to minimalist one-liner format"
```

---

### Task 10: Add --dry-run flag + stdin pipe + multiple --context-file

**Files:**
- Modify: `src/cli/index.js`
- Modify: `src/cli/commands/run.js`

- [ ] **Step 1: Add --dry-run option in `src/cli/index.js`**

Find the `.command('run')` block. Add:
```js
.option('--dry-run', 'Mostra prompt comprimido e custo estimado sem chamar a API')
```

- [ ] **Step 2: Update run.js to support --dry-run, multiple files, and stdin**

In `src/cli/commands/run.js`, in the section that builds `contexto`, replace the context loading block with:

```js
// Collect context from all sources
let contexto = opts.contextText || templateDefaults.contexto || ''

// stdin pipe support
if (!process.stdin.isTTY) {
  const { readFileSync } = await import('fs')
  const chunks = []
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) chunks.push(chunk)
  contexto = chunks.join('') + (contexto ? '\n' + contexto : '')
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
    contexto = (contexto ? contexto + '\n\n---\n\n' : '') + await res.text()
  } catch {
    console.error(chalk.red(`✗ Falha ao buscar URL: ${opts.contextUrl}`))
    process.exit(1)
  }
}
```

In `src/cli/index.js`, update `--context-file` to allow multiple:
```js
.option('--context-file <path>', 'Arquivo de contexto (repita para múltiplos arquivos)')
```
Note: Commander automatically stores repeated options as arrays when the user passes `--context-file a.js --context-file b.js`.

- [ ] **Step 3: Handle --dry-run before calling runPipeline**

In `run.js`, after building the pipeline and before calling `runPipeline`, add:

```js
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
  console.log(chalk.dim(`\n  Contexto comprimido:\n`))
  console.log(result.text.slice(0, 500) + (result.text.length > 500 ? '\n...' : ''))
  return
}
```

- [ ] **Step 4: Test dry-run**
```bash
node bin/tokensave.js run --papel "Engineer" --tarefa "review" --context-text "const x = 1 // comment" --mode revisar-codigo --dry-run
```
Expected: shows token counts and compressed context, no API call

- [ ] **Step 5: Test stdin pipe**
```bash
echo "function hello() { return 1 }" | node bin/tokensave.js run --papel "Engineer" --tarefa "review" --mode revisar-codigo --yes 2>&1 | head -3
```

- [ ] **Step 6: Run all tests**
```bash
npm test
```
Expected: 35 passing

- [ ] **Step 7: Commit**
```bash
git add src/cli/commands/run.js src/cli/index.js
git commit -m "feat(cli): add --dry-run, stdin pipe, multiple --context-file"
```

---

### Task 11: tokensave listen command

**Files:**
- Create: `src/cli/commands/listen.js`
- Modify: `src/cli/index.js`

- [ ] **Step 1: Create `src/cli/commands/listen.js`**

```js
// src/cli/commands/listen.js
import chalk from 'chalk'

export async function startListen() {
  let ws
  let reconnectTimer

  const WS_URL = 'ws://localhost:7878/ws'

  function connect() {
    const { WebSocket } = globalThis
    if (!WebSocket) {
      // Node 18+ has built-in WebSocket; for older nodes import ws
      return connectWithWs()
    }
    ws = new WebSocket(WS_URL)
    setupHandlers()
  }

  async function connectWithWs() {
    const { default: WS } = await import('ws').catch(() => {
      console.error(chalk.red('✗ Instale o pacote ws: npm install ws'))
      process.exit(1)
    })
    ws = new WS(WS_URL)
    setupHandlers()
  }

  function setupHandlers() {
    ws.on('open', () => {
      console.log(chalk.cyan('\n⚡ tokensave listen') + chalk.dim(` → ${WS_URL}\n`))
      console.log(chalk.dim('  Aguardando jobs do dashboard. Ctrl+C para parar.\n'))
    })

    ws.on('message', async (data) => {
      let msg
      try { msg = JSON.parse(data.toString()) } catch { return }

      if (msg.type !== 'run_request') return

      const { job_id, pipeline } = msg
      console.log(chalk.dim(`\n  Job ${job_id}: ${pipeline.modo} — ${pipeline.tarefa}`))

      const { runPipeline } = await import('../../core/runner.js')

      try {
        await runPipeline(pipeline, {
          silent: true,
          onChunk: (text) => {
            ws.send(JSON.stringify({ type: 'chunk', job_id, text }))
            process.stdout.write(text)
          }
        })
        ws.send(JSON.stringify({ type: 'done', job_id }))
        process.stdout.write('\n')
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', job_id, message: err.message }))
        console.error(chalk.red(`\n  ✗ ${err.message}`))
      }
    })

    ws.on('close', () => {
      console.log(chalk.dim('\n  Conexão encerrada. Reconectando em 3s...'))
      reconnectTimer = setTimeout(connect, 3000)
    })

    ws.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(chalk.dim(`  Dashboard não encontrado em ${WS_URL}. Tentando novamente em 3s...`))
      }
      ws.terminate?.()
    })
  }

  process.on('SIGINT', () => {
    clearTimeout(reconnectTimer)
    ws?.close?.()
    console.log(chalk.dim('\n  Listen encerrado.'))
    process.exit(0)
  })

  connect()

  // Keep process alive
  await new Promise(() => {})
}
```

- [ ] **Step 2: Register in `src/cli/index.js`**

Find where commands are registered. Add:
```js
program
  .command('listen')
  .description('Modo daemon — executa jobs enviados pelo dashboard via WebSocket')
  .action(async () => {
    const { startListen } = await import('./commands/listen.js')
    await startListen()
  })
```

- [ ] **Step 3: Test command registers**
```bash
node bin/tokensave.js --help
```
Expected: `listen` appears in commands list

- [ ] **Step 4: Commit**
```bash
git add src/cli/commands/listen.js src/cli/index.js
git commit -m "feat(cli): add listen command — daemon mode for dashboard WebSocket jobs"
```

---

## Phase 2 — Dashboard Cockpit

---

### Task 12: WebSocket server + new REST endpoints

**Files:**
- Modify: `src/dashboard/web/server.js`
- Modify: `package.json` (add ws dependency)

- [ ] **Step 1: Install ws**
```bash
npm install ws
```

- [ ] **Step 2: Replace `src/dashboard/web/server.js`**

```js
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { getConfig, setGlobalConfig, setProjectConfig, getAllConfig, getProjectRoot } from '../../core/config.js'
import { MODES } from '../../pipeline/modes/index.js'
import { SKILLS } from '../../../skills/index.js'
import { loadTemplates, saveTemplate, deleteTemplate } from '../../store/templates.js'
import { getRecentRuns, getSummary, getTodaySummary, getModeStats } from '../../core/metrics.js'
import { runPipeline } from '../../core/runner.js'
import { validatePipeline } from '../../core/validator.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Hono app ──────────────────────────────────────────────────────────────────

const app = new Hono()
app.use('*', cors())

// Static
app.get('/', (c) => c.html(readFileSync(join(__dirname, 'index.html'), 'utf8')))

// Config
app.get('/api/config', (c) => {
  const cfg = getConfig()
  // Never expose API keys over the network
  return c.json({
    default_model:   cfg.default_model,
    default_caveman: cfg.default_caveman,
    default_papel:   cfg.default_papel,
    ollama_base_url: cfg.ollama_base_url,
    has_anthropic:   !!cfg.anthropic_api_key,
    has_openai:      !!cfg.openai_api_key,
    has_google:      !!cfg.google_api_key,
  })
})

app.put('/api/config', async (c) => {
  const body = await c.req.json()
  const allowed = ['default_model','default_caveman','default_papel','ollama_base_url',
                   'anthropic_api_key','openai_api_key','google_api_key']
  for (const [k, v] of Object.entries(body)) {
    if (allowed.includes(k)) setGlobalConfig(k, v)
  }
  return c.json({ ok: true })
})

app.get('/api/config/project', (c) => {
  const all = getAllConfig()
  const root = getProjectRoot()
  return c.json({ root, config: all.projects?.[root] ?? {} })
})

app.put('/api/config/project', async (c) => {
  const body = await c.req.json()
  const allowed = ['default_model','default_caveman','default_papel']
  for (const [k, v] of Object.entries(body)) {
    if (allowed.includes(k)) setProjectConfig(k, v)
  }
  return c.json({ ok: true })
})

// Modes + Skills
app.get('/api/modes', (c) => c.json(MODES.map(m => ({
  id: m.id, name: m.name, description: m.description, cavemanLevel: m.cavemanLevel
}))))

app.get('/api/skills', (c) => c.json(SKILLS ?? []))

// Templates
app.get('/api/templates', (c) => c.json(loadTemplates()))

app.post('/api/templates', async (c) => {
  const body = await c.req.json()
  if (!body.name) return c.json({ error: 'name required' }, 400)
  saveTemplate(body.name, body)
  return c.json({ ok: true })
})

app.delete('/api/templates/:name', (c) => {
  deleteTemplate(c.req.param('name'))
  return c.json({ ok: true })
})

// Runs
app.get('/api/summary', (c) => c.json({
  total: getSummary(),
  today: getTodaySummary(),
  modes: getModeStats(),
}))

app.get('/api/runs', (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500)
  return c.json(getRecentRuns(limit))
})

app.get('/api/runs/export.csv', (c) => {
  const runs = getRecentRuns(500)
  const header = 'id,created_at,papel,tarefa,modo,model,tokens_original,tokens_compressed,tokens_output,cost_usd,duration_ms,success'
  const rows = runs.map(r =>
    [r.id, r.created_at, `"${r.papel}"`, `"${r.tarefa}"`, r.modo, r.model,
     r.tokens_original, r.tokens_compressed, r.tokens_output, r.cost_usd, r.duration_ms, r.success].join(',')
  )
  c.header('Content-Type', 'text/csv')
  c.header('Content-Disposition', 'attachment; filename="tokensave-runs.csv"')
  return c.text([header, ...rows].join('\n'))
})

// Run dispatch
app.post('/api/run', async (c) => {
  const pipeline = await c.req.json()
  const { valid, errors } = validatePipeline(pipeline)
  if (!valid) return c.json({ error: errors.join('; ') }, 400)

  const job_id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  // Dispatch async — result streams over WebSocket
  setImmediate(() => dispatchJob(job_id, pipeline))

  return c.json({ job_id })
})

// ── WebSocket ─────────────────────────────────────────────────────────────────

const clients = new Set()

function broadcast(msg) {
  const text = JSON.stringify(msg)
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(text)
  }
}

async function dispatchJob(job_id, pipeline) {
  broadcast({ type: 'start', job_id, pipeline })

  try {
    const result = await runPipeline(pipeline, {
      silent: true,
      onChunk: (text) => broadcast({ type: 'chunk', job_id, text }),
    })
    broadcast({ type: 'done', job_id, metrics: result.metrics })
  } catch (err) {
    broadcast({ type: 'error', job_id, message: err.message })
  }
}

// ── Server boot ───────────────────────────────────────────────────────────────

export function startWebServer(port = 7878) {
  // Create raw Node HTTP server so we can attach WebSocket
  const httpServer = createServer((req, res) => {
    // Hono handles all HTTP
    app.fetch(new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([, v]) => v != null)
      ),
    })).then(r => {
      res.writeHead(r.status, Object.fromEntries(r.headers.entries()))
      r.text().then(body => res.end(body))
    })
  })

  // WebSocket server on same port, path /ws
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
    ws.on('message', (data) => {
      let msg
      try { msg = JSON.parse(data.toString()) } catch { return }
      if (msg.type === 'run_request') {
        const job_id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        dispatchJob(job_id, msg.pipeline)
      }
    })
  })

  // Use @hono/node-server for proper Hono integration
  serve({ fetch: app.fetch, port }, () => {
    console.log(`\n⚡ Tokensave Dashboard → http://localhost:${port}\n`)
    console.log(`  WebSocket → ws://localhost:${port}/ws\n`)
    console.log(`  Ctrl+C para parar.\n`)
  })
}
```

- [ ] **Step 3: Fix SKILLS import — check what skills/index.js exports**
```bash
grep "^export" skills/index.js | head -5
```
Update the import in `server.js` to match the actual export name.

- [ ] **Step 4: Fix templates store import — check actual export names**
```bash
grep "^export" src/store/templates.js | head -5
```
Update the import to match.

- [ ] **Step 5: Test server starts**
```bash
node bin/tokensave.js dash --web &
sleep 2
curl -s http://localhost:7878/api/modes | head -c 200
curl -s http://localhost:7878/api/summary
kill %1 2>/dev/null
```
Expected: JSON responses from both endpoints

- [ ] **Step 6: Run all tests**
```bash
npm test
```
Expected: 35 passing

- [ ] **Step 7: Commit**
```bash
git add src/dashboard/web/server.js package.json package-lock.json
git commit -m "feat(dashboard): add WebSocket server, run dispatch, full REST API"
```

---

### Task 13: Dashboard SPA — 4-tab cockpit

**Files:**
- Modify: `src/dashboard/web/index.html`

- [ ] **Step 1: Replace `src/dashboard/web/index.html` with full SPA**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>tokensave</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0d1117;--surface:#161b22;--border:#30363d;
    --text:#e6edf3;--dim:#8b949e;--accent:#58a6ff;
    --green:#3fb950;--red:#f85149;--yellow:#d29922;
    --radius:6px;--font:'SF Mono','Fira Code',Consolas,monospace
  }
  body{background:var(--bg);color:var(--text);font-family:var(--font);font-size:13px;min-height:100vh}
  a{color:var(--accent);text-decoration:none}

  /* Layout */
  .header{display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid var(--border);background:var(--surface)}
  .header h1{font-size:15px;font-weight:600;letter-spacing:.5px}
  .header .badge{background:var(--accent);color:#000;font-size:10px;padding:2px 6px;border-radius:10px;font-weight:700}
  .ws-dot{width:8px;height:8px;border-radius:50%;background:var(--red);transition:background .3s;margin-left:auto}
  .ws-dot.connected{background:var(--green)}

  .tabs{display:flex;gap:0;border-bottom:1px solid var(--border);background:var(--surface);padding:0 24px}
  .tab{padding:10px 16px;cursor:pointer;color:var(--dim);border-bottom:2px solid transparent;font-size:12px;transition:all .15s}
  .tab:hover{color:var(--text)}
  .tab.active{color:var(--text);border-bottom-color:var(--accent)}

  .content{padding:24px;max-width:900px;margin:0 auto}

  /* Forms */
  .field{margin-bottom:16px}
  label{display:block;color:var(--dim);font-size:11px;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
  input,textarea,select{
    width:100%;background:var(--surface);border:1px solid var(--border);
    color:var(--text);padding:8px 12px;border-radius:var(--radius);
    font-family:var(--font);font-size:13px;outline:none;transition:border .15s
  }
  input:focus,textarea:focus,select:focus{border-color:var(--accent)}
  textarea{resize:vertical;min-height:80px}
  select option{background:var(--surface)}

  .row{display:grid;gap:12px}
  .row-2{grid-template-columns:1fr 1fr}
  .row-3{grid-template-columns:1fr 1fr 1fr}

  /* Buttons */
  .btn{padding:8px 16px;border-radius:var(--radius);border:none;cursor:pointer;font-family:var(--font);font-size:12px;font-weight:600;transition:all .15s}
  .btn-primary{background:var(--accent);color:#000}
  .btn-primary:hover{opacity:.85}
  .btn-primary:disabled{opacity:.4;cursor:not-allowed}
  .btn-ghost{background:transparent;color:var(--dim);border:1px solid var(--border)}
  .btn-ghost:hover{color:var(--text);border-color:var(--dim)}
  .btn-danger{background:transparent;color:var(--red);border:1px solid var(--border)}
  .btn-danger:hover{border-color:var(--red)}

  /* Output panel */
  .output-panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-top:16px;min-height:120px;display:none}
  .output-panel.visible{display:block}
  .output-text{white-space:pre-wrap;word-break:break-word;line-height:1.6;color:var(--text)}
  .output-meta{display:flex;gap:16px;padding-top:12px;margin-top:12px;border-top:1px solid var(--border);color:var(--dim);font-size:11px}
  .cursor{display:inline-block;width:8px;height:14px;background:var(--accent);animation:blink .8s step-end infinite;vertical-align:text-bottom}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

  /* Table */
  .table-wrap{overflow-x:auto}
  table{width:100%;border-collapse:collapse}
  th{text-align:left;color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:8px 12px;border-bottom:1px solid var(--border)}
  td{padding:10px 12px;border-bottom:1px solid var(--border);color:var(--text);font-size:12px}
  tr:hover td{background:rgba(255,255,255,.02)}
  .tag{display:inline-block;background:rgba(88,166,255,.1);color:var(--accent);padding:2px 6px;border-radius:4px;font-size:10px}
  .tag-green{background:rgba(63,185,80,.1);color:var(--green)}

  /* Cards */
  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px}
  .card-title{font-size:12px;font-weight:600;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
  .card-meta{color:var(--dim);font-size:11px;line-height:1.8}

  /* Stats strip */
  .stats-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
  .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px}
  .stat-value{font-size:22px;font-weight:700;color:var(--text)}
  .stat-label{color:var(--dim);font-size:11px;margin-top:4px}

  /* Settings */
  .section-title{font-size:12px;font-weight:600;color:var(--dim);text-transform:uppercase;letter-spacing:.5px;margin:24px 0 12px}
  .key-input-wrap{position:relative}
  .key-input-wrap input{padding-right:80px}
  .toggle-key{position:absolute;right:8px;top:50%;transform:translateY(-50%);color:var(--accent);cursor:pointer;font-size:11px}

  .msg{padding:8px 12px;border-radius:var(--radius);font-size:12px;margin-top:8px}
  .msg-ok{background:rgba(63,185,80,.1);color:var(--green);border:1px solid rgba(63,185,80,.3)}
  .msg-err{background:rgba(248,81,73,.1);color:var(--red);border:1px solid rgba(248,81,73,.3)}

  .empty{text-align:center;padding:48px;color:var(--dim)}

  /* Caveman toggle */
  .caveman-group{display:flex;gap:0}
  .caveman-opt{padding:6px 14px;background:var(--surface);border:1px solid var(--border);cursor:pointer;font-size:12px;color:var(--dim);transition:all .15s}
  .caveman-opt:first-child{border-radius:var(--radius) 0 0 var(--radius)}
  .caveman-opt:last-child{border-radius:0 var(--radius) var(--radius) 0}
  .caveman-opt+.caveman-opt{border-left:none}
  .caveman-opt.active{background:var(--accent);color:#000;border-color:var(--accent)}

  /* Mode select with description */
  .mode-desc{color:var(--dim);font-size:11px;margin-top:4px;min-height:16px}
</style>
</head>
<body>

<div class="header">
  <span style="color:var(--accent);font-size:18px">⚡</span>
  <h1>tokensave</h1>
  <span class="badge">v3</span>
  <span class="ws-dot" id="wsDot" title="WebSocket"></span>
</div>

<div class="tabs">
  <div class="tab active" data-tab="run">Run</div>
  <div class="tab" data-tab="history">History</div>
  <div class="tab" data-tab="templates">Templates</div>
  <div class="tab" data-tab="settings">Settings</div>
</div>

<!-- ── RUN ── -->
<div class="content" id="tab-run">
  <div class="row row-2">
    <div class="field">
      <label>Papel / Role</label>
      <input id="r-papel" placeholder="Senior Engineer, Security Auditor...">
    </div>
    <div class="field">
      <label>Modelo</label>
      <select id="r-model">
        <optgroup label="Anthropic">
          <option value="claude-opus-4-7">claude-opus-4-7</option>
          <option value="claude-sonnet-4-6" selected>claude-sonnet-4-6</option>
          <option value="claude-haiku-4-5">claude-haiku-4-5</option>
        </optgroup>
        <optgroup label="OpenAI">
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4o-mini">gpt-4o-mini</option>
        </optgroup>
        <optgroup label="Google">
          <option value="gemini-1.5-pro">gemini-1.5-pro</option>
          <option value="gemini-1.5-flash">gemini-1.5-flash</option>
        </optgroup>
        <optgroup label="Local">
          <option value="ollama/llama3">ollama/llama3</option>
          <option value="ollama/codellama">ollama/codellama</option>
          <option value="ollama/mistral">ollama/mistral</option>
        </optgroup>
      </select>
    </div>
  </div>

  <div class="field">
    <label>Tarefa</label>
    <input id="r-tarefa" placeholder="Revisar este endpoint para vulnerabilidades OWASP...">
  </div>

  <div class="field">
    <label>Contexto (opcional)</label>
    <textarea id="r-context" placeholder="Cole código, texto ou deixe vazio..."></textarea>
  </div>

  <div class="row row-2">
    <div class="field">
      <label>Modo</label>
      <select id="r-mode"></select>
      <div class="mode-desc" id="r-mode-desc"></div>
    </div>
    <div class="field">
      <label>Condição de saída (opcional)</label>
      <input id="r-condicao" placeholder="Todos os issues críticos identificados...">
    </div>
  </div>

  <div class="field">
    <label>Caveman level</label>
    <div class="caveman-group" id="cavemanGroup">
      <div class="caveman-opt" data-level="lite">lite</div>
      <div class="caveman-opt active" data-level="full">full</div>
      <div class="caveman-opt" data-level="ultra">ultra</div>
    </div>
  </div>

  <div style="display:flex;gap:8px;margin-top:8px">
    <button class="btn btn-primary" id="runBtn">▶ Run</button>
    <button class="btn btn-ghost" id="cancelBtn" style="display:none">✕ Cancelar</button>
    <button class="btn btn-ghost" id="saveTemplateBtn">Salvar template</button>
  </div>

  <div class="output-panel" id="outputPanel">
    <div class="output-text" id="outputText"></div>
    <div class="output-meta" id="outputMeta"></div>
  </div>
</div>

<!-- ── HISTORY ── -->
<div class="content" id="tab-history" style="display:none">
  <div class="stats-strip" id="statsStrip"></div>
  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Data</th><th>Papel</th><th>Tarefa</th><th>Modo</th><th>Modelo</th>
        <th>Tokens salvos</th><th>Custo</th><th>Duração</th>
      </tr></thead>
      <tbody id="historyBody"></tbody>
    </table>
  </div>
  <div style="margin-top:12px">
    <a href="/api/runs/export.csv" class="btn btn-ghost" style="display:inline-block;padding:6px 12px">⬇ Export CSV</a>
  </div>
</div>

<!-- ── TEMPLATES ── -->
<div class="content" id="tab-templates" style="display:none">
  <div id="templatesList"></div>
  <div class="card" style="margin-top:24px">
    <div class="card-title">Novo template</div>
    <div class="field"><label>Nome</label><input id="tpl-name" placeholder="security-weekly"></div>
    <div class="row row-2">
      <div class="field"><label>Papel</label><input id="tpl-papel"></div>
      <div class="field"><label>Modo</label><select id="tpl-mode"></select></div>
    </div>
    <div class="field"><label>Condição</label><input id="tpl-condicao"></div>
    <button class="btn btn-primary" id="saveTplBtn" style="margin-top:4px">Salvar</button>
    <div id="tplMsg"></div>
  </div>
</div>

<!-- ── SETTINGS ── -->
<div class="content" id="tab-settings" style="display:none">
  <div class="section-title">API Keys</div>
  <div class="field">
    <label>Anthropic API Key</label>
    <div class="key-input-wrap">
      <input type="password" id="s-anthropic" placeholder="sk-ant-...">
      <span class="toggle-key" onclick="toggleKey('s-anthropic')">mostrar</span>
    </div>
  </div>
  <div class="field">
    <label>OpenAI API Key</label>
    <div class="key-input-wrap">
      <input type="password" id="s-openai" placeholder="sk-...">
      <span class="toggle-key" onclick="toggleKey('s-openai')">mostrar</span>
    </div>
  </div>
  <div class="field">
    <label>Google API Key</label>
    <div class="key-input-wrap">
      <input type="password" id="s-google" placeholder="AIza...">
      <span class="toggle-key" onclick="toggleKey('s-google')">mostrar</span>
    </div>
  </div>

  <div class="section-title">Padrões Globais</div>
  <div class="row row-3">
    <div class="field"><label>Modelo padrão</label><select id="s-model"></select></div>
    <div class="field">
      <label>Caveman padrão</label>
      <select id="s-caveman">
        <option value="lite">lite</option>
        <option value="full" selected>full</option>
        <option value="ultra">ultra</option>
      </select>
    </div>
    <div class="field"><label>Papel padrão</label><input id="s-papel"></div>
  </div>
  <div class="field">
    <label>Ollama Base URL</label>
    <input id="s-ollama" placeholder="http://localhost:11434/v1">
  </div>

  <div class="section-title">Config por Projeto</div>
  <div class="card" id="projectConfig">
    <div class="card-meta" id="projectRoot" style="margin-bottom:12px"></div>
    <div class="row row-2">
      <div class="field"><label>Modelo</label><select id="p-model"><option value="">— global —</option></select></div>
      <div class="field"><label>Caveman</label>
        <select id="p-caveman">
          <option value="">— global —</option>
          <option value="lite">lite</option>
          <option value="full">full</option>
          <option value="ultra">ultra</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Papel padrão</label><input id="p-papel" placeholder="— global —"></div>
    <button class="btn btn-ghost" id="saveProjBtn" style="margin-top:4px">Salvar config do projeto</button>
  </div>

  <button class="btn btn-primary" id="saveSettingsBtn" style="margin-top:8px">Salvar configurações globais</button>
  <div id="settingsMsg"></div>
</div>

<script>
const API = ''
let ws, wsConnected = false
let currentJobId = null
let modes = [], cavemanLevel = 'full'

// ── WebSocket ───────────────────────────────────────────────────────────────
function connectWS() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${location.host}/ws`)

  ws.onopen = () => {
    wsConnected = true
    document.getElementById('wsDot').classList.add('connected')
  }
  ws.onclose = () => {
    wsConnected = false
    document.getElementById('wsDot').classList.remove('connected')
    setTimeout(connectWS, 3000)
  }
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)
    handleWsMessage(msg)
  }
}

function handleWsMessage(msg) {
  if (msg.job_id !== currentJobId) return

  if (msg.type === 'start') {
    document.getElementById('outputPanel').classList.add('visible')
    document.getElementById('outputText').innerHTML = '<span class="cursor"></span>'
    document.getElementById('outputMeta').innerHTML = ''
    document.getElementById('cancelBtn').style.display = 'inline-block'
  }

  if (msg.type === 'chunk') {
    const el = document.getElementById('outputText')
    const cursor = el.querySelector('.cursor')
    const text = document.createTextNode(msg.text)
    cursor ? el.insertBefore(text, cursor) : el.appendChild(text)
  }

  if (msg.type === 'done') {
    document.getElementById('outputText').querySelector('.cursor')?.remove()
    document.getElementById('cancelBtn').style.display = 'none'
    document.getElementById('runBtn').disabled = false
    currentJobId = null
    if (msg.metrics) {
      const m = msg.metrics
      const saved = m.tokens_original > 0 ? Math.round((1 - m.tokens_compressed/m.tokens_original)*100) : 0
      document.getElementById('outputMeta').innerHTML =
        `<span>✓ ${m.tokens_compressed}/${m.tokens_original} tokens (${saved}% salvo)</span>` +
        `<span>$${(m.cost_usd||0).toFixed(4)}</span>` +
        `<span>${((m.duration_ms||0)/1000).toFixed(1)}s</span>`
    }
    loadHistory()
  }

  if (msg.type === 'error') {
    document.getElementById('outputText').querySelector('.cursor')?.remove()
    document.getElementById('outputText').insertAdjacentHTML('beforeend',
      `<span style="color:var(--red)">\n✗ ${msg.message}</span>`)
    document.getElementById('cancelBtn').style.display = 'none'
    document.getElementById('runBtn').disabled = false
    currentJobId = null
  }
}

// ── Tabs ────────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'))
    t.classList.add('active')
    document.querySelectorAll('.content').forEach(x => x.style.display = 'none')
    document.getElementById('tab-' + t.dataset.tab).style.display = 'block'
    if (t.dataset.tab === 'history')   loadHistory()
    if (t.dataset.tab === 'templates') loadTemplates()
    if (t.dataset.tab === 'settings')  loadSettings()
  })
})

// ── Caveman toggle ──────────────────────────────────────────────────────────
document.querySelectorAll('.caveman-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.caveman-opt').forEach(o => o.classList.remove('active'))
    opt.classList.add('active')
    cavemanLevel = opt.dataset.level
  })
})

// ── Mode select ──────────────────────────────────────────────────────────────
async function loadModes() {
  const res = await fetch('/api/modes')
  modes = await res.json()
  populateModeSelect('r-mode', modes)
  populateModeSelect('tpl-mode', modes)
  updateModeDesc()
}

function populateModeSelect(id, modeList) {
  const sel = document.getElementById(id)
  sel.innerHTML = modeList.map(m => `<option value="${m.id}">${m.name}</option>`).join('')
}

function updateModeDesc() {
  const sel = document.getElementById('r-mode')
  const mode = modes.find(m => m.id === sel.value)
  document.getElementById('r-mode-desc').textContent = mode?.description ?? ''
}

document.getElementById('r-mode')?.addEventListener('change', updateModeDesc)

// ── Settings model select ────────────────────────────────────────────────────
function populateModelSelects() {
  const opts = [
    'claude-opus-4-7','claude-sonnet-4-6','claude-haiku-4-5',
    'gpt-4o','gpt-4o-mini','gemini-1.5-pro','gemini-1.5-flash','ollama/llama3'
  ].map(m => `<option value="${m}">${m}</option>`).join('')
  document.getElementById('s-model').innerHTML = opts
  document.getElementById('p-model').innerHTML = '<option value="">— global —</option>' + opts
}

// ── Run ──────────────────────────────────────────────────────────────────────
document.getElementById('runBtn').addEventListener('click', async () => {
  const pipeline = {
    papel:      document.getElementById('r-papel').value.trim(),
    tarefa:     document.getElementById('r-tarefa').value.trim(),
    contexto:   document.getElementById('r-context').value,
    modo:       document.getElementById('r-mode').value,
    condicao:   document.getElementById('r-condicao').value.trim(),
    model:      document.getElementById('r-model').value,
    cavemanLevel,
  }

  if (!pipeline.papel || !pipeline.tarefa) {
    alert('Papel e Tarefa são obrigatórios.')
    return
  }

  document.getElementById('runBtn').disabled = true
  document.getElementById('outputPanel').classList.add('visible')
  document.getElementById('outputText').textContent = ''
  document.getElementById('outputMeta').textContent = ''

  try {
    const res  = await fetch('/api/run', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(pipeline) })
    const data = await res.json()
    if (data.error) {
      document.getElementById('outputText').textContent = '✗ ' + data.error
      document.getElementById('runBtn').disabled = false
      return
    }
    currentJobId = data.job_id
  } catch (e) {
    document.getElementById('outputText').textContent = '✗ Erro de conexão com o servidor.'
    document.getElementById('runBtn').disabled = false
  }
})

document.getElementById('cancelBtn').addEventListener('click', () => {
  if (currentJobId && ws?.readyState === 1) {
    ws.send(JSON.stringify({ type: 'cancel', job_id: currentJobId }))
  }
  document.getElementById('cancelBtn').style.display = 'none'
  document.getElementById('runBtn').disabled = false
  document.getElementById('outputText').querySelector('.cursor')?.remove()
  currentJobId = null
})

// ── Save as template ─────────────────────────────────────────────────────────
document.getElementById('saveTemplateBtn').addEventListener('click', () => {
  const name = prompt('Nome do template:')
  if (!name) return
  fetch('/api/templates', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      name,
      papel:    document.getElementById('r-papel').value,
      modo:     document.getElementById('r-mode').value,
      condicao: document.getElementById('r-condicao').value,
    })
  }).then(() => alert('Template salvo!'))
})

// ── History ──────────────────────────────────────────────────────────────────
async function loadHistory() {
  const [runsRes, summaryRes] = await Promise.all([
    fetch('/api/runs?limit=50'),
    fetch('/api/summary'),
  ])
  const runs = await runsRes.json()
  const { total, today } = await summaryRes.json()

  const savedPct = total.tokens_original > 0
    ? Math.round((1 - total.tokens_compressed/total.tokens_original)*100) : 0

  document.getElementById('statsStrip').innerHTML = `
    <div class="stat-card"><div class="stat-value">${total.total_runs ?? 0}</div><div class="stat-label">Total runs</div></div>
    <div class="stat-card"><div class="stat-value">$${(total.total_cost ?? 0).toFixed(4)}</div><div class="stat-label">Custo total</div></div>
    <div class="stat-card"><div class="stat-value" style="color:var(--green)">${savedPct}%</div><div class="stat-label">Tokens salvos</div></div>
    <div class="stat-card"><div class="stat-value">${today.total_runs ?? 0}</div><div class="stat-label">Hoje</div></div>
  `

  if (!runs.length) {
    document.getElementById('historyBody').innerHTML = '<tr><td colspan="8" class="empty">Nenhuma execução ainda.</td></tr>'
    return
  }

  document.getElementById('historyBody').innerHTML = runs.map(r => {
    const saved = r.tokens_original > 0 ? Math.round((1 - r.tokens_compressed/r.tokens_original)*100) : 0
    const date  = new Date(r.created_at).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })
    return `<tr>
      <td>${date}</td>
      <td>${r.papel ?? ''}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.tarefa ?? ''}">${r.tarefa ?? ''}</td>
      <td><span class="tag">${r.modo ?? ''}</span></td>
      <td><span class="tag">${r.model ?? ''}</span></td>
      <td><span class="tag tag-green">${saved}%</span></td>
      <td>$${(r.cost_usd ?? 0).toFixed(4)}</td>
      <td>${((r.duration_ms ?? 0)/1000).toFixed(1)}s</td>
    </tr>`
  }).join('')
}

// ── Templates ────────────────────────────────────────────────────────────────
async function loadTemplates() {
  const res  = await fetch('/api/templates')
  const list = await res.json()
  const el   = document.getElementById('templatesList')

  if (!list.length) {
    el.innerHTML = '<div class="empty">Nenhum template ainda.</div>'
    return
  }

  el.innerHTML = list.map(t => `
    <div class="card">
      <div class="card-title">
        ${t.name ?? t}
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="loadTemplate('${t.name ?? t}')">Usar</button>
          <button class="btn btn-danger" onclick="deleteTemplate('${t.name ?? t}')">Remover</button>
        </div>
      </div>
      <div class="card-meta">
        ${t.papel ? `<div>Papel: ${t.papel}</div>` : ''}
        ${t.modo  ? `<div>Modo: ${t.modo}</div>` : ''}
        ${t.condicao ? `<div>Condição: ${t.condicao}</div>` : ''}
      </div>
    </div>
  `).join('')
}

function loadTemplate(name) {
  fetch('/api/templates').then(r => r.json()).then(list => {
    const tpl = list.find(t => (t.name ?? t) === name)
    if (!tpl) return
    if (tpl.papel)    document.getElementById('r-papel').value = tpl.papel
    if (tpl.modo)     document.getElementById('r-mode').value  = tpl.modo
    if (tpl.condicao) document.getElementById('r-condicao').value = tpl.condicao
    document.querySelectorAll('.tab')[0].click()
    updateModeDesc()
  })
}

function deleteTemplate(name) {
  if (!confirm(`Remover template "${name}"?`)) return
  fetch(`/api/templates/${encodeURIComponent(name)}`, { method: 'DELETE' })
    .then(() => loadTemplates())
}

document.getElementById('saveTplBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('tpl-name').value.trim()
  if (!name) { showMsg('tplMsg', 'Nome obrigatório', false); return }
  await fetch('/api/templates', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      name,
      papel:    document.getElementById('tpl-papel').value,
      modo:     document.getElementById('tpl-mode').value,
      condicao: document.getElementById('tpl-condicao').value,
    })
  })
  showMsg('tplMsg', 'Template salvo!', true)
  loadTemplates()
})

// ── Settings ─────────────────────────────────────────────────────────────────
async function loadSettings() {
  const [cfgRes, projRes] = await Promise.all([
    fetch('/api/config'),
    fetch('/api/config/project'),
  ])
  const cfg  = await cfgRes.json()
  const proj = await projRes.json()

  document.getElementById('s-anthropic').placeholder = cfg.has_anthropic ? '(configurada)' : 'sk-ant-...'
  document.getElementById('s-openai').placeholder    = cfg.has_openai    ? '(configurada)' : 'sk-...'
  document.getElementById('s-google').placeholder    = cfg.has_google    ? '(configurada)' : 'AIza...'
  document.getElementById('s-model').value    = cfg.default_model ?? 'claude-sonnet-4-6'
  document.getElementById('s-caveman').value  = cfg.default_caveman ?? 'full'
  document.getElementById('s-papel').value    = cfg.default_papel ?? ''
  document.getElementById('s-ollama').value   = cfg.ollama_base_url ?? ''

  document.getElementById('projectRoot').textContent = `Projeto: ${proj.root}`
  if (proj.config.default_model)   document.getElementById('p-model').value   = proj.config.default_model
  if (proj.config.default_caveman) document.getElementById('p-caveman').value = proj.config.default_caveman
  if (proj.config.default_papel)   document.getElementById('p-papel').value   = proj.config.default_papel
}

document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
  const body = {}
  const anthropic = document.getElementById('s-anthropic').value
  const openai    = document.getElementById('s-openai').value
  const google    = document.getElementById('s-google').value
  if (anthropic) body.anthropic_api_key = anthropic
  if (openai)    body.openai_api_key    = openai
  if (google)    body.google_api_key    = google
  body.default_model   = document.getElementById('s-model').value
  body.default_caveman = document.getElementById('s-caveman').value
  body.default_papel   = document.getElementById('s-papel').value
  body.ollama_base_url = document.getElementById('s-ollama').value

  const res = await fetch('/api/config', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
  showMsg('settingsMsg', res.ok ? 'Salvo!' : 'Erro ao salvar', res.ok)
  if (res.ok) loadSettings()
})

document.getElementById('saveProjBtn')?.addEventListener('click', async () => {
  const body = {}
  const model   = document.getElementById('p-model').value
  const caveman = document.getElementById('p-caveman').value
  const papel   = document.getElementById('p-papel').value
  if (model)   body.default_model   = model
  if (caveman) body.default_caveman = caveman
  if (papel)   body.default_papel   = papel

  const res = await fetch('/api/config/project', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
  showMsg('settingsMsg', res.ok ? 'Config do projeto salva!' : 'Erro', res.ok)
})

function toggleKey(id) {
  const input = document.getElementById(id)
  const span  = input.parentElement.querySelector('.toggle-key')
  input.type  = input.type === 'password' ? 'text' : 'password'
  span.textContent = input.type === 'password' ? 'mostrar' : 'ocultar'
}

function showMsg(id, text, ok) {
  const el = document.getElementById(id)
  el.className = 'msg ' + (ok ? 'msg-ok' : 'msg-err')
  el.textContent = text
  setTimeout(() => el.textContent = '', 3000)
}

// ── Init ─────────────────────────────────────────────────────────────────────
connectWS()
loadModes()
populateModelSelects()
</script>
</body>
</html>
```

- [ ] **Step 2: Test dashboard**
```bash
node bin/tokensave.js dash --web &
sleep 2
# Open http://localhost:7878 in browser
# Verify: 4 tabs visible, modes load in Run tab, WebSocket dot turns green
kill %1 2>/dev/null
```

- [ ] **Step 3: Commit**
```bash
git add src/dashboard/web/index.html
git commit -m "feat(dashboard): full SPA cockpit — 4 tabs, WebSocket run, settings, templates"
```

---

## Phase 3 — Tests + Polish

---

### Task 14: Additional core tests

**Files:**
- Create: `tests/core/validator.test.js` *(already done in Task 2)*
- Create: `tests/core/provider.test.js` *(already done in Task 3)*
- Create: `tests/core/metrics.test.js` *(already done in Task 4)*
- Create: `tests/core/config.test.js` *(already done in Task 1)*
- Create: `tests/core/runner.test.js`

- [ ] **Step 1: Write runner integration test**

```js
// tests/core/runner.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the streaming + API calls
vi.mock('../../src/core/streamer.js', () => ({
  streamResponse: async function* () {
    yield 'Hello '
    yield 'world'
  }
}))

vi.mock('../../src/core/provider.js', () => ({
  detectProvider: () => 'anthropic',
  getApiKey: () => 'test-key',
  createClient: () => ({}),
}))

vi.mock('../../src/core/metrics.js', () => ({
  estimateCost: () => 0.001,
  saveRun: vi.fn(),
}))

import { runPipeline } from '../../src/core/runner.js'

describe('runPipeline', () => {
  const base = {
    papel: 'Engineer',
    tarefa: 'review code',
    modo: 'revisar-codigo',
    model: 'claude-sonnet-4-6',
  }

  it('streams output and returns metrics', async () => {
    const chunks = []
    const result = await runPipeline(base, {
      silent: true,
      onChunk: (t) => chunks.push(t)
    })
    expect(chunks.join('')).toBe('Hello world')
    expect(result.metrics.papel).toBe('Engineer')
    expect(result.output).toBe('Hello world')
  })

  it('throws userFacing error for missing papel', async () => {
    await expect(
      runPipeline({ ...base, papel: '' }, { silent: true })
    ).rejects.toMatchObject({ userFacing: true })
  })

  it('throws userFacing error for invalid modo', async () => {
    await expect(
      runPipeline({ ...base, modo: 'not-a-mode' }, { silent: true })
    ).rejects.toMatchObject({ userFacing: true })
  })
})
```

- [ ] **Step 2: Run all tests**
```bash
npm test
```
Expected: all passing (35 original + new core tests)

- [ ] **Step 3: Commit**
```bash
git add tests/core/
git commit -m "test(core): add integration tests for runner, config, validator, provider, metrics"
```

---

### Task 15: Update config command + final wiring

**Files:**
- Modify: `src/cli/commands/config.js`

- [ ] **Step 1: Read current config.js**
```bash
cat src/cli/commands/config.js
```

- [ ] **Step 2: Update to show current config before prompting**

At the top of the `configureSettings` function (or equivalent), add a display of current config before the Inquirer prompts:

```js
import chalk from 'chalk'
import inquirer from 'inquirer'
import { getConfig, setGlobalConfig } from '../../core/config.js'

export async function configureSettings() {
  const current = getConfig()

  console.log(chalk.cyan('\n⚡ tokensave config\n'))
  console.log(chalk.dim('  Config atual:'))
  console.log(chalk.dim(`  Modelo padrão:   ${current.default_model}`))
  console.log(chalk.dim(`  Caveman padrão:  ${current.default_caveman}`))
  console.log(chalk.dim(`  Anthropic key:   ${current.anthropic_api_key ? '✓ configurada' : '✗ não configurada'}`))
  console.log(chalk.dim(`  OpenAI key:      ${current.openai_api_key    ? '✓ configurada' : '✗ não configurada'}`))
  console.log(chalk.dim(`  Google key:      ${current.google_api_key    ? '✓ configurada' : '✗ não configurada'}`))
  console.log()

  const answers = await inquirer.prompt([
    {
      type: 'password',
      name: 'anthropic_api_key',
      message: 'Anthropic API Key (Enter para manter):',
      mask: '*',
    },
    {
      type: 'password',
      name: 'openai_api_key',
      message: 'OpenAI API Key (Enter para manter):',
      mask: '*',
    },
    {
      type: 'password',
      name: 'google_api_key',
      message: 'Google API Key (Enter para manter):',
      mask: '*',
    },
    {
      type: 'list',
      name: 'default_model',
      message: 'Modelo padrão:',
      default: current.default_model,
      choices: [
        'claude-sonnet-4-6','claude-opus-4-7','claude-haiku-4-5',
        'gpt-4o','gpt-4o-mini',
        'gemini-1.5-pro','gemini-1.5-flash',
        'ollama/llama3',
      ],
    },
    {
      type: 'list',
      name: 'default_caveman',
      message: 'Caveman level padrão:',
      default: current.default_caveman,
      choices: ['lite', 'full', 'ultra'],
    },
  ])

  for (const [key, value] of Object.entries(answers)) {
    if (value) setGlobalConfig(key, value)
  }

  console.log(chalk.green('\n  ✓ Config salva.\n'))
}
```

- [ ] **Step 3: Test**
```bash
node bin/tokensave.js config
# Should show current config then prompt
# Press Ctrl+C to cancel without saving
```

- [ ] **Step 4: Run all tests**
```bash
npm test
```
Expected: all passing

- [ ] **Step 5: Final commit**
```bash
git add src/cli/commands/config.js
git commit -m "feat(cli): update config command — show current state before prompting"
```

---

### Task 16: Final integration test + push

- [ ] **Step 1: Full test suite**
```bash
npm test
```
Expected: all tests passing

- [ ] **Step 2: Smoke test all commands**
```bash
node bin/tokensave.js --version
node bin/tokensave.js --help
node bin/tokensave.js stats
node bin/tokensave.js templates
node bin/tokensave.js run --help
node bin/tokensave.js run --papel "Engineer" --tarefa "test" --mode swot --dry-run
echo "const x = 1" | node bin/tokensave.js run --papel "Engineer" --tarefa "review" --mode revisar-codigo --dry-run
```
Expected: all commands respond correctly, dry-run shows token counts

- [ ] **Step 3: Test dashboard**
```bash
node bin/tokensave.js dash --web &
sleep 2
curl -s http://localhost:7878/ | grep -c "tokensave"
curl -s http://localhost:7878/api/modes | grep -c "id"
curl -s http://localhost:7878/api/summary
kill %1 2>/dev/null
```
Expected: HTML contains "tokensave", modes API returns JSON with `id` fields

- [ ] **Step 4: Final commit + push**
```bash
git add -A
git status  # review what's being committed
git commit -m "feat: tokensave v3 — clean architecture, WebSocket dashboard, core modules"
git push origin master
```

---

## Summary

| Phase | Tasks | Outcome |
|-------|-------|---------|
| 1 — Core | 1–11 | Clean modules, new output format, dry-run, stdin, listen |
| 2 — Dashboard | 12–13 | WebSocket cockpit, 4-tab SPA, run from browser |
| 3 — Polish | 14–16 | Tests, config command, final integration |

**New files:** `src/core/config.js`, `src/core/validator.js`, `src/core/provider.js`, `src/core/metrics.js`, `src/core/streamer.js`, `src/core/runner.js`, `src/core/compressor/index.js`, `src/cli/commands/listen.js`, `tests/core/*.test.js`

**Modified heavily:** `src/pipeline/executor.js`, `src/dashboard/web/server.js`, `src/dashboard/web/index.html`, `src/cli/commands/run.js`, `src/cli/commands/stats.js`, `src/cli/commands/config.js`, `src/cli/index.js`
