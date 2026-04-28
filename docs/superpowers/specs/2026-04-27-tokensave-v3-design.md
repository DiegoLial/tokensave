# tokensave v3 — Design Spec
**Date:** 2026-04-27  
**Status:** Approved  
**Approach:** Clean Architecture (B)

---

## 1. Goal

Transform tokensave from a CLI-first tool into a full local platform where the web dashboard is the primary configuration and execution cockpit, the terminal is the streaming execution engine, and all shared logic lives in a clean, testable core.

Principles: minimalist output, zero duplication between CLI and dashboard, config-per-project, robust error handling at every layer.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────┐
│           WEB DASHBOARD (SPA)           │
│  Config · Templates · Run · History     │
│  WebSocket client · REST client         │
└──────────────┬──────────────────────────┘
               │ WebSocket + REST
┌──────────────▼──────────────────────────┐
│         TOKENSAVE SERVER                │
│  Hono HTTP + WebSocket (port 7878)      │
│  /api/config  /api/runs  /api/modes     │
│  /api/templates  /ws (stream)           │
└──────┬───────────────────┬──────────────┘
       │ shared modules    │ spawn/pipe
┌──────▼──────┐    ┌───────▼──────────────┐
│    CORE     │    │   TERMINAL EXECUTOR  │
│  compressor │    │  listen mode (daemon)│
│  modes      │    │  stream output       │
│  store      │    │  plain CLI           │
│  config     │    └──────────────────────┘
└─────────────┘
```

---

## 3. Core Modules (`src/core/`)

Replaces the current monolithic `src/pipeline/executor.js` (300+ lines, no validation, all concerns mixed).

### 3.1 File structure

```
src/core/
├── config.js        ← read/write ~/.tokensave/config.json, per-project support
├── runner.js        ← orchestrates: pipeline → compress → stream → save
├── provider.js      ← detects and instantiates client (Anthropic/OpenAI/Google/Ollama)
├── streamer.js      ← normalized streaming — same AsyncIterator contract for all providers
├── metrics.js       ← cost calculation, SQLite persistence, query methods
├── validator.js     ← validates pipeline before execution, returns { valid, errors[] }
└── compressor/
    ├── index.js     ← selects headroom or native, always returns { text, originalTokens, compressedTokens, method }
    ├── headroom.js  ← Python subprocess (refactored from current)
    ├── native.js    ← JS fallback (refactored from current)
    └── caveman.js   ← output compression rules (refactored from current)
