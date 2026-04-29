<div align="center">

# ⚡ tokensave

### Structured AI pipeline for any tool. One command. 70% less tokens.

[![npm](https://img.shields.io/npm/v/tokensave?color=00d26a&label=npm&style=flat-square)](https://www.npmjs.com/package/tokensave)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square)](https://nodejs.org)
[![tests](https://img.shields.io/badge/tests-66%20passing-00d26a?style=flat-square)](#testing)
[![v0.3.0](https://img.shields.io/badge/version-0.3.0-blue?style=flat-square)](package.json)

**[Portuguese version below](#português) | [English below](#english)**

</div>

---

# Português

> **tokensave** é um CLI que reduz tokens em 60–75% antes de chamar qualquer modelo de AI.

## 🚀 O que é

tokensave envolve qualquer modelo de AI (Claude, GPT-4o, Gemini, Ollama) com um pipeline de compressão que remove ruído do seu contexto antes de chegar ao modelo — reduzindo o uso de tokens drasticamente sem perder informação crítica. Vem com 11 modos de raciocínio estruturados, dashboard web em tempo real, gerenciamento de templates, daemon WebSocket, histórico SQLite, e servidor MCP para integração nativa com Claude Code.

## ✨ Funcionalidades

- **70% menos tokens** — pipeline de compressão dupla (headroom + caveman nativo) em cada chamada
- **11 modos de raciocínio** — prompts estruturados: revisão de código, SWOT, pitfalls, arquitetura, documentação, comparação, análise multi-perspectiva, etc.
- **Modo não-interativo** — totalmente scriptável por flags; stdin pipe; múltiplos arquivos/URLs
- **Dashboard web** — SPA de 4 abas em `localhost:7878`: disparar jobs, histórico, templates, configurações
- **Daemon WebSocket** (`listen`) — mantém um worker rodando; dispara jobs do browser em tempo real
- **Templates** — salva qualquer pipeline; reutiliza em um comando
- **Multi-provider** — Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google), Ollama (local, grátis)
- **Servidor MCP** — integra compressão diretamente no Claude Code como ferramenta nativa
- **Histórico com SQLite** — cada run salvo automaticamente; exporta CSV
- **--dry-run** — visualiza prompt comprimido + custo estimado sem gastar tokens

## ⚙️ Stack técnico

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 18+ |
| CLI | Commander.js |
| UI interativa | Inquirer.js |
| HTTP/WebSocket | Hono + `@hono/node-server` + `ws` |
| Database | SQLite via `better-sqlite3` |
| Provedores IA | `@anthropic-ai/sdk`, `openai`, `@google/generative-ai` |
| Terminal | Chalk |
| Testes | Vitest (66 testes) |

## 📋 Pré-requisitos

- **Node.js 18+** — verifique com `node --version`
- Pelo menos uma chave API:
  - Anthropic: [console.anthropic.com](https://console.anthropic.com)
  - OpenAI: [platform.openai.com](https://platform.openai.com)
  - Google: [aistudio.google.com](https://aistudio.google.com)
  - Ollama (grátis): [ollama.ai](https://ollama.ai)

## 🎯 Início Rápido

```bash
# Interativo — guia você por cada etapa
npx tokensave run

# Não-interativo — revisão de código em uma linha
npx tokensave run \
  --papel "Security Auditor" \
  --tarefa "Revisar endpoint de login" \
  --context-file ./src/api/auth.js \
  --mode revisar-codigo \
  --yes

# Visualizar tokens + custo (sem chamar API)
npx tokensave run \
  --papel "Engineer" \
  --tarefa "Revisar auth" \
  --context-file ./src/auth.js \
  --mode revisar-codigo \
  --dry-run

# Abrir dashboard web
npx tokensave dash --web
```

## 📦 Instalação

**Sem instalar (npx):**
```bash
npx tokensave <comando>
```

**Instalação global:**
```bash
npm install -g tokensave
tokensave --version
```

**Clone local (desenvolvimento):**
```bash
git clone https://github.com/diegolial/tokensave.git
cd tokensave
npm install
node bin/tokensave.js run
```

**Configure sua chave API:**
```bash
npx tokensave config
```

## 💻 Comandos

### `run` — Executa um pipeline

```bash
tokensave run [opções]
```

| Opção | Descrição | Exemplo |
|---|---|---|
| `--mode <modo>` | ID do modo | `--mode revisar-codigo` |
| `--papel <papel>` | Persona do AI | `--papel "Security Auditor"` |
| `--tarefa <tarefa>` | Descrição da tarefa | `--tarefa "Encontrar SQL injection"` |
| `--condicao <c>` | Condição de saída | `--condicao "Todos os CVEs"` |
| `--context-file <path>` | Arquivo (repetível) | `--context-file src/auth.js` |
| `--context-url <url>` | URL para fetch | `--context-url https://docs.com` |
| `--context-text <texto>` | Texto inline | `--context-text "function foo..."` |
| `--model <modelo>` | Modelo a usar | `--model gpt-4o` |
| `--template <nome>` | Template salvo | `--template security-audit` |
| `--save-as <nome>` | Salva template | `--save-as security-audit` |
| `--yes` | Pula confirmação | |
| `--dry-run` | Mostra custo sem chamar API | |

**Stdin pipe:**
```bash
cat src/api/auth.js | npx tokensave run \
  --papel "Security Auditor" \
  --tarefa "Encontrar vulnerabilidades" \
  --mode revisar-codigo \
  --yes
```

**Múltiplos arquivos:**
```bash
npx tokensave run \
  --papel "Architect" \
  --tarefa "Documentar core" \
  --context-file src/core/runner.js \
  --context-file src/core/provider.js \
  --mode documentacao \
  --yes
```

### `dash` — Dashboard web

```bash
npx tokensave dash --web
# Abre http://localhost:7878
```

Dashboard com 4 abas:
- **Run** — construir e disparar jobs
- **History** — tabela com todos os runs, tokens salvos, custo
- **Templates** — criar, visualizar, deletar templates
- **Settings** — configurar chaves API, modelos, preferências globais e por-projeto

### `listen` — Daemon WebSocket

```bash
# Terminal 1: dashboard
npx tokensave dash --web

# Terminal 2: listener
npx tokensave listen
# ⚡ tokensave listen → ws://localhost:7878/ws
#   Aguardando jobs do dashboard. Ctrl+C para parar.
```

Executa jobs despachados do browser em tempo real.

### `stats` — Resumo de economias

```bash
npx tokensave stats
# ⚡ tokensave stats
#   87 runs  ·  $1.3240 total  ·  69% salvo
#   Top modos:  revisar-codigo (34)  pitfalls (18)  swot (12)
#   Hoje:        3 runs  ·  $0.0821
```

### `templates` — Gerenciar templates

```bash
npx tokensave templates                      # listar
npx tokensave templates --delete security-audit  # deletar
```

### `config` — Configurar chaves e preferências

```bash
npx tokensave config
```

Modelos: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`, `gpt-4o`, `gpt-4o-mini`, `gemini-1.5-pro`, `gemini-1.5-flash`, `ollama/llama3`

### Outros comandos

- `setup` — Auto-detectar ferramentas de IA e injetar configs
- `skills` — Menu interativo de bundles por domínio
- `mcp` — Inicia servidor MCP

## 🧠 11 Modos de Raciocínio

| ID | Nome | Descrição | Caveman |
|---|---|---|---|
| `criar-sistema` | Criar Sistema | Arquitetura do zero: stack, estrutura, decisões | full |
| `revisar-codigo` | Revisar Código | Bugs, segurança, qualidade, code smell | full |
| `documentacao` | Documentação | README, ADR, changelog, JSDoc, guias | lite |
| `consultor` | Consultor | ROI, risco, decisão estratégica | full |
| `swot` | SWOT | Análise: forças, fraquezas, oportunidades, ameaças | full |
| `compare` | Compare | Comparação A vs B com critérios explícitos | full |
| `multi-perspectiva` | Multi-perspectiva | Mesmo problema por 4 ângulos (dev, PM, user, ops) | full |
| `parallel-lens` | Parallel Lens | 3 abordagens simultâneas — mostra todas | ultra |
| `pitfalls` | Pitfalls | O que pode dar errado, armadilhas, edge cases | full |
| `metrics-mode` | Metrics Mode | Define e mede KPIs do que está sendo construído | full |
| `context-stack` | Context Stack | Empilha contexto progressivamente sem explodir tokens | full |

**Caveman levels** controlam agressividade da compressão:
- `lite` — preserva formatação e comentários
- `full` — remove prosa, mantém estrutura e lógica
- `ultra` — máxima compressão, esqueleto de código

## 📁 Fontes de Contexto

Combine livremente:

| Fonte | Flag | Notas |
|---|---|---|
| Arquivo | `--context-file <path>` | Repetível para múltiplos |
| URL | `--context-url <url>` | Fetch + remove HTML tags |
| Texto | `--context-text <text>` | String na linha de comando |
| Stdin | `cat file \| tokensave run ...` | Lê do pipe se não TTY |

## ⚙️ Configuração

**Arquivo global** (`~/.tokensave/config.json`):

```json
{
  "anthropic_api_key": "sk-ant-...",
  "openai_api_key": "sk-...",
  "google_api_key": "AIza...",
  "default_model": "claude-sonnet-4-6",
  "default_caveman": "full",
  "projects": {
    "/path/to/project": {
      "model": "gpt-4o",
      "caveman": "lite"
    }
  }
}
```

**Variáveis de ambiente:**
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`

**Preços (2026):**

| Modelo | Input / 1K | Output / 1K |
|---|---|---|
| claude-opus-4-7 | $0.015 | $0.075 |
| claude-sonnet-4-6 | $0.003 | $0.015 |
| claude-haiku-4-5 | $0.00025 | $0.00125 |
| gpt-4o | $0.0025 | $0.010 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| gemini-1.5-pro | $0.00125 | $0.005 |
| gemini-1.5-flash | $0.000075 | $0.0003 |
| ollama/* | $0 | $0 |

## 🏗️ Arquitetura

**Pipeline de compressão:**

1. **Headroom** — se contexto > 8000 tokens, trunka preservando seções densas
2. **Native (caveman)** — remove comentários, linhas brancas, imports, prosa

Sempre retorna: `{ text, originalTokens, compressedTokens, method }`

**Fluxo de requisição:**

```
tokensave run --papel "..." --tarefa "..." --context-file file.js

  1. src/cli/commands/run.js
     ├── lê todos os contextos (arquivos, stdin, URL)
     └── constrói pipeline: { papel, tarefa, contexto, modo, condicao, model }

  2. src/core/runner.js  runPipeline(pipeline)
     ├── validator.js     valida campos, modo, modelo
     ├── config.js        lê ~/.tokensave/config.json
     ├── provider.js      cria client API
     ├── compressor/      compress(contexto)
     ├── streamer.js      AsyncGenerator com chunks
     └── metrics.js       salva em SQLite

  3. Output streamado em tempo real
```

**Dashboard + WebSocket:**

`src/dashboard/web/server.js` roda um único `http.createServer()` que:
- Roteia HTTP através do Hono
- Atualiza `/ws` para WebSocket via `ws.WebSocketServer`

Clientes no browser recebem chunks de output em tempo real. O daemon `listen` também conecta como executor.

## 🧪 Testes

```bash
npm test                    # 66 testes
npm run test:watch         # watch mode
npx vitest run -t "pattern" # padrão específico
```

Nenhuma chave API necessária — tudo é mockado.

## 🐛 Resolução de Problemas

| Problema | Solução |
|---|---|
| `✗ Modelo inválido` | Execute `npx tokensave config` e escolha da lista |
| Dashboard em branco | Recarregue após o servidor iniciar completamente |
| `listen` sem jobs | Certifique-se que `dash --web` está rodando em outro terminal |
| Ollama recusando | `ollama serve` precisa estar rodando; verifique URL em config |
| `--context-file` não encontrado | Use caminhos absolutos ou `$(pwd)/path` |

## 📄 Licença

MIT

---

# English

> **tokensave** is a CLI that reduces tokens by 60–75% before calling any AI model.

## 🚀 What is it

tokensave wraps any AI model (Claude, GPT-4o, Gemini, Ollama) with a compression pipeline that strips noise from your context before it reaches the model — cutting token usage drastically without losing critical information. It ships with 11 structured reasoning modes, a real-time web dashboard, template management, a WebSocket daemon, SQLite history, and an MCP server for native Claude Code integration.

## ✨ Features

- **70% fewer tokens** — dual compression pipeline (headroom + native caveman) on every call
- **11 reasoning modes** — structured prompts: code review, SWOT, pitfalls, architecture, documentation, comparison, multi-perspective analysis, and more
- **Non-interactive mode** — fully scriptable via flags; stdin pipe; multiple files/URLs
- **Web dashboard** — 4-tab SPA at `localhost:7878`: dispatch jobs, view history, manage templates, configure settings
- **WebSocket daemon** (`listen`) — keep a worker running; dispatch jobs from the browser in real time
- **Templates** — save any pipeline; reuse in one command
- **Multi-provider** — Claude (Anthropic), GPT-4o (OpenAI), Gemini (Google), Ollama (local, free)
- **MCP server** — integrates compression directly into Claude Code as a native tool
- **SQLite history** — every run saved automatically; export CSV
- **--dry-run** — preview compressed prompt + estimated cost without spending tokens

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| CLI | Commander.js |
| Interactive UI | Inquirer.js |
| HTTP/WebSocket | Hono + `@hono/node-server` + `ws` |
| Database | SQLite via `better-sqlite3` |
| AI providers | `@anthropic-ai/sdk`, `openai`, `@google/generative-ai` |
| Terminal | Chalk |
| Tests | Vitest (66 tests) |

## 📋 Prerequisites

- **Node.js 18+** — verify with `node --version`
- At least one API key:
  - Anthropic: [console.anthropic.com](https://console.anthropic.com)
  - OpenAI: [platform.openai.com](https://platform.openai.com)
  - Google: [aistudio.google.com](https://aistudio.google.com)
  - Ollama (free): [ollama.ai](https://ollama.ai)

## 🎯 Quick Start

```bash
# Interactive — step through each prompt
npx tokensave run

# Non-interactive code review in one line
npx tokensave run \
  --papel "Security Auditor" \
  --tarefa "Review login endpoint" \
  --context-file ./src/api/auth.js \
  --mode revisar-codigo \
  --yes

# Preview tokens + cost (no API call)
npx tokensave run \
  --papel "Engineer" \
  --tarefa "Review auth" \
  --context-file ./src/auth.js \
  --mode revisar-codigo \
  --dry-run

# Open web dashboard
npx tokensave dash --web
```

## 📦 Installation

**No install (npx):**
```bash
npx tokensave <command>
```

**Global install:**
```bash
npm install -g tokensave
tokensave --version
```

**Local clone (development):**
```bash
git clone https://github.com/diegolial/tokensave.git
cd tokensave
npm install
node bin/tokensave.js run
```

**Configure your API key:**
```bash
npx tokensave config
```

## 💻 Commands

### `run` — Execute a pipeline

```bash
tokensave run [options]
```

| Option | Description | Example |
|---|---|---|
| `--mode <mode>` | Reasoning mode ID | `--mode revisar-codigo` |
| `--papel <role>` | AI persona | `--papel "Security Auditor"` |
| `--tarefa <task>` | Task description | `--tarefa "Find SQL injection"` |
| `--condicao <c>` | Exit condition | `--condicao "All CVEs listed"` |
| `--context-file <path>` | File context (repeatable) | `--context-file src/auth.js` |
| `--context-url <url>` | URL to fetch | `--context-url https://docs.com` |
| `--context-text <text>` | Inline text | `--context-text "function foo..."` |
| `--model <model>` | Model to use | `--model gpt-4o` |
| `--template <name>` | Saved template | `--template security-audit` |
| `--save-as <name>` | Save template | `--save-as security-audit` |
| `--yes` | Skip confirmation | |
| `--dry-run` | Show cost, no API call | |

**Stdin pipe:**
```bash
cat src/api/auth.js | npx tokensave run \
  --papel "Security Auditor" \
  --tarefa "Find vulnerabilities" \
  --mode revisar-codigo \
  --yes
```

**Multiple files:**
```bash
npx tokensave run \
  --papel "Architect" \
  --tarefa "Document core modules" \
  --context-file src/core/runner.js \
  --context-file src/core/provider.js \
  --mode documentacao \
  --yes
```

### `dash` — Web dashboard

```bash
npx tokensave dash --web
# Opens http://localhost:7878
```

Dashboard with 4 tabs:
- **Run** — build and dispatch jobs
- **History** — table of all runs with token savings and cost
- **Templates** — create, view, delete templates
- **Settings** — configure API keys, models, global and per-project preferences

### `listen` — WebSocket daemon

```bash
# Terminal 1: dashboard
npx tokensave dash --web

# Terminal 2: listener
npx tokensave listen
# ⚡ tokensave listen → ws://localhost:7878/ws
#   Aguardando jobs do dashboard. Ctrl+C para parar.
```

Executes jobs dispatched from the browser in real time.

### `stats` — Savings summary

```bash
npx tokensave stats
# ⚡ tokensave stats
#   87 runs  ·  $1.3240 total  ·  69% saved
#   Top modes:  revisar-codigo (34)  pitfalls (18)  swot (12)
#   Today:       3 runs  ·  $0.0821
```

### `templates` — Manage templates

```bash
npx tokensave templates                      # list
npx tokensave templates --delete security-audit  # delete
```

### `config` — Configure keys and preferences

```bash
npx tokensave config
```

Models: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`, `gpt-4o`, `gpt-4o-mini`, `gemini-1.5-pro`, `gemini-1.5-flash`, `ollama/llama3`

### Other commands

- `setup` — Auto-detect AI tools and inject configs
- `skills` — Interactive menu of domain bundles
- `mcp` — Start MCP server

## 🧠 11 Reasoning Modes

| ID | Name | Description | Caveman |
|---|---|---|---|
| `criar-sistema` | Create System | Architecture from scratch: stack, structure, decisions | full |
| `revisar-codigo` | Code Review | Bugs, security, quality, code smell | full |
| `documentacao` | Documentation | README, ADR, changelog, JSDoc, guides | lite |
| `consultor` | Consultant | ROI, risk, strategic decision | full |
| `swot` | SWOT | Analysis: strengths, weaknesses, opportunities, threats | full |
| `compare` | Compare | A vs B comparison with explicit criteria | full |
| `multi-perspectiva` | Multi-perspective | Same problem from 4 angles (dev, PM, user, ops) | full |
| `parallel-lens` | Parallel Lens | 3 simultaneous approaches — shows all | ultra |
| `pitfalls` | Pitfalls | What can go wrong, traps, edge cases | full |
| `metrics-mode` | Metrics Mode | Define and measure KPIs | full |
| `context-stack` | Context Stack | Stack context progressively without exploding tokens | full |

**Caveman levels** control compression aggressiveness:
- `lite` — preserve formatting and comments
- `full` — remove prose, keep structure and logic
- `ultra` — maximum compression, code skeleton only

## 📁 Context Sources

Combine freely:

| Source | Flag | Notes |
|---|---|---|
| File | `--context-file <path>` | Repeatable for multiple |
| URL | `--context-url <url>` | Fetch + strip HTML tags |
| Text | `--context-text <text>` | String on command line |
| Stdin | `cat file \| tokensave run ...` | Reads from pipe if not TTY |

## ⚙️ Configuration

**Global config file** (`~/.tokensave/config.json`):

```json
{
  "anthropic_api_key": "sk-ant-...",
  "openai_api_key": "sk-...",
  "google_api_key": "AIza...",
  "default_model": "claude-sonnet-4-6",
  "default_caveman": "full",
  "projects": {
    "/path/to/project": {
      "model": "gpt-4o",
      "caveman": "lite"
    }
  }
}
```

**Environment variables:**
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_API_KEY`

**Pricing (2026):**

| Model | Input / 1K | Output / 1K |
|---|---|---|
| claude-opus-4-7 | $0.015 | $0.075 |
| claude-sonnet-4-6 | $0.003 | $0.015 |
| claude-haiku-4-5 | $0.00025 | $0.00125 |
| gpt-4o | $0.0025 | $0.010 |
| gpt-4o-mini | $0.00015 | $0.0006 |
| gemini-1.5-pro | $0.00125 | $0.005 |
| gemini-1.5-flash | $0.000075 | $0.0003 |
| ollama/* | $0 | $0 |

## 🏗️ Architecture

**Compression pipeline:**

1. **Headroom** — if context > 8000 tokens, truncates while preserving dense sections
2. **Native (caveman)** — removes comments, blank lines, imports, prose

Always returns: `{ text, originalTokens, compressedTokens, method }`

**Request flow:**

```
tokensave run --papel "..." --tarefa "..." --context-file file.js

  1. src/cli/commands/run.js
     ├── reads all contexts (files, stdin, URL)
     └── builds pipeline: { papel, tarefa, contexto, modo, condicao, model }

  2. src/core/runner.js  runPipeline(pipeline)
     ├── validator.js     validates fields, mode, model
     ├── config.js        reads ~/.tokensave/config.json
     ├── provider.js      creates API client
     ├── compressor/      compress(contexto)
     ├── streamer.js      AsyncGenerator with chunks
     └── metrics.js       saves to SQLite

  3. Output streamed in real time
```

**Dashboard + WebSocket:**

`src/dashboard/web/server.js` runs a single `http.createServer()` that:
- Routes HTTP through Hono
- Upgrades `/ws` to WebSocket via `ws.WebSocketServer`

Clients in the browser receive output chunks in real time. The `listen` daemon also connects as an executor.

## 🧪 Testing

```bash
npm test                    # 66 tests
npm run test:watch         # watch mode
npx vitest run -t "pattern" # specific pattern
```

No API keys needed — all mocked.

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| `✗ Invalid model` | Run `npx tokensave config` and choose from list |
| Blank dashboard | Reload after server fully starts |
| `listen` no jobs | Make sure `dash --web` is running in another terminal |
| Ollama refusing | `ollama serve` must be running; check URL in config |
| `--context-file` not found | Use absolute paths or `$(pwd)/path` |

## 📄 License

MIT
