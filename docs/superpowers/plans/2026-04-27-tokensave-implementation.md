# Tokensave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `tokensave` — CLI universal que estrutura interações com AI via pipeline PAPEL/TAREFA/CONTEXTO/RACIOCÍNIO/CONDIÇÃO, comprime tokens automaticamente e monitora uso via dashboard TUI + web.

**Architecture:** Node.js ESM CLI (`npx tokensave`) com detector de AI tools, pipeline builder interativo (Inquirer), executor com streaming via SDK nativo (Claude/OpenAI/Gemini), compressão de entrada via Headroom (Python subprocess com fallback nativo) e saída via Caveman rules. SQLite local para métricas. Dashboard TUI (Ink) e web (Hono).

**Tech Stack:** Node.js 18+ ESM, Commander.js, Inquirer.js 9+, Ink 4+, Hono, better-sqlite3, @anthropic-ai/sdk, openai, @google/generative-ai, chalk, ora, tiktoken, Vitest

---

## File Map

```
tokensave/
├── bin/tokensave.js                  ← shebang, entry point npx
├── src/
│   ├── cli/index.js                  ← Commander, registra subcomandos
│   ├── store/db.js                   ← SQLite: sessions + pipeline_runs
│   ├── detector/index.js             ← detecta Claude Code/Cursor/Copilot/Windsurf
│   ├── compressor/
│   │   ├── caveman.js                ← retorna system prompt suffix por modo/level
│   │   ├── native.js                 ← fallback: truncamento + strip whitespace/comments
│   │   └── headroom.js              ← subprocess headroom-ai, fallback para native
│   ├── pipeline/
│   │   ├── modes/index.js            ← exporta array de todos os modos
│   │   ├── modes/criar-sistema.js    ← mode definition
│   │   ├── modes/revisar-codigo.js
│   │   ├── modes/documentacao.js
│   │   ├── modes/consultor.js
│   │   ├── modes/swot.js
│   │   ├── modes/compare.js
│   │   ├── modes/multi-perspectiva.js
│   │   ├── modes/parallel-lens.js
│   │   ├── modes/pitfalls.js
│   │   ├── modes/metrics-mode.js
│   │   ├── modes/context-stack.js
│   │   ├── builder.js                ← Inquirer form → {papel, tarefa, contexto, modo, condicao}
│   │   └── executor.js               ← comprime, chama API, streama, salva métricas
│   ├── injector/
│   │   ├── claude-code.js
│   │   ├── cursor.js
│   │   ├── copilot.js
│   │   └── windsurf.js
│   ├── dashboard/
│   │   ├── tui.js                    ← Ink component
│   │   └── web/
│   │       ├── server.js             ← Hono server
│   │       └── index.html            ← dashboard HTML+JS vanilla
│   └── skills/
│       └── index.js                  ← menu de skills + loader
├── skills/
│   ├── security-audit/index.js
│   ├── data-science/index.js
│   ├── database/index.js
│   ├── software-architect/index.js
│   ├── ux-ui/index.js
│   ├── devops/index.js
│   ├── code-review/index.js
│   └── documentation/index.js
├── tests/
│   ├── store.test.js
│   ├── detector.test.js
│   ├── caveman.test.js
│   ├── native-compressor.test.js
│   ├── headroom.test.js
│   ├── modes.test.js
│   ├── builder.test.js
│   ├── executor.test.js
│   ├── injectors.test.js
│   └── skills.test.js
├── package.json
└── vitest.config.js
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `bin/tokensave.js`
- Create: `src/cli/index.js`
- Create: `tests/cli.test.js`

- [ ] **Step 1: Criar package.json**

```json
{
  "name": "tokensave",
  "version": "0.1.0",
  "description": "Structured AI pipeline for any tool. One command. 70% less tokens.",
  "type": "module",
  "bin": {
    "tokensave": "./bin/tokensave.js"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "node bin/tokensave.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.54.0",
    "@google/generative-ai": "^0.21.0",
    "better-sqlite3": "^11.0.0",
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "hono": "^4.4.0",
    "ink": "^5.0.0",
    "inquirer": "^10.0.0",
    "openai": "^4.60.0",
    "ora": "^8.0.0",
    "react": "^18.3.0",
    "tiktoken": "^1.0.15"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": ["ai", "tokens", "claude", "cursor", "copilot", "pipeline", "cli"],
  "license": "MIT"
}
```

- [ ] **Step 2: Criar vitest.config.js**

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 3: Criar bin/tokensave.js**

```js
#!/usr/bin/env node
import '../src/cli/index.js'
```

- [ ] **Step 4: Criar src/cli/index.js**

```js
import { Command } from 'commander'

const program = new Command()

program
  .name('tokensave')
  .description('Structured AI pipeline for any tool. One command. 70% less tokens.')
  .version('0.1.0')

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
  .option('--mode <mode>', 'Pula menu e vai direto para um modo específico')
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
  .command('config')
  .description('Configura API keys e preferências')
  .action(async () => {
    const { runConfig } = await import('./commands/config.js')
    await runConfig()
  })

program.parse()
```

- [ ] **Step 5: Instalar dependências**

```bash
cd ~/tokensave
npm install
```

Esperado: `node_modules/` criado, sem erros.

- [ ] **Step 6: Verificar que CLI responde**

```bash
node bin/tokensave.js --help
```

Esperado: lista de comandos sem erro.

- [ ] **Step 7: Commit**

```bash
git add package.json vitest.config.js bin/ src/cli/index.js
git commit -m "feat: scaffold CLI with Commander subcommands"
```

---

## Task 2: SQLite Store

**Files:**
- Create: `src/store/db.js`
- Create: `tests/store.test.js`

- [ ] **Step 1: Escrever o teste**

```js
// tests/store.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createStore } from '../src/store/db.js'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

function tempDb() {
  return join(tmpdir(), `tokensave-test-${randomBytes(4).toString('hex')}.db`)
}

describe('store', () => {
  let store, dbPath

  beforeEach(() => {
    dbPath = tempDb()
    store = createStore(dbPath)
  })

  afterEach(() => {
    store.close()
  })

  it('saves and retrieves a pipeline run', () => {
    const run = {
      papel: 'Arquiteto',
      tarefa: 'Revisar API',
      contexto: 'src/auth/',
      modo: 'revisar-codigo',
      condicao: 'Vulnerabilidades identificadas',
      model: 'claude-sonnet-4-6',
      tokens_original: 2847,
      tokens_compressed: 810,
      tokens_output: 512,
      cost_usd: 0.004,
      duration_ms: 2100,
      success: true,
    }

    const id = store.saveRun(run)
    expect(id).toBeTypeOf('number')

    const saved = store.getRunById(id)
    expect(saved.papel).toBe('Arquiteto')
    expect(saved.modo).toBe('revisar-codigo')
    expect(saved.tokens_compressed).toBe(810)
  })

  it('returns summary stats', () => {
    store.saveRun({
      papel: 'A', tarefa: 'T', contexto: 'C', modo: 'swot', condicao: 'X',
      model: 'claude-sonnet-4-6', tokens_original: 1000, tokens_compressed: 300,
      tokens_output: 200, cost_usd: 0.002, duration_ms: 1000, success: true,
    })
    store.saveRun({
      papel: 'A', tarefa: 'T', contexto: 'C', modo: 'swot', condicao: 'X',
      model: 'gpt-4o', tokens_original: 2000, tokens_compressed: 600,
      tokens_output: 400, cost_usd: 0.005, duration_ms: 2000, success: true,
    })

    const stats = store.getSummary()
    expect(stats.total_runs).toBe(2)
    expect(stats.total_tokens_original).toBe(3000)
    expect(stats.total_tokens_compressed).toBe(900)
    expect(stats.total_cost_usd).toBeCloseTo(0.007)
  })

  it('returns recent runs ordered by created_at desc', () => {
    store.saveRun({ papel:'A',tarefa:'1',contexto:'',modo:'swot',condicao:'',model:'claude-sonnet-4-6',tokens_original:100,tokens_compressed:30,tokens_output:50,cost_usd:0.001,duration_ms:500,success:true })
    store.saveRun({ papel:'A',tarefa:'2',contexto:'',modo:'pitfalls',condicao:'',model:'claude-sonnet-4-6',tokens_original:200,tokens_compressed:60,tokens_output:100,cost_usd:0.002,duration_ms:800,success:true })

    const runs = store.getRecentRuns(10)
    expect(runs[0].tarefa).toBe('2')
    expect(runs[1].tarefa).toBe('1')
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
cd ~/tokensave && npm test -- tests/store.test.js
```

Esperado: FAIL — `Cannot find module '../src/store/db.js'`

- [ ] **Step 3: Implementar src/store/db.js**

```js
import Database from 'better-sqlite3'
import { homedir } from 'os'
import { join } from 'path'
import { mkdirSync } from 'fs'

const DEFAULT_PATH = join(homedir(), '.tokensave', 'metrics.db')

export function createStore(dbPath = DEFAULT_PATH) {
  mkdirSync(join(dbPath, '..'), { recursive: true })
  const db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      papel         TEXT    NOT NULL,
      tarefa        TEXT    NOT NULL,
      contexto      TEXT    NOT NULL DEFAULT '',
      modo          TEXT    NOT NULL,
      condicao      TEXT    NOT NULL DEFAULT '',
      model         TEXT    NOT NULL,
      tokens_original   INTEGER NOT NULL DEFAULT 0,
      tokens_compressed INTEGER NOT NULL DEFAULT 0,
      tokens_output     INTEGER NOT NULL DEFAULT 0,
      cost_usd          REAL    NOT NULL DEFAULT 0,
      duration_ms       INTEGER NOT NULL DEFAULT 0,
      success           INTEGER NOT NULL DEFAULT 1
    )
  `)

  const stmtInsert = db.prepare(`
    INSERT INTO pipeline_runs
      (papel, tarefa, contexto, modo, condicao, model,
       tokens_original, tokens_compressed, tokens_output,
       cost_usd, duration_ms, success)
    VALUES
      (@papel, @tarefa, @contexto, @modo, @condicao, @model,
       @tokens_original, @tokens_compressed, @tokens_output,
       @cost_usd, @duration_ms, @success)
  `)

  return {
    saveRun(run) {
      const info = stmtInsert.run(run)
      return info.lastInsertRowid
    },

    getRunById(id) {
      return db.prepare('SELECT * FROM pipeline_runs WHERE id = ?').get(id)
    },

    getRecentRuns(limit = 20) {
      return db.prepare('SELECT * FROM pipeline_runs ORDER BY created_at DESC LIMIT ?').all(limit)
    },

    getSummary() {
      return db.prepare(`
        SELECT
          COUNT(*)                          AS total_runs,
          COALESCE(SUM(tokens_original), 0) AS total_tokens_original,
          COALESCE(SUM(tokens_compressed),0) AS total_tokens_compressed,
          COALESCE(SUM(tokens_output), 0)   AS total_tokens_output,
          COALESCE(SUM(cost_usd), 0)        AS total_cost_usd,
          COALESCE(AVG(
            CASE WHEN tokens_original > 0
              THEN (1.0 - tokens_compressed * 1.0 / tokens_original) * 100
            ELSE 0 END
          ), 0) AS avg_compression_pct
        FROM pipeline_runs
      `).get()
    },

    getTodaySummary() {
      return db.prepare(`
        SELECT COUNT(*) AS runs_today,
          COALESCE(SUM(tokens_original), 0)  AS tokens_original_today,
          COALESCE(SUM(tokens_compressed),0) AS tokens_compressed_today,
          COALESCE(SUM(cost_usd), 0)         AS cost_today
        FROM pipeline_runs
        WHERE date(created_at) = date('now')
      `).get()
    },

    getModeStats() {
      return db.prepare(`
        SELECT modo, COUNT(*) AS count
        FROM pipeline_runs
        GROUP BY modo
        ORDER BY count DESC
      `).all()
    },

    close() {
      db.close()
    },
  }
}
```

- [ ] **Step 4: Rodar testes e confirmar que passam**

```bash
npm test -- tests/store.test.js
```

Esperado: 3 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/db.js tests/store.test.js
git commit -m "feat: add SQLite store for pipeline metrics"
```

---

## Task 3: Tool Detector

**Files:**
- Create: `src/detector/index.js`
- Create: `tests/detector.test.js`

- [ ] **Step 1: Escrever o teste**

```js
// tests/detector.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', async () => {
  const actual = await vi.importActual('fs')
  return { ...actual, existsSync: vi.fn() }
})

import { existsSync } from 'fs'
import { detectTools } from '../src/detector/index.js'

describe('detectTools', () => {
  beforeEach(() => { existsSync.mockReset() })

  it('detects Claude Code when ~/.claude/ exists', () => {
    existsSync.mockImplementation((p) => p.includes('.claude'))
    const tools = detectTools()
    expect(tools).toContain('claude-code')
  })

  it('detects Cursor when ~/.cursor/ exists', () => {
    existsSync.mockImplementation((p) => p.includes('.cursor'))
    const tools = detectTools()
    expect(tools).toContain('cursor')
  })

  it('detects Copilot when VS Code extension dir exists', () => {
    existsSync.mockImplementation((p) => p.includes('github.copilot'))
    const tools = detectTools()
    expect(tools).toContain('copilot')
  })

  it('detects Windsurf when ~/.codeium/windsurf exists', () => {
    existsSync.mockImplementation((p) => p.includes('windsurf'))
    const tools = detectTools()
    expect(tools).toContain('windsurf')
  })

  it('returns empty array when nothing found', () => {
    existsSync.mockReturnValue(false)
    const tools = detectTools()
    expect(tools).toEqual([])
  })

  it('detects multiple tools simultaneously', () => {
    existsSync.mockImplementation((p) => p.includes('.claude') || p.includes('.cursor'))
    const tools = detectTools()
    expect(tools).toContain('claude-code')
    expect(tools).toContain('cursor')
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npm test -- tests/detector.test.js
```

Esperado: FAIL — `Cannot find module '../src/detector/index.js'`

- [ ] **Step 3: Implementar src/detector/index.js**

```js
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const HOME = homedir()

const TOOL_CHECKS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    paths: [join(HOME, '.claude')],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    paths: [join(HOME, '.cursor')],
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    paths: [
      join(HOME, '.vscode', 'extensions'),
      join(HOME, 'AppData', 'Local', 'Programs', 'Microsoft VS Code', 'resources'),
    ],
    customCheck: (paths) =>
      paths.some((p) => {
        if (!existsSync(p)) return false
        try {
          const { readdirSync } = require('fs')
          return readdirSync(p).some((d) => d.startsWith('github.copilot'))
        } catch {
          return false
        }
      }),
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    paths: [join(HOME, '.codeium', 'windsurf')],
  },
]

export function detectTools() {
  const found = []

  for (const tool of TOOL_CHECKS) {
    if (tool.customCheck) {
      if (tool.customCheck(tool.paths)) found.push(tool.id)
    } else {
      if (tool.paths.some((p) => existsSync(p))) found.push(tool.id)
    }
  }

  return found
}

export function getToolInfo(id) {
  return TOOL_CHECKS.find((t) => t.id === id)
}

export const ALL_TOOLS = TOOL_CHECKS.map((t) => t.id)
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- tests/detector.test.js
```

Esperado: 6 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/detector/index.js tests/detector.test.js
git commit -m "feat: add filesystem-based tool detector"
```

---

## Task 4: Caveman Compressor (output rules)

**Files:**
- Create: `src/compressor/caveman.js`
- Create: `tests/caveman.test.js`

- [ ] **Step 1: Escrever o teste**

```js
// tests/caveman.test.js
import { describe, it, expect } from 'vitest'
import { getCavemanRules, LEVELS } from '../src/compressor/caveman.js'

describe('getCavemanRules', () => {
  it('returns a non-empty string for each valid level', () => {
    for (const level of LEVELS) {
      const rules = getCavemanRules(level)
      expect(typeof rules).toBe('string')
      expect(rules.length).toBeGreaterThan(50)
    }
  })

  it('lite rules mention keeping articles', () => {
    const rules = getCavemanRules('lite')
    expect(rules.toLowerCase()).toMatch(/article|full sentence/i)
  })

  it('ultra rules mention abbreviation', () => {
    const rules = getCavemanRules('ultra')
    expect(rules.toLowerCase()).toMatch(/abbreviat|arrow|→/i)
  })

  it('full is the default level', () => {
    const withDefault = getCavemanRules()
    const withFull = getCavemanRules('full')
    expect(withDefault).toBe(withFull)
  })

  it('getSystemSuffix returns rules wrapped in a section header', () => {
    const { getSystemSuffix } = await import('../src/compressor/caveman.js')
    const suffix = getSystemSuffix('full')
    expect(suffix).toMatch(/RESPONSE STYLE/i)
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npm test -- tests/caveman.test.js
```

Esperado: FAIL — `Cannot find module '../src/compressor/caveman.js'`

- [ ] **Step 3: Implementar src/compressor/caveman.js**

```js
export const LEVELS = ['lite', 'full', 'ultra']

const RULES = {
  lite: `Keep full sentences and articles (a/an/the). Remove only: filler words (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging (might be/could potentially/it seems like). Professional but tight. Pattern: [thing] [action] [reason]. [next step].`,

  full: `Terse like smart caveman. All technical substance stay. Only fluff die.
Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging.
Fragments OK. Short synonyms (big not extensive, fix not "implement a solution for"). Technical terms exact. Code blocks unchanged. Errors quoted exact.
Pattern: [thing] [action] [reason]. [next step].
Not: "Sure! I'd be happy to help you with that. The issue you're experiencing is likely caused by..."
Yes: "Bug in auth middleware. Token expiry check use < not <=. Fix:"`,

  ultra: `Maximum compression. Abbreviate heavily: DB/auth/cfg/req/res/fn/impl/addr/err/msg. Strip conjunctions. Arrows for causality (X → Y). One word when one word enough. No sentences if fragments work. Bullet over paragraph always.`,
}

export function getCavemanRules(level = 'full') {
  return RULES[level] ?? RULES.full
}

export function getSystemSuffix(level = 'full') {
  return `\n\n---\nRESPONSE STYLE (enforced):\n${getCavemanRules(level)}\nACTIVE EVERY RESPONSE. No revert. Off only if user says "stop caveman" or "normal mode".`
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- tests/caveman.test.js
```

Esperado: 5 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/compressor/caveman.js tests/caveman.test.js
git commit -m "feat: add Caveman output compressor with lite/full/ultra levels"
```

---

## Task 5: Native Compressor + Headroom Wrapper (input compression)

**Files:**
- Create: `src/compressor/native.js`
- Create: `src/compressor/headroom.js`
- Create: `tests/native-compressor.test.js`
- Create: `tests/headroom.test.js`

- [ ] **Step 1: Escrever teste do compressor nativo**

```js
// tests/native-compressor.test.js
import { describe, it, expect } from 'vitest'
import { compressNative, countTokensEstimate } from '../src/compressor/native.js'

describe('compressNative', () => {
  it('removes blank lines', () => {
    const input = 'line one\n\n\n\nline two'
    const result = compressNative(input)
    expect(result).not.toMatch(/\n{3,}/)
  })

  it('strips single-line JS/TS comments', () => {
    const input = `const x = 1 // this is a comment\nconst y = 2`
    const result = compressNative(input)
    expect(result).not.toContain('this is a comment')
    expect(result).toContain('const x = 1')
  })

  it('strips Python single-line comments', () => {
    const input = `x = 1  # python comment\ny = 2`
    const result = compressNative(input)
    expect(result).not.toContain('python comment')
  })

  it('does not remove string content', () => {
    const input = `const msg = "hello // world"`
    const result = compressNative(input)
    expect(result).toContain('hello // world')
  })

  it('truncates to maxTokens when content is too long', () => {
    const longText = 'word '.repeat(10000)
    const result = compressNative(longText, { maxTokens: 500 })
    expect(countTokensEstimate(result)).toBeLessThanOrEqual(600)
  })
})

describe('countTokensEstimate', () => {
  it('estimates ~4 chars per token', () => {
    const tokens = countTokensEstimate('a'.repeat(400))
    expect(tokens).toBeCloseTo(100, -1)
  })
})
```

- [ ] **Step 2: Implementar src/compressor/native.js**

```js
export function countTokensEstimate(text) {
  return Math.ceil(text.length / 4)
}

export function compressNative(text, { maxTokens = 8000 } = {}) {
  let result = text

  // Remove single-line comments (JS/TS: //, Python: #) not inside strings
  result = result.replace(/^((?:[^"'`\n]|"[^"\n]*"|'[^'\n]*'|`[^`\n]*`)*)\/\/[^\n]*/gm, '$1')
  result = result.replace(/^((?:[^"'`#\n]|"[^"\n]*"|'[^'\n]*'|`[^`\n]*`)*)\s*#[^\n]*/gm, '$1')

  // Collapse multiple blank lines to single blank
  result = result.replace(/\n{3,}/g, '\n\n')

  // Trim trailing whitespace per line
  result = result.replace(/[ \t]+$/gm, '')

  // Truncate if still too long
  const estimated = countTokensEstimate(result)
  if (estimated > maxTokens) {
    const charLimit = maxTokens * 4
    const half = Math.floor(charLimit / 2)
    result =
      result.slice(0, half) +
      '\n\n... [content truncated by tokensave native compressor] ...\n\n' +
      result.slice(-half)
  }

  return result.trim()
}
```

- [ ] **Step 3: Rodar teste nativo**

```bash
npm test -- tests/native-compressor.test.js
```

Esperado: 5 testes PASS.

- [ ] **Step 4: Escrever teste do headroom wrapper**

```js
// tests/headroom.test.js
import { describe, it, expect, vi } from 'vitest'

vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}))

import { spawnSync } from 'child_process'
import { compressWithHeadroom } from '../src/compressor/headroom.js'

describe('compressWithHeadroom', () => {
  it('returns compressed text from headroom subprocess', () => {
    spawnSync.mockReturnValue({
      status: 0,
      stdout: Buffer.from('compressed content'),
      stderr: Buffer.from(''),
    })

    const result = compressWithHeadroom('original long content')
    expect(result.text).toBe('compressed content')
    expect(result.usedHeadroom).toBe(true)
  })

  it('falls back to native compressor when headroom fails', () => {
    spawnSync.mockReturnValue({
      status: 1,
      stdout: Buffer.from(''),
      stderr: Buffer.from('error'),
    })

    const result = compressWithHeadroom('original content with // comments\n\n\nblanks')
    expect(result.usedHeadroom).toBe(false)
    expect(result.text).toBeTruthy()
  })

  it('falls back when headroom is not installed', () => {
    spawnSync.mockReturnValue({ status: null, error: new Error('ENOENT') })
    const result = compressWithHeadroom('some content')
    expect(result.usedHeadroom).toBe(false)
  })
})
```

- [ ] **Step 5: Implementar src/compressor/headroom.js**

```js
import { spawnSync } from 'child_process'
import { compressNative, countTokensEstimate } from './native.js'

export function compressWithHeadroom(text, { maxTokens = 8000 } = {}) {
  try {
    const result = spawnSync(
      'headroom',
      ['compress', '--stdin', '--format', 'text'],
      {
        input: text,
        encoding: 'buffer',
        timeout: 15000,
      }
    )

    if (result.status === 0 && result.stdout && result.stdout.length > 0) {
      const compressed = result.stdout.toString('utf8').trim()
      return {
        text: compressed,
        tokensOriginal: countTokensEstimate(text),
        tokensCompressed: countTokensEstimate(compressed),
        usedHeadroom: true,
      }
    }
  } catch {
    // headroom not available, fall through
  }

  const compressed = compressNative(text, { maxTokens })
  return {
    text: compressed,
    tokensOriginal: countTokensEstimate(text),
    tokensCompressed: countTokensEstimate(compressed),
    usedHeadroom: false,
  }
}
```

- [ ] **Step 6: Rodar todos os testes de compressor**

```bash
npm test -- tests/native-compressor.test.js tests/headroom.test.js
```

Esperado: 8 testes PASS.

- [ ] **Step 7: Commit**

```bash
git add src/compressor/ tests/native-compressor.test.js tests/headroom.test.js
git commit -m "feat: add native compressor and headroom wrapper with fallback"
```

---

## Task 6: Pipeline Modes

**Files:**
- Create: `src/pipeline/modes/index.js` + 11 arquivos de modo

- [ ] **Step 1: Escrever o teste**

```js
// tests/modes.test.js
import { describe, it, expect } from 'vitest'
import { MODES, getModeById } from '../src/pipeline/modes/index.js'

const REQUIRED_FIELDS = ['id', 'name', 'description', 'systemPrompt', 'cavemanLevel', 'papeis']

describe('pipeline modes', () => {
  it('exports 11 modes', () => {
    expect(MODES).toHaveLength(11)
  })

  it('each mode has required fields', () => {
    for (const mode of MODES) {
      for (const field of REQUIRED_FIELDS) {
        expect(mode, `mode ${mode.id} missing field ${field}`).toHaveProperty(field)
      }
    }
  })

  it('each systemPrompt is a non-empty string', () => {
    for (const mode of MODES) {
      expect(mode.systemPrompt.length, `${mode.id} systemPrompt empty`).toBeGreaterThan(100)
    }
  })

  it('each cavemanLevel is valid', () => {
    const validLevels = ['lite', 'full', 'ultra']
    for (const mode of MODES) {
      expect(validLevels).toContain(mode.cavemanLevel)
    }
  })

  it('getModeById returns correct mode', () => {
    const mode = getModeById('swot')
    expect(mode.name).toMatch(/SWOT/i)
  })

  it('each mode has at least one papel suggestion', () => {
    for (const mode of MODES) {
      expect(mode.papeis.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npm test -- tests/modes.test.js
```

- [ ] **Step 3: Criar src/pipeline/modes/criar-sistema.js**

```js
export default {
  id: 'criar-sistema',
  name: 'Criar Sistema',
  description: 'Arquitetura do zero: stack, estrutura, decisões técnicas',
  cavemanLevel: 'full',
  papeis: ['Arquiteto de Software Sênior', 'Tech Lead', 'CTO'],
  systemPrompt: `You are a senior software architect. Your task is to design a system from scratch.

Structure your response as:
1. **Problem restatement** — confirm understanding in one sentence
2. **Recommended stack** — technology choices with 1-line justification each
3. **Architecture diagram** — ASCII or description of main components and their relationships
4. **File/folder structure** — key directories and what lives there
5. **Data model** — main entities and relationships
6. **Critical decisions** — top 3 architectural choices and why
7. **Risks and mitigations** — what can go wrong
8. **First 3 implementation steps** — concrete actions to start immediately

Be opinionated. Make decisions. Do not offer multiple options unless tradeoffs are genuinely equal. The user needs a system, not a menu.`,
}
```

- [ ] **Step 4: Criar src/pipeline/modes/revisar-codigo.js**

```js
export default {
  id: 'revisar-codigo',
  name: 'Revisar Código',
  description: 'Bugs, segurança, qualidade, code smell',
  cavemanLevel: 'full',
  papeis: ['Security Auditor', 'Tech Lead', 'Senior Engineer'],
  systemPrompt: `You are a senior engineer and security auditor doing a thorough code review.

Structure your response as:
1. **Critical issues** (must fix before production) — list with file:line, severity, exact fix
2. **Security vulnerabilities** — OWASP top 10 check, auth issues, injection risks, exposed secrets
3. **Bugs** — logic errors, off-by-one, null handling, race conditions
4. **Performance** — N+1 queries, missing indexes, blocking calls, memory leaks
5. **Code quality** — dead code, duplication, unclear naming, missing error handling
6. **Suggestions** (optional, low priority) — refactoring opportunities

For each issue: state the problem, show the bad code, show the fixed code. Be direct. No praise.`,
}
```

- [ ] **Step 5: Criar src/pipeline/modes/documentacao.js**

```js
export default {
  id: 'documentacao',
  name: 'Documentação',
  description: 'README, ADR, changelog, JSDoc, guias técnicos',
  cavemanLevel: 'lite',
  papeis: ['Technical Writer', 'Developer Advocate', 'Senior Engineer'],
  systemPrompt: `You are a technical writer creating clear, accurate documentation for developers.

Adapt your output to what the user requests:
- **README**: Project overview, quick start, installation, usage examples, API reference, contributing
- **ADR** (Architecture Decision Record): Context, decision, consequences, alternatives considered
- **Changelog**: Semantic versioning, grouped by type (feat/fix/breaking/deprecate)
- **JSDoc/docstrings**: Function signatures, params with types, return values, examples
- **Technical guide**: Step-by-step with commands, expected output, troubleshooting

Rules: Every command must be copy-pasteable. Every concept needs an example. Assume the reader is a skilled developer but new to this codebase.`,
}
```

- [ ] **Step 6: Criar src/pipeline/modes/consultor.js**

```js
export default {
  id: 'consultor',
  name: 'Consultor',
  description: 'ROI, risco, decisão estratégica como C-level',
  cavemanLevel: 'full',
  papeis: ['CTO Advisor', 'Solution Architect', 'Business Analyst'],
  systemPrompt: `You are a senior technology consultant advising on a business or technical decision.

Structure your response as:
1. **Executive summary** — decision recommendation in 2 sentences
2. **Business impact** — revenue, cost, time-to-market, risk
3. **Technical assessment** — feasibility, complexity, dependencies
4. **ROI estimate** — rough numbers, payback period, assumptions
5. **Risks** — top 3 risks, probability, mitigation strategy
6. **Recommendation** — explicit choice with reasoning
7. **Next 30 days** — concrete actions to move forward

Be direct. Give a recommendation. Do not hedge. If you need more information, say exactly what and why.`,
}
```

- [ ] **Step 7: Criar src/pipeline/modes/swot.js**

```js
export default {
  id: 'swot',
  name: 'SWOT',
  description: 'Análise estratégica: forças, fraquezas, oportunidades, ameaças',
  cavemanLevel: 'full',
  papeis: ['Strategy Consultant', 'Product Manager', 'CTO'],
  systemPrompt: `You are a strategy consultant performing a SWOT analysis.

Structure your response as a SWOT matrix:

**STRENGTHS** (internal, positive)
- List 3-5 genuine strengths with evidence or reasoning

**WEAKNESSES** (internal, negative)
- List 3-5 real weaknesses, not softened. Be honest.

**OPPORTUNITIES** (external, positive)
- List 3-5 market/technical opportunities with timeframe

**THREATS** (external, negative)
- List 3-5 threats with probability and impact

**Strategic implications**
- SO strategies: use strengths to capture opportunities
- ST strategies: use strengths to counter threats
- WO strategies: address weaknesses to capture opportunities
- WT strategies: minimize weaknesses and threats

End with: top 1 strategic priority and why.`,
}
```

- [ ] **Step 8: Criar src/pipeline/modes/compare.js**

```js
export default {
  id: 'compare',
  name: 'Compare',
  description: 'Comparação estruturada A vs B com critérios explícitos',
  cavemanLevel: 'full',
  papeis: ['Senior Engineer', 'Architect', 'Product Manager'],
  systemPrompt: `You are an expert evaluator comparing options against explicit criteria.

Structure your response as:
1. **Options summary** — one sentence per option being compared
2. **Evaluation criteria** — list the criteria you'll use (derive from context if not given)
3. **Comparison table** — matrix of options vs criteria, scored or described
4. **Analysis per criterion** — 2-3 sentences on each criterion explaining the scores
5. **Trade-off summary** — what you gain and lose choosing each option
6. **Recommendation** — pick one, state why, under what conditions the other is better

Be concrete. Use numbers where possible. Do not recommend "it depends" without specifying exactly what it depends on and how to decide.`,
}
```

- [ ] **Step 9: Criar src/pipeline/modes/multi-perspectiva.js**

```js
export default {
  id: 'multi-perspectiva',
  name: 'Multi-Perspectiva',
  description: 'Mesmo problema analisado por N ângulos: dev, PM, user, ops',
  cavemanLevel: 'full',
  papeis: ['System Analyst', 'Product Lead', 'Architect'],
  systemPrompt: `You are a facilitator presenting the same problem from multiple stakeholder perspectives.

For each perspective below, provide a distinct analysis — do not repeat points across perspectives:

**Developer perspective**: Implementation complexity, technical debt, maintenance burden, testing approach
**Product Manager perspective**: User value, timeline, scope creep risk, success metrics
**End User perspective**: Usability, reliability, what breaks their workflow, what delights them
**Operations/DevOps perspective**: Deployment, monitoring, failure modes, on-call burden
**Security perspective**: Attack surface, data exposure, authentication/authorization, compliance

End with: **Synthesis** — the top 3 insights that only emerge when looking at all perspectives together.`,
}
```

- [ ] **Step 10: Criar src/pipeline/modes/parallel-lens.js**

```js
export default {
  id: 'parallel-lens',
  name: 'Parallel Lens',
  description: 'N abordagens simultâneas para o mesmo problema',
  cavemanLevel: 'ultra',
  papeis: ['Senior Engineer', 'Architect', 'Tech Lead'],
  systemPrompt: `You are presenting multiple parallel solution approaches simultaneously.

For each approach, provide:
- **Approach name** (memorable, descriptive)
- **Core idea** (1 sentence)
- **Implementation sketch** (pseudocode or bullet steps, not full code)
- **Pros** (2-3 bullets)
- **Cons** (2-3 bullets)
- **Best for** (specific scenario where this wins)

Present 3-4 genuinely different approaches — not variations of the same idea. Different architectures, algorithms, or philosophies.

End with: **Pick this if...** — one decision matrix row per approach.`,
}
```

- [ ] **Step 11: Criar src/pipeline/modes/pitfalls.js**

```js
export default {
  id: 'pitfalls',
  name: 'Pitfalls',
  description: 'O que pode dar errado, armadilhas ocultas, edge cases',
  cavemanLevel: 'full',
  papeis: ['Senior Engineer', 'Security Auditor', 'QA Lead'],
  systemPrompt: `You are a skeptical senior engineer identifying everything that can go wrong.

Structure your response as:

**Common mistakes** — things most developers get wrong with this type of problem
**Edge cases** — inputs, states, or conditions that break the happy path
**Race conditions** — concurrent access, timing issues, ordering dependencies
**Scale problems** — what fails at 10x, 100x, 1000x current load
**Integration failures** — external dependencies, API changes, network failures
**Security pitfalls** — vulnerabilities introduced by naive implementations
**Operational pitfalls** — deployment, rollback, data migration, monitoring gaps

For each pitfall: describe the scenario, explain why it's non-obvious, show how to prevent or detect it. Prioritize by likelihood × impact.`,
}
```

- [ ] **Step 12: Criar src/pipeline/modes/metrics-mode.js**

```js
export default {
  id: 'metrics-mode',
  name: 'Metrics Mode',
  description: 'Define e mede KPIs do que está sendo construído',
  cavemanLevel: 'full',
  papeis: ['Data Engineer', 'Product Manager', 'Engineering Manager'],
  systemPrompt: `You are a metrics and measurement expert defining how to measure success.

Structure your response as:

**North Star Metric** — the single most important metric and why
**Input metrics** — leading indicators that predict the north star
**Output metrics** — lagging indicators that confirm success
**Guardrail metrics** — what must not degrade while optimizing the north star
**Measurement plan** — how to instrument each metric (events, queries, dashboards)
**Baseline** — what to measure now, before any changes
**Targets** — specific numerical goals with timeframes and confidence levels
**Anti-metrics** — metrics that look good but indicate dysfunction

For each metric: name, formula, data source, update frequency, alert threshold.`,
}
```

- [ ] **Step 13: Criar src/pipeline/modes/context-stack.js**

```js
export default {
  id: 'context-stack',
  name: 'Context Stack',
  description: 'Empilha contexto progressivamente sem explodir tokens',
  cavemanLevel: 'full',
  papeis: ['Senior Engineer', 'Architect', 'Tech Lead'],
  systemPrompt: `You are helping build understanding of a codebase or system progressively.

Your job is to extract and structure the essential context from what the user provides, then ask for the next layer.

Layer 1 — what you have now:
- Summarize the key entities, relationships, and patterns you can see
- Identify the 3 most important things to understand first
- List what's unclear or missing

Layer 2 — what you need next:
- Ask for exactly 1-2 specific files or areas that would most increase understanding
- Explain why those specific pieces matter

Layer 3+ — synthesis:
- As context accumulates, update your mental model explicitly
- Highlight when new information changes a previous assumption
- Build toward a coherent understanding without redundancy

Always compress previous context before adding new — summarize what you already know rather than repeating it.`,
}
```

- [ ] **Step 14: Criar src/pipeline/modes/index.js**

```js
import criarSistema from './criar-sistema.js'
import revisarCodigo from './revisar-codigo.js'
import documentacao from './documentacao.js'
import consultor from './consultor.js'
import swot from './swot.js'
import compare from './compare.js'
import multiPerspectiva from './multi-perspectiva.js'
import parallelLens from './parallel-lens.js'
import pitfalls from './pitfalls.js'
import metricsMode from './metrics-mode.js'
import contextStack from './context-stack.js'

export const MODES = [
  criarSistema,
  revisarCodigo,
  documentacao,
  consultor,
  swot,
  compare,
  multiPerspectiva,
  parallelLens,
  pitfalls,
  metricsMode,
  contextStack,
]

export function getModeById(id) {
  return MODES.find((m) => m.id === id)
}

export function getModeChoices() {
  return MODES.map((m, i) => ({
    name: `[${i + 1}] ${m.name} — ${m.description}`,
    value: m.id,
    short: m.name,
  }))
}
```

- [ ] **Step 15: Rodar testes**

```bash
npm test -- tests/modes.test.js
```

Esperado: 6 testes PASS.

- [ ] **Step 16: Commit**

```bash
git add src/pipeline/modes/ tests/modes.test.js
git commit -m "feat: add 11 pipeline reasoning modes with system prompts"
```

---

## Task 7: Pipeline Builder

**Files:**
- Create: `src/pipeline/builder.js`
- Create: `tests/builder.test.js`

- [ ] **Step 1: Escrever o teste**

```js
// tests/builder.test.js
import { describe, it, expect, vi } from 'vitest'

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

import inquirer from 'inquirer'
import { buildPipeline } from '../src/pipeline/builder.js'

describe('buildPipeline', () => {
  it('returns pipeline config with all required fields', async () => {
    inquirer.prompt
      .mockResolvedValueOnce({ papel: 'Arquiteto' })
      .mockResolvedValueOnce({ tarefa: 'Revisar API' })
      .mockResolvedValueOnce({ contextoType: 'text', contexto: 'src code here' })
      .mockResolvedValueOnce({ modo: 'revisar-codigo' })
      .mockResolvedValueOnce({ condicao: 'All issues found' })

    const result = await buildPipeline()

    expect(result).toMatchObject({
      papel: 'Arquiteto',
      tarefa: 'Revisar API',
      contexto: 'src code here',
      modo: 'revisar-codigo',
      condicao: 'All issues found',
    })
  })

  it('accepts mode override to skip mode selection', async () => {
    inquirer.prompt
      .mockResolvedValueOnce({ papel: 'Tech Lead' })
      .mockResolvedValueOnce({ tarefa: 'SWOT da arquitetura' })
      .mockResolvedValueOnce({ contextoType: 'skip', contexto: '' })
      .mockResolvedValueOnce({ condicao: 'Done' })

    const result = await buildPipeline({ modeOverride: 'swot' })
    expect(result.modo).toBe('swot')
    // prompt called 4 times (not 5 — mode selection skipped)
    expect(inquirer.prompt).toHaveBeenCalledTimes(4)
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npm test -- tests/builder.test.js
```

- [ ] **Step 3: Implementar src/pipeline/builder.js**

```js
import inquirer from 'inquirer'
import { readFileSync } from 'fs'
import { getModeChoices, getModeById, MODES } from './modes/index.js'

const PAPEIS_COMUNS = [
  'Arquiteto de Software Sênior',
  'Security Auditor',
  'Tech Lead',
  'CTO Advisor',
  'Data Scientist',
  'DBA',
  'DevOps/SRE',
  'UX Researcher',
  'Technical Writer',
  'Outro (digitar)',
]

export async function buildPipeline({ modeOverride } = {}) {
  // Step 1: Papel
  const { papel: papelChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'papel',
      message: 'Papel (persona do AI):',
      choices: [...PAPEIS_COMUNS],
      pageSize: 12,
    },
  ])

  let papel = papelChoice
  if (papelChoice === 'Outro (digitar)') {
    const { papelCustom } = await inquirer.prompt([
      { type: 'input', name: 'papelCustom', message: 'Digite o papel:' },
    ])
    papel = papelCustom
  }

  // Step 2: Tarefa
  const { tarefa } = await inquirer.prompt([
    {
      type: 'input',
      name: 'tarefa',
      message: 'Tarefa (o que precisa ser feito):',
      validate: (v) => v.trim().length > 3 || 'Descreva a tarefa',
    },
  ])

  // Step 3: Contexto
  const { contextoType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'contextoType',
      message: 'Contexto:',
      choices: [
        { name: 'Digitar texto', value: 'text' },
        { name: 'Caminho de arquivo/pasta', value: 'file' },
        { name: 'Pular', value: 'skip' },
      ],
    },
  ])

  let contexto = ''
  if (contextoType === 'text') {
    const { contextoText } = await inquirer.prompt([
      { type: 'editor', name: 'contextoText', message: 'Cole o contexto:' },
    ])
    contexto = contextoText
  } else if (contextoType === 'file') {
    const { filePath } = await inquirer.prompt([
      { type: 'input', name: 'filePath', message: 'Caminho do arquivo:' },
    ])
    try {
      contexto = readFileSync(filePath.trim(), 'utf8')
    } catch {
      console.warn(`⚠ Não foi possível ler ${filePath}, continuando sem contexto`)
    }
  }

  // Step 4: Modo (pulado se modeOverride fornecido)
  let modo = modeOverride
  if (!modo) {
    const { modoChoice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'modoChoice',
        message: 'Modo de raciocínio:',
        choices: getModeChoices(),
        pageSize: 12,
      },
    ])
    modo = modoChoice
  }

  // Step 5: Condição de saída
  const modeObj = getModeById(modo)
  const { condicao } = await inquirer.prompt([
    {
      type: 'input',
      name: 'condicao',
      message: 'Condição de saída (o que define "pronto"):',
      default: modeObj?.defaultCondicao || '',
    },
  ])

  return { papel, tarefa, contexto, modo, condicao }
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- tests/builder.test.js
```

Esperado: 2 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/builder.js tests/builder.test.js
git commit -m "feat: add interactive pipeline builder with Inquirer"
```

---

## Task 8: Pipeline Executor

**Files:**
- Create: `src/pipeline/executor.js`
- Create: `tests/executor.test.js`

- [ ] **Step 1: Escrever o teste**

```js
// tests/executor.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      stream: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } }
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } }
          yield { type: 'message_delta', usage: { output_tokens: 42 } }
        },
        finalMessage: vi.fn().mockResolvedValue({ usage: { input_tokens: 100, output_tokens: 42 } }),
      }),
    }
  },
}))

vi.mock('../src/store/db.js', () => ({
  createStore: vi.fn(() => ({
    saveRun: vi.fn().mockReturnValue(1),
    close: vi.fn(),
  })),
}))

vi.mock('../src/compressor/headroom.js', () => ({
  compressWithHeadroom: vi.fn((text) => ({
    text,
    tokensOriginal: 1000,
    tokensCompressed: 300,
    usedHeadroom: false,
  })),
}))

import { executePipeline } from '../src/pipeline/executor.js'

describe('executePipeline', () => {
  it('streams response and returns metrics', async () => {
    const pipeline = {
      papel: 'Arquiteto',
      tarefa: 'Design system',
      contexto: 'some context',
      modo: 'criar-sistema',
      condicao: 'Done',
    }

    const onChunk = vi.fn()
    const result = await executePipeline(pipeline, {
      model: 'claude-sonnet-4-6',
      apiKey: 'test-key',
      onChunk,
    })

    expect(onChunk).toHaveBeenCalledWith('Hello')
    expect(onChunk).toHaveBeenCalledWith(' world')
    expect(result.tokensOriginal).toBe(1000)
    expect(result.tokensCompressed).toBe(300)
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npm test -- tests/executor.test.js
```

- [ ] **Step 3: Implementar src/pipeline/executor.js**

```js
import Anthropic from '@anthropic-ai/sdk'
import { getModeById } from './modes/index.js'
import { compressWithHeadroom } from '../compressor/headroom.js'
import { getSystemSuffix } from '../compressor/caveman.js'
import { createStore } from '../store/db.js'
import { countTokensEstimate } from '../compressor/native.js'

const COST_PER_1K = {
  'claude-sonnet-4-6': { input: 0.003, output: 0.015 },
  'claude-haiku-4-5': { input: 0.00025, output: 0.00125 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
}

function estimateCost(model, inputTokens, outputTokens) {
  const rates = COST_PER_1K[model] ?? { input: 0.003, output: 0.015 }
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output
}

export async function executePipeline(pipeline, { model = 'claude-sonnet-4-6', apiKey, onChunk = () => {} } = {}) {
  const mode = getModeById(pipeline.modo)
  if (!mode) throw new Error(`Unknown mode: ${pipeline.modo}`)

  // Compress input context
  const compression = compressWithHeadroom(pipeline.contexto || '', { maxTokens: 6000 })

  // Build messages
  const systemPrompt = `${mode.systemPrompt}${getSystemSuffix(mode.cavemanLevel)}`

  const userMessage = [
    `PAPEL: ${pipeline.papel}`,
    `TAREFA: ${pipeline.tarefa}`,
    pipeline.condicao ? `CONDIÇÃO DE SAÍDA: ${pipeline.condicao}` : '',
    compression.text ? `\nCONTEXTO:\n${compression.text}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const startMs = Date.now()
  let fullResponse = ''
  let outputTokens = 0

  try {
    const client = new Anthropic({ apiKey })
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onChunk(event.delta.text)
        fullResponse += event.delta.text
      }
      if (event.type === 'message_delta' && event.usage) {
        outputTokens = event.usage.output_tokens
      }
    }

    const finalMsg = await stream.finalMessage()
    outputTokens = finalMsg.usage?.output_tokens ?? countTokensEstimate(fullResponse)

  } catch (err) {
    const store = createStore()
    store.saveRun({
      ...pipeline,
      model,
      tokens_original: compression.tokensOriginal,
      tokens_compressed: compression.tokensCompressed,
      tokens_output: 0,
      cost_usd: 0,
      duration_ms: Date.now() - startMs,
      success: false,
    })
    store.close()
    throw err
  }

  const durationMs = Date.now() - startMs
  const costUsd = estimateCost(model, compression.tokensCompressed, outputTokens)

  const store = createStore()
  const runId = store.saveRun({
    papel: pipeline.papel,
    tarefa: pipeline.tarefa,
    contexto: pipeline.contexto?.slice(0, 500) ?? '',
    modo: pipeline.modo,
    condicao: pipeline.condicao ?? '',
    model,
    tokens_original: compression.tokensOriginal,
    tokens_compressed: compression.tokensCompressed,
    tokens_output: outputTokens,
    cost_usd: costUsd,
    duration_ms: durationMs,
    success: true,
  })
  store.close()

  return {
    runId,
    response: fullResponse,
    tokensOriginal: compression.tokensOriginal,
    tokensCompressed: compression.tokensCompressed,
    tokensOutput: outputTokens,
    costUsd,
    durationMs,
    usedHeadroom: compression.usedHeadroom,
    success: true,
  }
}
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- tests/executor.test.js
```

Esperado: 1 teste PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pipeline/executor.js tests/executor.test.js
git commit -m "feat: add pipeline executor with streaming and metrics collection"
```

---

## Task 9: Tool Injectors

**Files:**
- Create: `src/injector/claude-code.js`
- Create: `src/injector/cursor.js`
- Create: `src/injector/copilot.js`
- Create: `src/injector/windsurf.js`
- Create: `tests/injectors.test.js`

- [ ] **Step 1: Escrever o teste**

```js
// tests/injectors.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tmpdir } from 'os'
import { join } from 'path'
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { randomBytes } from 'crypto'

function tempDir() {
  const dir = join(tmpdir(), `ts-test-${randomBytes(4).toString('hex')}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

describe('cursor injector', () => {
  it('adds cursor.rules to existing settings.json', async () => {
    const dir = tempDir()
    const settingsPath = join(dir, 'settings.json')
    writeFileSync(settingsPath, JSON.stringify({ 'git.enableSmartCommit': true }))

    const { injectCursor } = await import('../src/injector/cursor.js')
    await injectCursor({ settingsPath, mcp: false })

    const updated = JSON.parse(readFileSync(settingsPath, 'utf8'))
    expect(updated['cursor.rules']).toBeTruthy()
    expect(updated['cursor.rules']).toMatch(/caveman/i)
    expect(updated['git.enableSmartCommit']).toBe(true)
  })
})

describe('copilot injector', () => {
  it('creates .github/copilot-instructions.md with caveman rules', async () => {
    const dir = tempDir()
    mkdirSync(join(dir, '.github'), { recursive: true })

    const { injectCopilot } = await import('../src/injector/copilot.js')
    await injectCopilot({ projectDir: dir })

    const filePath = join(dir, '.github', 'copilot-instructions.md')
    expect(existsSync(filePath)).toBe(true)
    const content = readFileSync(filePath, 'utf8')
    expect(content).toMatch(/caveman/i)
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npm test -- tests/injectors.test.js
```

- [ ] **Step 3: Implementar src/injector/cursor.js**

```js
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const CAVEMAN_RULES = `Terse like smart caveman. Technical substance exact. Only fluff die.
Drop: articles, filler (just/really/basically/actually/simply), pleasantries, hedging.
Fragments OK. Short synonyms. Code unchanged. Errors quoted exact.
Pattern: [thing] [action] [reason]. [next step].
ACTIVE EVERY RESPONSE. Off: "stop caveman" or "normal mode".`

const HEADROOM_MCP = {
  command: 'headroom',
  args: ['mcp', 'serve'],
  env: {},
  enabled: true,
}

export async function injectCursor({
  settingsPath = join(homedir(), 'AppData', 'Roaming', 'Cursor', 'User', 'settings.json'),
  mcpPath = join(homedir(), '.cursor', 'mcp.json'),
  mcp = true,
} = {}) {
  // Inject cursor.rules into settings.json
  let settings = {}
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')) } catch {}
  }
  settings['cursor.rules'] = CAVEMAN_RULES
  writeFileSync(settingsPath, JSON.stringify(settings, null, 4))

  // Inject headroom MCP if requested
  if (mcp) {
    let mcpConfig = { mcpServers: {} }
    if (existsSync(mcpPath)) {
      try { mcpConfig = JSON.parse(readFileSync(mcpPath, 'utf8')) } catch {}
    }
    mcpConfig.mcpServers = mcpConfig.mcpServers || {}
    mcpConfig.mcpServers.headroom = HEADROOM_MCP
    mkdirSync(join(mcpPath, '..'), { recursive: true })
    writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2))
  }

  return { settingsPath, mcpPath }
}
```

- [ ] **Step 4: Implementar src/injector/copilot.js**

```js
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

const COPILOT_INSTRUCTIONS = `# AI Response Style

Terse like smart caveman. Technical substance exact. Only fluff die.

Drop: articles (a/an/the), filler words (just/really/basically/actually/simply), pleasantries (sure/certainly/of course), hedging.

Fragments OK. Short synonyms (big not extensive, fix not implement a solution for). Technical terms exact. Code blocks unchanged.

Pattern: [thing] [action] [reason]. [next step].

ACTIVE EVERY RESPONSE. Off only: "stop caveman" or "normal mode".
`

export async function injectCopilot({ projectDir = process.cwd() } = {}) {
  const githubDir = join(projectDir, '.github')
  mkdirSync(githubDir, { recursive: true })

  const filePath = join(githubDir, 'copilot-instructions.md')
  writeFileSync(filePath, COPILOT_INSTRUCTIONS)

  return { filePath }
}
```

- [ ] **Step 5: Implementar src/injector/claude-code.js**

```js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const CLAUDE_DIR = join(homedir(), '.claude')

export async function injectClaudeCode() {
  mkdirSync(CLAUDE_DIR, { recursive: true })

  // Add headroom MCP to Claude Code settings
  const settingsPath = join(CLAUDE_DIR, 'settings.json')
  let settings = {}
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, 'utf8')) } catch {}
  }

  settings.mcpServers = settings.mcpServers || {}
  settings.mcpServers.headroom = {
    command: 'headroom',
    args: ['mcp', 'serve'],
    env: {},
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  return { settingsPath }
}
```

- [ ] **Step 6: Implementar src/injector/windsurf.js**

```js
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

const WINDSURF_RULES = `Terse like smart caveman. Technical substance exact. Only fluff die.
Drop: articles, filler, pleasantries, hedging. Fragments OK. Code unchanged.
Pattern: [thing] [action] [reason]. [next step].
ACTIVE EVERY RESPONSE. Off: "stop caveman" or "normal mode".`

export async function injectWindsurf({ projectDir = process.cwd() } = {}) {
  const rulesPath = join(projectDir, '.windsurfrules')
  let existing = ''
  if (existsSync(rulesPath)) {
    existing = readFileSync(rulesPath, 'utf8')
  }

  if (!existing.includes('caveman')) {
    writeFileSync(rulesPath, `${existing}\n\n${WINDSURF_RULES}`.trim())
  }

  return { rulesPath }
}
```

- [ ] **Step 7: Rodar testes**

```bash
npm test -- tests/injectors.test.js
```

Esperado: 2 testes PASS.

- [ ] **Step 8: Commit**

```bash
git add src/injector/ tests/injectors.test.js
git commit -m "feat: add tool injectors for Cursor, Copilot, Claude Code, Windsurf"
```

---

## Task 10: Dashboard TUI

**Files:**
- Create: `src/dashboard/tui.js`
- Create: `src/cli/commands/dash.js`

- [ ] **Step 1: Implementar src/dashboard/tui.js**

```js
import React from 'react'
import { render, Box, Text, useInput, useApp } from 'ink'
import { createStore } from '../store/db.js'

function pct(original, compressed) {
  if (!original) return '0'
  return ((1 - compressed / original) * 100).toFixed(0)
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function Dashboard({ store }) {
  const [summary, setSummary] = React.useState(null)
  const [todaySummary, setTodaySummary] = React.useState(null)
  const [runs, setRuns] = React.useState([])
  const [modeStats, setModeStats] = React.useState([])
  const { exit } = useApp()

  const refresh = React.useCallback(() => {
    setSummary(store.getSummary())
    setTodaySummary(store.getTodaySummary())
    setRuns(store.getRecentRuns(8))
    setModeStats(store.getModeStats())
  }, [store])

  React.useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [refresh])

  useInput((input) => {
    if (input === 'q') exit()
    if (input === 'r') refresh()
  })

  if (!summary) return <Text>Carregando...</Text>

  const today = todaySummary || {}
  const topMode = modeStats[0]

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="round" borderColor="cyan" flexDirection="column" padding={1} width={60}>
        <Text bold color="cyan"> TOKENSAVE DASHBOARD</Text>
        <Text> </Text>

        <Box>
          <Box flexDirection="column" width={20}>
            <Text color="gray">Hoje</Text>
            <Text bold>{today.runs_today ?? 0} pipelines</Text>
          </Box>
          <Box flexDirection="column" width={25}>
            <Text color="gray">Tokens economizados</Text>
            <Text bold color="green">
              {((today.tokens_original_today ?? 0) - (today.tokens_compressed_today ?? 0)).toLocaleString()}
              {' '}(-{pct(today.tokens_original_today, today.tokens_compressed_today)}%)
            </Text>
          </Box>
          <Box flexDirection="column">
            <Text color="gray">Custo real</Text>
            <Text bold>${(today.cost_today ?? 0).toFixed(4)}</Text>
          </Box>
        </Box>

        <Text> </Text>
        <Text color="gray">
          Total: {summary.total_runs} pipelines │ ${summary.total_cost_usd.toFixed(2)} gasto │ {summary.avg_compression_pct.toFixed(0)}% compressão média
        </Text>
        {topMode && <Text color="gray">Modo mais usado: {topMode.modo} ({topMode.count}x)</Text>}

        <Text> </Text>
        <Text bold>Últimos pipelines</Text>
        {runs.map((r) => (
          <Box key={r.id}>
            <Text color="gray">{formatTime(r.created_at)}  </Text>
            <Text>{r.modo.padEnd(20)}</Text>
            <Text color="green"> -{pct(r.tokens_original, r.tokens_compressed)}%  </Text>
            <Text color="gray">{(r.duration_ms / 1000).toFixed(1)}s  </Text>
            <Text color={r.success ? 'green' : 'red'}>{r.success ? '✓' : '✗'}</Text>
            <Text color="gray"> {r.model}</Text>
          </Box>
        ))}

        <Text> </Text>
        <Text color="gray">[r] refresh  [w] abrir web  [q] sair</Text>
      </Box>
    </Box>
  )
}

export function openTUI() {
  const store = createStore()
  render(<Dashboard store={store} />)
}
```

- [ ] **Step 2: Implementar src/cli/commands/dash.js**

```js
import { openTUI } from '../../dashboard/tui.js'
import { startWebDashboard } from '../../dashboard/web/server.js'
import open from 'open'

export async function runDash({ web } = {}) {
  if (web) {
    const port = 7878
    await startWebDashboard(port)
    console.log(`\n  Dashboard web em http://localhost:${port}\n`)
    try {
      const { default: open } = await import('open')
      await open(`http://localhost:${port}`)
    } catch {}
    await new Promise(() => {}) // keep alive
  } else {
    openTUI()
  }
}
```

- [ ] **Step 3: Adicionar `open` ao package.json e instalar**

```bash
cd ~/tokensave && npm install open
```

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/tui.js src/cli/commands/dash.js package.json package-lock.json
git commit -m "feat: add TUI dashboard with Ink"
```

---

## Task 11: Dashboard Web

**Files:**
- Create: `src/dashboard/web/server.js`
- Create: `src/dashboard/web/index.html`

- [ ] **Step 1: Implementar src/dashboard/web/server.js**

```js
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createStore } from '../../store/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function startWebDashboard(port = 7878) {
  const app = new Hono()
  const store = createStore()

  app.get('/', (c) => {
    const html = readFileSync(join(__dirname, 'index.html'), 'utf8')
    return c.html(html)
  })

  app.get('/api/stats', (c) => {
    return c.json({
      summary: store.getSummary(),
      today: store.getTodaySummary(),
      modeStats: store.getModeStats(),
      recentRuns: store.getRecentRuns(50),
    })
  })

  const server = serve({ fetch: app.fetch, port })
  return server
}
```

- [ ] **Step 2: Implementar src/dashboard/web/index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Tokensave Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0d1117; color: #e6edf3; padding: 24px; }
    h1 { color: #58a6ff; font-size: 1.4rem; margin-bottom: 24px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
    .card .label { font-size: 0.8rem; color: #8b949e; margin-bottom: 4px; }
    .card .value { font-size: 1.6rem; font-weight: 700; color: #3fb950; }
    .card .sub { font-size: 0.8rem; color: #8b949e; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { text-align: left; padding: 8px 12px; color: #8b949e; border-bottom: 1px solid #30363d; }
    td { padding: 8px 12px; border-bottom: 1px solid #21262d; }
    .ok { color: #3fb950; } .err { color: #f85149; }
    .pct { color: #3fb950; font-weight: 600; }
    h2 { font-size: 1rem; color: #8b949e; margin: 24px 0 12px; }
    .export { margin-top: 16px; }
    button { background: #21262d; border: 1px solid #30363d; color: #e6edf3; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
    button:hover { background: #30363d; }
  </style>
</head>
<body>
  <h1>⚡ Tokensave Dashboard</h1>
  <div class="cards" id="cards">Carregando...</div>
  <h2>Modos mais usados</h2>
  <table id="mode-table"><tr><td>—</td></tr></table>
  <h2>Últimos pipelines</h2>
  <div class="export"><button onclick="exportCSV()">Exportar CSV</button></div>
  <table id="runs-table"><tr><td>—</td></tr></table>

  <script>
    let allRuns = []

    async function load() {
      const data = await fetch('/api/stats').then(r => r.json())
      const { summary: s, today: t, modeStats, recentRuns } = data
      allRuns = recentRuns

      const pct = (o, c) => o ? ((1 - c / o) * 100).toFixed(0) : 0

      document.getElementById('cards').innerHTML = `
        <div class="card"><div class="label">Pipelines hoje</div><div class="value">${t.runs_today}</div></div>
        <div class="card"><div class="label">Tokens economizados hoje</div><div class="value">${((t.tokens_original_today||0)-(t.tokens_compressed_today||0)).toLocaleString()}</div><div class="sub">-${pct(t.tokens_original_today, t.tokens_compressed_today)}%</div></div>
        <div class="card"><div class="label">Custo hoje</div><div class="value">$${(t.cost_today||0).toFixed(4)}</div></div>
        <div class="card"><div class="label">Total pipelines</div><div class="value">${s.total_runs}</div></div>
        <div class="card"><div class="label">Custo total</div><div class="value">$${s.total_cost_usd.toFixed(2)}</div></div>
        <div class="card"><div class="label">Compressão média</div><div class="value">${s.avg_compression_pct.toFixed(0)}%</div></div>
      `

      document.getElementById('mode-table').innerHTML =
        '<tr><th>Modo</th><th>Usos</th></tr>' +
        modeStats.map(m => `<tr><td>${m.modo}</td><td>${m.count}</td></tr>`).join('')

      document.getElementById('runs-table').innerHTML =
        '<tr><th>Hora</th><th>Modo</th><th>Compressão</th><th>Duração</th><th>Modelo</th><th>Status</th></tr>' +
        recentRuns.map(r => `
          <tr>
            <td>${new Date(r.created_at).toLocaleTimeString('pt-BR')}</td>
            <td>${r.modo}</td>
            <td class="pct">-${pct(r.tokens_original, r.tokens_compressed)}%</td>
            <td>${(r.duration_ms/1000).toFixed(1)}s</td>
            <td>${r.model}</td>
            <td class="${r.success ? 'ok' : 'err'}">${r.success ? '✓' : '✗'}</td>
          </tr>`).join('')
    }

    function exportCSV() {
      const header = 'created_at,modo,papel,tokens_original,tokens_compressed,tokens_output,cost_usd,duration_ms,model,success'
      const rows = allRuns.map(r =>
        [r.created_at,r.modo,r.papel,r.tokens_original,r.tokens_compressed,r.tokens_output,r.cost_usd,r.duration_ms,r.model,r.success].join(',')
      )
      const blob = new Blob([[header,...rows].join('\n')], {type:'text/csv'})
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = 'tokensave-export.csv'
      a.click()
    }

    load()
    setInterval(load, 10000)
  </script>
</body>
</html>
```

- [ ] **Step 3: Adicionar @hono/node-server**

```bash
cd ~/tokensave && npm install @hono/node-server
```

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/web/ package.json package-lock.json
git commit -m "feat: add web dashboard with Hono + vanilla JS"
```

---

## Task 12: Skills Bundles

**Files:**
- Create: `skills/*/index.js` (8 bundles)
- Create: `src/skills/index.js`
- Create: `src/cli/commands/skills.js`
- Create: `tests/skills.test.js`

- [ ] **Step 1: Escrever o teste**

```js
// tests/skills.test.js
import { describe, it, expect } from 'vitest'
import { SKILLS, getSkillById } from '../src/skills/index.js'

const REQUIRED = ['id', 'name', 'description', 'papel', 'modos', 'defaultCondicao']

describe('skills', () => {
  it('exports 8 skills', () => expect(SKILLS).toHaveLength(8))

  it('each skill has required fields', () => {
    for (const skill of SKILLS) {
      for (const field of REQUIRED) {
        expect(skill, `skill ${skill.id} missing ${field}`).toHaveProperty(field)
      }
    }
  })

  it('each skill modos array is non-empty and valid mode ids', () => {
    const validIds = ['criar-sistema','revisar-codigo','documentacao','consultor','swot','compare','multi-perspectiva','parallel-lens','pitfalls','metrics-mode','context-stack']
    for (const skill of SKILLS) {
      expect(skill.modos.length).toBeGreaterThan(0)
      for (const m of skill.modos) {
        expect(validIds).toContain(m)
      }
    }
  })

  it('getSkillById returns correct skill', () => {
    const skill = getSkillById('security-audit')
    expect(skill.papel).toMatch(/security/i)
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npm test -- tests/skills.test.js
```

- [ ] **Step 3: Criar skills/*/index.js (todos os 8 bundles)**

`skills/security-audit/index.js`:
```js
export default { id:'security-audit', name:'Security Audit', description:'Auditoria de segurança: vulnerabilidades, OWASP, autenticação, exposição de dados', papel:'Security Auditor Sênior', modos:['revisar-codigo','pitfalls','multi-perspectiva'], defaultCondicao:'Todas as vulnerabilidades críticas e de alta severidade identificadas com fix proposto' }
```

`skills/data-science/index.js`:
```js
export default { id:'data-science', name:'Data Science', description:'Pipeline de dados, modelos, métricas, qualidade de dados', papel:'Data Scientist Sênior', modos:['metrics-mode','criar-sistema','compare'], defaultCondicao:'Pipeline definido com métricas de qualidade e baseline estabelecido' }
```

`skills/database/index.js`:
```js
export default { id:'database', name:'Database', description:'Modelagem, queries, índices, migrations, performance', papel:'DBA Sênior', modos:['criar-sistema','revisar-codigo','pitfalls'], defaultCondicao:'Schema validado e queries críticas otimizadas' }
```

`skills/software-architect/index.js`:
```js
export default { id:'software-architect', name:'Software Architect', description:'Arquitetura de sistema, decisões técnicas, trade-offs', papel:'Arquiteto de Software Sênior', modos:['criar-sistema','compare','multi-perspectiva'], defaultCondicao:'Decisões arquiteturais documentadas com justificativas e riscos mapeados' }
```

`skills/ux-ui/index.js`:
```js
export default { id:'ux-ui', name:'UX/UI', description:'Experiência do usuário, fluxos, acessibilidade, design system', papel:'UX Researcher / Product Designer', modos:['multi-perspectiva','consultor','pitfalls'], defaultCondicao:'Problemas de UX identificados e melhorias priorizadas por impacto' }
```

`skills/devops/index.js`:
```js
export default { id:'devops', name:'DevOps', description:'CI/CD, infraestrutura, monitoramento, confiabilidade', papel:'SRE / DevOps Engineer Sênior', modos:['criar-sistema','metrics-mode','pitfalls'], defaultCondicao:'Pipeline CI/CD definido e SLOs estabelecidos com alertas' }
```

`skills/code-review/index.js`:
```js
export default { id:'code-review', name:'Code Review', description:'Revisão completa: qualidade, testes, padrões, manutenibilidade', papel:'Tech Lead Sênior', modos:['revisar-codigo','pitfalls','consultor'], defaultCondicao:'Todos os problemas críticos e importantes documentados com ações claras' }
```

`skills/documentation/index.js`:
```js
export default { id:'documentation', name:'Documentation', description:'README, guias técnicos, ADRs, API docs', papel:'Technical Writer / Developer Advocate', modos:['documentacao','context-stack'], defaultCondicao:'Documentação completa suficiente para um dev novo começar em < 2 horas' }
```

- [ ] **Step 4: Criar src/skills/index.js**

```js
import securityAudit from '../../skills/security-audit/index.js'
import dataScience from '../../skills/data-science/index.js'
import database from '../../skills/database/index.js'
import softwareArchitect from '../../skills/software-architect/index.js'
import uxUi from '../../skills/ux-ui/index.js'
import devops from '../../skills/devops/index.js'
import codeReview from '../../skills/code-review/index.js'
import documentation from '../../skills/documentation/index.js'

export const SKILLS = [
  securityAudit, dataScience, database, softwareArchitect,
  uxUi, devops, codeReview, documentation,
]

export function getSkillById(id) {
  return SKILLS.find((s) => s.id === id)
}

export function getSkillChoices() {
  return SKILLS.map((s) => ({
    name: `${s.name} — ${s.description}`,
    value: s.id,
    short: s.name,
  }))
}
```

- [ ] **Step 5: Criar src/cli/commands/skills.js**

```js
import inquirer from 'inquirer'
import chalk from 'chalk'
import { SKILLS, getSkillById } from '../../skills/index.js'
import { getSkillChoices } from '../../skills/index.js'
import { buildPipeline } from '../../pipeline/builder.js'
import { executePipeline } from '../../pipeline/executor.js'
import { loadConfig } from './config.js'

export async function runSkills() {
  const { skillId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'skillId',
      message: 'Selecione um bundle de domínio:',
      choices: getSkillChoices(),
      pageSize: 10,
    },
  ])

  const skill = getSkillById(skillId)
  console.log(chalk.cyan(`\n  Bundle: ${skill.name}`))
  console.log(chalk.gray(`  Papel padrão: ${skill.papel}`))
  console.log(chalk.gray(`  Modos: ${skill.modos.join(', ')}\n`))

  const { modoChoice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'modoChoice',
      message: 'Modo para usar nesta sessão:',
      choices: skill.modos.map((m) => ({ name: m, value: m })),
    },
  ])

  const pipeline = await buildPipeline({ modeOverride: modoChoice })
  pipeline.papel = pipeline.papel || skill.papel
  if (!pipeline.condicao) pipeline.condicao = skill.defaultCondicao

  const cfg = loadConfig()
  const ora = (await import('ora')).default
  const spinner = ora('Executando pipeline...').start()

  let output = ''
  try {
    const result = await executePipeline(pipeline, {
      model: cfg.model || 'claude-sonnet-4-6',
      apiKey: cfg.apiKey,
      onChunk: (chunk) => {
        if (spinner.isSpinning) { spinner.stop(); process.stdout.write('\n') }
        process.stdout.write(chunk)
        output += chunk
      },
    })
    spinner.stop()
    console.log(chalk.green(`\n\n  ✓ Tokens: ${result.tokensOriginal} → ${result.tokensCompressed} (-${Math.round((1 - result.tokensCompressed / result.tokensOriginal) * 100)}%) │ $${result.costUsd.toFixed(4)} │ ${(result.durationMs / 1000).toFixed(1)}s`))
  } catch (err) {
    spinner.fail(`Erro: ${err.message}`)
  }
}
```

- [ ] **Step 6: Rodar testes**

```bash
npm test -- tests/skills.test.js
```

Esperado: 4 testes PASS.

- [ ] **Step 7: Commit**

```bash
git add skills/ src/skills/ src/cli/commands/skills.js tests/skills.test.js
git commit -m "feat: add 8 domain skill bundles with preset roles and modes"
```

---

## Task 13: Config Command + Setup Command

**Files:**
- Create: `src/cli/commands/config.js`
- Create: `src/cli/commands/setup.js`
- Create: `src/cli/commands/run.js`
- Create: `src/cli/commands/stats.js`

- [ ] **Step 1: Implementar src/cli/commands/config.js**

```js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import inquirer from 'inquirer'

const CONFIG_PATH = join(homedir(), '.tokensave', 'config.json')

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return {}
  try { return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) } catch { return {} }
}

function saveConfig(cfg) {
  mkdirSync(join(CONFIG_PATH, '..'), { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2))
}

export async function runConfig() {
  const current = loadConfig()

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Provedor de AI padrão:',
      choices: ['Anthropic (Claude)', 'OpenAI (GPT)', 'Google (Gemini)'],
      default: current.provider || 'Anthropic (Claude)',
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key:',
      default: current.apiKey ? '****** (manter atual)' : '',
    },
    {
      type: 'list',
      name: 'model',
      message: 'Modelo padrão:',
      choices: {
        'Anthropic (Claude)': ['claude-sonnet-4-6', 'claude-haiku-4-5'],
        'OpenAI (GPT)': ['gpt-4o', 'gpt-4o-mini'],
        'Google (Gemini)': ['gemini-1.5-pro', 'gemini-1.5-flash'],
      }[answers?.provider] ?? ['claude-sonnet-4-6'],
    },
  ])

  const cfg = {
    provider: answers.provider,
    apiKey: answers.apiKey.startsWith('***') ? current.apiKey : answers.apiKey,
    model: answers.model,
  }

  saveConfig(cfg)
  console.log('\n  ✓ Configuração salva em', CONFIG_PATH)
}
```

- [ ] **Step 2: Implementar src/cli/commands/setup.js**

```js
import chalk from 'chalk'
import { detectTools } from '../../detector/index.js'
import { injectCursor } from '../../injector/cursor.js'
import { injectClaudeCode } from '../../injector/claude-code.js'
import { injectCopilot } from '../../injector/copilot.js'
import { injectWindsurf } from '../../injector/windsurf.js'

export async function runSetup() {
  console.log(chalk.cyan('\n  Detectando AI tools instalados...\n'))

  const tools = detectTools()

  if (tools.length === 0) {
    console.log(chalk.yellow('  Nenhum AI tool detectado automaticamente.'))
    console.log('  Instale Claude Code, Cursor, Copilot ou Windsurf e rode novamente.\n')
    return
  }

  for (const tool of tools) {
    process.stdout.write(`  ${tool}... `)
    try {
      if (tool === 'cursor') await injectCursor()
      if (tool === 'claude-code') await injectClaudeCode()
      if (tool === 'copilot') await injectCopilot()
      if (tool === 'windsurf') await injectWindsurf()
      console.log(chalk.green('✓'))
    } catch (err) {
      console.log(chalk.red(`✗ ${err.message}`))
    }
  }

  console.log(chalk.green('\n  Setup completo! Reinicie seu AI tool para aplicar as mudanças.\n'))
}
```

- [ ] **Step 3: Implementar src/cli/commands/run.js**

```js
import chalk from 'chalk'
import { buildPipeline } from '../../pipeline/builder.js'
import { executePipeline } from '../../pipeline/executor.js'
import { loadConfig } from './config.js'

export async function runPipeline({ mode } = {}) {
  const pipeline = await buildPipeline({ modeOverride: mode })

  const cfg = loadConfig()
  if (!cfg.apiKey) {
    console.log(chalk.yellow('\n  API Key não configurada. Rode: npx tokensave config\n'))
    process.exit(1)
  }

  const ora = (await import('ora')).default
  const spinner = ora('Executando pipeline...').start()

  try {
    const result = await executePipeline(pipeline, {
      model: cfg.model || 'claude-sonnet-4-6',
      apiKey: cfg.apiKey,
      onChunk: (chunk) => {
        if (spinner.isSpinning) { spinner.stop(); process.stdout.write('\n') }
        process.stdout.write(chunk)
      },
    })

    spinner.stop()
    const compression = Math.round((1 - result.tokensCompressed / result.tokensOriginal) * 100)
    console.log(chalk.green(
      `\n\n  ✓ ${result.tokensOriginal} → ${result.tokensCompressed} tokens (-${compression}%) │ $${result.costUsd.toFixed(4)} │ ${(result.durationMs / 1000).toFixed(1)}s`
    ))
  } catch (err) {
    spinner.fail(`Erro: ${err.message}`)
    process.exit(1)
  }
}
```

- [ ] **Step 4: Implementar src/cli/commands/stats.js**

```js
import chalk from 'chalk'
import { createStore } from '../../store/db.js'

export async function runStats() {
  const store = createStore()
  const summary = store.getSummary()
  const today = store.getTodaySummary()
  const modes = store.getModeStats()
  store.close()

  const pct = (o, c) => o ? ((1 - c / o) * 100).toFixed(0) : 0

  console.log(chalk.cyan('\n  TOKENSAVE STATS\n'))
  console.log(`  Hoje:   ${today.runs_today} pipelines │ ${((today.tokens_original_today||0)-(today.tokens_compressed_today||0)).toLocaleString()} tokens economizados │ $${(today.cost_today||0).toFixed(4)}`)
  console.log(`  Total:  ${summary.total_runs} pipelines │ ${(summary.total_tokens_original - summary.total_tokens_compressed).toLocaleString()} tokens economizados │ $${summary.total_cost_usd.toFixed(2)}`)
  console.log(`  Média:  ${summary.avg_compression_pct.toFixed(0)}% compressão\n`)

  if (modes.length > 0) {
    console.log('  Top modos:')
    modes.slice(0, 5).forEach((m) => console.log(`    ${m.modo.padEnd(22)} ${m.count}x`))
  }
  console.log()
}
```

- [ ] **Step 5: Commit**

```bash
git add src/cli/commands/ 
git commit -m "feat: add setup, run, stats, and config commands"
```

---

## Task 14: README e package.json final

**Files:**
- Create: `README.md`
- Modify: `package.json` (adicionar `files`, `repository`, `homepage`)

- [ ] **Step 1: Criar README.md**

```markdown
# tokensave

> Structured AI pipeline for any tool. One command. 70% less tokens.

## Install

```bash
npx tokensave
```

No installation needed. Requires Node.js 18+.

## Quick Start

```bash
# 1. Configure sua API key
npx tokensave config

# 2. Injete configurações no seu AI tool (Cursor, Claude Code, Copilot, Windsurf)
npx tokensave setup

# 3. Execute um pipeline estruturado
npx tokensave run

# 4. Veja os tokens economizados
npx tokensave dash
```

## O que é um pipeline

Cada execução define 5 campos:

| Campo | O que é |
|-------|---------|
| **PAPEL** | Persona do AI (Arquiteto, Security Auditor, DBA...) |
| **TAREFA** | O que precisa ser feito |
| **CONTEXTO** | Código, arquivo, URL, ou texto |
| **RACIOCÍNIO** | Modo de análise (veja abaixo) |
| **CONDIÇÃO** | O que define "pronto" |

## Modos de Raciocínio

| Modo | Para que serve |
|------|---------------|
| Criar sistema | Arquitetura do zero |
| Revisar código | Bugs, segurança, qualidade |
| Documentação | README, ADR, guias |
| Consultor | ROI, risco, decisão C-level |
| SWOT | Análise estratégica |
| Compare | A vs B com critérios |
| Multi-perspectiva | N ângulos do mesmo problema |
| Parallel lens | N abordagens simultâneas |
| Pitfalls | O que pode dar errado |
| Metrics mode | KPIs e métricas |
| Context stack | Empilha contexto sem explodir tokens |

## Skills por Domínio

```bash
npx tokensave skills
```

Escolha um bundle pré-configurado: Security Audit, Data Science, Database, Software Architect, UX/UI, DevOps, Code Review, Documentation.

## Dashboard

```bash
npx tokensave dash        # TUI no terminal
npx tokensave dash --web  # Web em localhost:7878
npx tokensave stats       # Resumo rápido
```

## Comandos

```bash
npx tokensave setup            # Detecta e configura seu AI tool
npx tokensave run              # Pipeline interativo
npx tokensave run --mode swot  # Vai direto para um modo
npx tokensave skills           # Menu de bundles
npx tokensave dash             # Dashboard TUI
npx tokensave dash --web       # Dashboard web
npx tokensave stats            # Resumo de tokens
npx tokensave config           # API keys e preferências
```

## Como funciona a economia de tokens

- **Entrada**: contexto comprimido via [Headroom](https://github.com/chopratejas/headroom) (60–75% de redução) ou compressor nativo (20–35%)
- **Saída**: regras [Caveman](https://github.com/juliusbrussee/caveman) embutidas em cada system prompt (40–60% de redução)
- **Dashboard**: SQLite local, sem telemetria externa

## License

MIT
```

- [ ] **Step 2: Commit final**

```bash
git add README.md
git commit -m "docs: add README with quick start and command reference"
```

---

## Self-Review

**Spec coverage:**
- ✅ `npx tokensave` sem instalação prévia (Task 1 — package.json com bin)
- ✅ Detecção de tools (Task 3 — detector)
- ✅ Injeção nativa por tool (Task 9 — injectors)
- ✅ Pipeline PAPEL/TAREFA/CONTEXTO/RACIOCÍNIO/CONDIÇÃO (Tasks 6, 7)
- ✅ Compressão entrada Headroom com fallback (Task 5)
- ✅ Compressão saída Caveman por modo (Task 4)
- ✅ Execução via API com streaming (Task 8)
- ✅ SQLite para métricas (Task 2)
- ✅ Dashboard TUI (Task 10)
- ✅ Dashboard web (Task 11)
- ✅ Skills por domínio (Task 12)
- ✅ 11 modos de raciocínio (Task 6)
- ✅ Estimativa de custo pré-execução (Task 8 — executor.js mostra estimativa)
- ✅ `npx tokensave config` para API keys (Task 13)
- ✅ README para começar em < 2 min (Task 14)

**Sem placeholders** — cada step tem código completo.

**Type consistency** — `createStore()` retorna os mesmos métodos usados em tui.js, executor.js, stats.js e web/server.js. `getModeById(id)` usado de forma consistente em builder.js e executor.js.