```

### 3.2 Module contracts

**`runner.js`** — receives a `pipeline` object and an `onChunk(text)` callback. Does not know whether the call came from CLI or dashboard. Returns `{ metrics }`.

```js
// pipeline shape
{
  papel: string,       // required
  tarefa: string,      // required
  modo: string,        // required — one of 11 mode IDs
  contexto: string,    // optional
  condicao: string,    // optional
  model: string,       // optional — falls back to config default
  cavemanLevel: string // optional — falls back to config default
}
```

**`streamer.js`** — returns `AsyncIterable<string>` regardless of provider. Handles retry with exponential backoff (429, 5xx) internally.

**`compressor/index.js`** — always returns:
```js
{ text: string, originalTokens: number, compressedTokens: number, method: 'headroom'|'native' }
```

**`validator.js`** — returns:
```js
{ valid: boolean, errors: string[] }
```
Used by both CLI and dashboard server before dispatching a run.

**`provider.js`** — detects provider from model prefix:
- `claude-*` → Anthropic
- `gpt-*`, `o1-*`, `o3-*` → OpenAI
- `gemini-*` → Google
- `ollama/*`, `ollama:*` → OpenAI-compat at `ollama_base_url`

**`metrics.js`** — updated pricing table:

| Model | Input /1K | Output /1K |
|-------|-----------|------------|
| claude-opus-4-7 | $0.015 | $0.075 |
| claude-sonnet-4-6 | $0.003 | $0.015 |
| claude-haiku-4-5 | $0.00025 | $0.00125 |
| gpt-4o | $0.0025 | $0.010 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| gemini-1.5-pro | $0.00125 | $0.005 |
| gemini-1.5-flash | $0.000075 | $0.0003 |

---

## 4. Config System

### 4.1 Schema (`~/.tokensave/config.json`)

```json
{
  "anthropic_api_key": "sk-ant-...",
  "openai_api_key": "sk-...",
  "google_api_key": "AIza...",
  "default_model": "claude-sonnet-4-6",
  "default_caveman": "full",
  "ollama_base_url": "http://localhost:11434/v1",
  "projects": {
    "/absolute/path/to/project": {
      "default_model": "gpt-4o",
      "default_caveman": "ultra",
      "default_papel": "Senior Engineer"
    }
  }
}
```

### 4.2 Resolution order

1. Explicit flag (`--model`, `--papel`) — highest priority
2. Template defaults
3. Project config (`projects[cwd]`)
4. Global config
5. Hardcoded defaults

### 4.3 `config.js` API

```js
getConfig()                          // merged global + project config for cwd
getProjectConfig(root)               // project-specific config
setGlobalConfig(key, value)          // writes to global
setProjectConfig(root, key, value)   // writes to projects[root]
```

---

## 5. Dashboard — Cockpit SPA

### 5.1 Server (Hono) — new endpoints

```
GET  /api/config              ← merged config (no API keys in response)
PUT  /api/config              ← save global config
GET  /api/config/project      ← project config for cwd
PUT  /api/config/project      ← save project config
GET  /api/modes               ← all 11 modes (id, name, description, cavemanLevel)
GET  /api/skills              ← all 8 skill bundles
GET  /api/templates           ← list templates
POST /api/templates           ← save template
DELETE /api/templates/:name   ← delete template
GET  /api/runs                ← run history (limit, offset queryparams)
GET  /api/runs/export.csv     ← CSV export
POST /api/run                 ← dispatch run, returns { job_id }
WS   /ws                      ← real-time stream
```

### 5.2 WebSocket protocol

All messages are JSON.

**Server → Client:**
```js
{ type: 'start',   job_id: string, pipeline: object }
{ type: 'chunk',   job_id: string, text: string }
{ type: 'done',    job_id: string, metrics: object }
{ type: 'error',   job_id: string, message: string }
{ type: 'status',  message: string }  // server status updates
```

**Client → Server:**
```js
{ type: 'cancel',  job_id: string }
{ type: 'ping' }
```

### 5.3 Dashboard UI — 4 tabs (vanilla JS, no framework)

**Run tab:**
- Form: papel, tarefa, contexto (textarea or file upload), modo (dropdown with description), condição
- Model selector (dropdown grouped by provider)
- Caveman level toggle (lite / full / ultra)
- "Run" button → POST /api/run → WebSocket output panel opens below
- Output panel: streaming text, token counter ticking, cost meter, cancel button

**History tab:**
- Table: date, role, task, mode, model, tokens saved, cost, duration
- Filter by mode, model, date range
- Click row to expand full output
- Export CSV button

**Templates tab:**
- List of saved templates
- Click to expand: show all fields
- "Run with this" button → pre-fills Run tab
- Delete button
- "New template" form

**Settings tab:**
- API Keys section (masked input, show/hide toggle)
- Default model dropdown
- Default Caveman level
- Ollama base URL
- Per-project config panel: auto-detects open project, shows project-specific overrides
- Save button with success/error feedback

### 5.4 Terminal listen mode

```bash
tokensave listen
```

- Connects to WebSocket server at `localhost:7878/ws`
- Receives `{ type: 'start', job_id, pipeline }` events
- Executes pipeline locally via `runner.js`
- Streams chunks back over the same WebSocket connection
- Useful when server runs as a background process and terminal provides execution context

---

## 6. Terminal UX — Minimalist Output

### 6.1 Run output (before/after)

**Before:**
```
⚡ Tokensave — Pipeline

  Papel:    Senior Engineer
  Tarefa:   revisar código
  Modo:     revisar-codigo
─────────────────────────────────────────
  Tokens originais:    1240
  Após compressão:     480 (native)
  Custo estimado:      $0.0021
  Modelo:              claude-sonnet-4-6
─────────────────────────────────────────

▶
[output...]
```

**After:**
```
⚡ revisar-codigo  ·  claude-sonnet-4-6  ·  ~$0.0021
Senior Engineer → revisar código

[output streaming...]

✓ 480/1240 tokens  ·  $0.0019 real  ·  3.2s
```

### 6.2 Stats output

```
⚡ tokensave stats

  42 runs  ·  $1.23 total  ·  68% saved

  Top modes:  revisar-codigo (18)  swot (9)  pitfalls (7)
  Today:      3 runs  ·  $0.08
```

### 6.3 Error output

All errors follow: `✗ <reason>. <action>.`
```
✗ Sem API key para anthropic. Execute: tokensave config
✗ Modelo "xyz" não reconhecido. Use: tokensave run --model claude-sonnet-4-6
✗ Template "foo" não encontrado. Use: tokensave templates
```

---

## 7. New CLI Commands and Flags

### New commands
- `tokensave listen` — daemon mode, executes jobs from dashboard via WebSocket

### New flags for `run`
- `--dry-run` — shows compressed prompt + estimated cost without calling API
- `--context-file` accepts multiple: `--context-file a.js --context-file b.js` (concatenated)
- stdin pipe support: `cat file.js | tokensave run --mode revisar-codigo --papel "..." --tarefa "..." --yes`

### Updated `config` command
Shows current config (masked keys) in addition to letting you set values.

---

## 8. Error Handling Strategy

Every layer handles its own errors and re-throws with context:

- `validator.js` — catches missing/invalid fields before any API call
- `provider.js` — catches auth errors, unknown model errors
- `streamer.js` — catches network errors, retries 429/5xx with backoff, gives up after 3 attempts
- `runner.js` — catches all errors, always calls `metrics.js` to save failed run (`success: 0`)
- CLI commands — catch runner errors, print `✗ message. action.` pattern, exit 1
- Dashboard server — catches all route errors, returns `{ error: string }` JSON with correct HTTP status

---

## 9. Test Coverage Plan

New tests to add alongside existing 35:

| File | What to test |
|------|-------------|
| `tests/core/config.test.js` | global config, project config, resolution order |
| `tests/core/validator.test.js` | valid pipeline, missing fields, invalid model |
| `tests/core/provider.test.js` | model prefix detection for all providers |
| `tests/core/metrics.test.js` | cost calculation accuracy, pricing table |
| `tests/core/runner.test.js` | integration: mock provider, assert metrics saved |
| `tests/server/api.test.js` | REST endpoints with supertest |

Target: 70+ tests total.

---

## 10. Files to Create / Modify

### Create
- `src/core/config.js`
- `src/core/runner.js`
- `src/core/provider.js`
- `src/core/streamer.js`
- `src/core/metrics.js`
- `src/core/validator.js`
- `src/core/compressor/index.js` (facade over existing compressors)
- `src/cli/commands/listen.js`
- `tests/core/config.test.js`
- `tests/core/validator.test.js`
- `tests/core/provider.test.js`
- `tests/core/metrics.test.js`

### Modify heavily
- `src/pipeline/executor.js` → thin wrapper calling `src/core/runner.js`
- `src/dashboard/web/server.js` → add WebSocket, new endpoints
- `src/dashboard/web/index.html` → full SPA rewrite with 4 tabs
- `src/cli/commands/run.js` → use validator, use new output format
- `src/cli/commands/stats.js` → new output format
- `src/cli/index.js` → register `listen` command

### Modify lightly
- `src/compressor/headroom.js` → normalize return shape
- `src/compressor/native.js` → normalize return shape
- `src/store/db.js` → add `success` column handling

---

## 11. Out of Scope (this iteration)

- Auth/password on dashboard (local tool, no auth needed yet)
- Cloud sync of config or runs
- Plugin system for custom modes
- Multi-user team server
- Notifications (desktop/email on run complete)
