<div align="center">

# ⚡ tokensave

**Structured AI pipeline for any tool. One command. 70% less tokens.**

[![npm](https://img.shields.io/npm/v/tokensave?color=brightgreen)](https://www.npmjs.com/package/tokensave)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

[🇧🇷 Português](#-português) · [🇺🇸 English](#-english)

</div>

---

## 🇧🇷 Português

### O que é

tokensave é uma CLI que estrutura como você interage com AI. Em vez de enviar prompts ad-hoc, você define **papel → tarefa → contexto → modo de raciocínio → condição de saída**, o sistema comprime o contexto automaticamente, chama a API e streama o resultado no terminal. Cada execução é salva no histórico com métricas de tokens e custo.

**Economia típica: 60–75% nos tokens de entrada + 40–60% nos tokens de saída.**

---

### Instalação

Nenhuma instalação necessária. Requer apenas Node.js 18+.

```bash
npx tokensave
```

---

### Início rápido

```bash
# 1. Configure sua API key (Claude, GPT ou Gemini)
npx tokensave config

# 2. Injeta regras Caveman no Claude Code / Cursor / Copilot / Windsurf
npx tokensave setup

# 3. Execute um pipeline estruturado
npx tokensave run

# 4. Veja quanto economizou
npx tokensave stats
```

---

### Como funciona

```
npx tokensave run
       │
       ▼
┌─────────────────────────────────────────┐
│           Pipeline Builder              │
│                                         │
│  PAPEL      → persona do AI             │
│  TAREFA     → objetivo da sessão        │
│  CONTEXTO   → código / arquivo / texto  │
│  MODO       → modo de raciocínio        │
│  CONDIÇÃO   → critério de conclusão     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│              Compressor                 │
│                                         │
│  Headroom (Python) → -60 a -75%         │
│  Native fallback   → -20 a -35%         │
│  Caveman rules     → -40 a -60% output  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│               Executor                  │
│                                         │
│  Claude / GPT / Gemini (streaming)      │
│  Métricas salvas no SQLite local        │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│             Dashboard                   │
│                                         │
│  Terminal TUI  →  npx tokensave dash    │
│  Web (Hono)    →  localhost:7878        │
└─────────────────────────────────────────┘
```

---

### Estrutura do projeto

```
tokensave/
├── bin/
│   └── tokensave.js              ← entry point npx
├── src/
│   ├── cli/
│   │   ├── index.js              ← comandos Commander (run/setup/dash/skills/stats/config)
│   │   └── commands/
│   │       ├── run.js            ← inicia o pipeline builder + executor
│   │       ├── setup.js          ← detecta tools e injeta configs
│   │       ├── dash.js           ← TUI ou web dashboard
│   │       ├── skills.js         ← menu de bundles por domínio
│   │       ├── stats.js          ← resumo rápido no terminal
│   │       └── config.js         ← API keys e modelo padrão
│   ├── pipeline/
│   │   ├── builder.js            ← fluxo interativo com Inquirer
│   │   ├── executor.js           ← chama API, streama, salva métricas
│   │   └── modes/
│   │       ├── index.js          ← getModeById, getModeChoices, MODES[]
│   │       ├── criar-sistema.js  ← arquitetura do zero
│   │       ├── revisar-codigo.js ← bugs, segurança, qualidade
│   │       ├── documentacao.js   ← README, ADR, JSDoc
│   │       ├── consultor.js      ← ROI, risco, decisão C-level
│   │       ├── swot.js           ← análise estratégica
│   │       ├── compare.js        ← A vs B com critérios
│   │       ├── multi-perspectiva.js ← Dev + PM + User + Ops
│   │       ├── parallel-lens.js  ← 3 abordagens + matriz de decisão
│   │       ├── pitfalls.js       ← o que pode dar errado
│   │       ├── metrics-mode.js   ← KPIs e instrumentação
│   │       └── context-stack.js  ← contexto progressivo em camadas
│   ├── compressor/
│   │   ├── headroom.js           ← subprocess Python headroom-ai
│   │   ├── native.js             ← compressão leve sem Python
│   │   └── caveman.js            ← regras Caveman nos system prompts
│   ├── detector/
│   │   └── index.js              ← detecta Claude Code, Cursor, Copilot, Windsurf
│   ├── injector/
│   │   ├── claude-code.js        ← customInstructions em ~/.claude/settings.json
│   │   ├── cursor.js             ← cursor.rules em Cursor/settings.json
│   │   ├── copilot.js            ← .github/copilot-instructions.md
│   │   └── windsurf.js           ← ~/.codeium/windsurf/.windsurfrc
│   ├── dashboard/
│   │   ├── tui.js                ← dashboard terminal (keyboard-driven)
│   │   └── web/
│   │       ├── server.js         ← Hono HTTP server + REST API
│   │       └── index.html        ← dashboard web (HTML + JS vanilla)
│   └── store/
│       └── db.js                 ← better-sqlite3, histórico de sessões
├── skills/
│   └── index.js                  ← 8 bundles: Security Audit, DevOps, etc.
└── tests/                        ← 35 testes (vitest)
```

---

### Comandos

| Comando | Descrição |
|---------|-----------|
| `npx tokensave run` | Pipeline builder interativo |
| `npx tokensave run --mode swot` | Pula menu, vai direto para o modo |
| `npx tokensave setup` | Detecta AI tools e injeta Caveman |
| `npx tokensave skills` | Menu de bundles por domínio |
| `npx tokensave dash` | Dashboard terminal |
| `npx tokensave dash --web` | Dashboard web em localhost:7878 |
| `npx tokensave stats` | Resumo rápido de tokens economizados |
| `npx tokensave config` | Configura API keys e modelo padrão |

---

### Campos do pipeline

| Campo | O que é | Exemplo |
|-------|---------|---------|
| **PAPEL** | Persona do AI | Security Auditor, Arquiteto Sênior |
| **TAREFA** | O que precisa ser feito | "Revisar a API de autenticação" |
| **CONTEXTO** | Código, caminho de arquivo ou texto | `./src/auth/` ou código colado |
| **MODO** | Modo de raciocínio | SWOT, Pitfalls, Parallel Lens |
| **CONDIÇÃO** | O que define "pronto" | "Todas as vulnerabilidades identificadas" |

---

### Modos de raciocínio

| # | Modo | O que faz |
|---|------|-----------|
| 1 | Criar Sistema | Arquitetura do zero: stack, estrutura, decisões |
| 2 | Revisar Código | Bugs, segurança, qualidade, code smell |
| 3 | Documentação | README, ADR, changelog, JSDoc |
| 4 | Consultor | ROI, risco, decisão como C-level |
| 5 | SWOT | Forças, fraquezas, oportunidades, ameaças |
| 6 | Compare | A vs B com critérios explícitos |
| 7 | Multi-perspectiva | Dev + PM + User + Ops |
| 8 | Parallel Lens | 3 abordagens simultâneas + matriz de decisão |
| 9 | Pitfalls | O que pode dar errado, armadilhas, edge cases |
| 10 | Metrics Mode | Define e mede KPIs |
| 11 | Context Stack | Contexto progressivo sem explodir tokens |

---

### Skills — Bundles por domínio

Acesse via `npx tokensave skills`:

| Bundle | Papel padrão | Modos |
|--------|-------------|-------|
| Security Audit | Security Auditor | Revisar Código + Pitfalls + Multi-perspectiva |
| Data Science | Data Scientist | Metrics Mode + Criar Sistema + Compare |
| Database | DBA | Criar Sistema + Revisar Código + Pitfalls |
| Software Architect | Arquiteto Sênior | Criar Sistema + Compare + Multi-perspectiva |
| UX/UI | UX Researcher | Multi-perspectiva + Consultor + Pitfalls |
| DevOps | SRE | Criar Sistema + Metrics Mode + Pitfalls |
| Code Review | Tech Lead | Revisar Código + Pitfalls + Consultor |
| Documentation | Technical Writer | Documentação + Context Stack |

---

### Compressão de tokens

**Entrada (Headroom):** comprime código, logs e JSON antes de enviar para a API.
- Com `headroom-ai` (Python 3.10+): economia de 60–75%
- Fallback nativo (remoção de comentários + truncamento inteligente): 20–35%

**Saída (Caveman):** regras injetadas no system prompt de cada modo eliminam filler, pleasantries e hedging — economia de 40–60% nas respostas.

---

### Integração com AI tools

`npx tokensave setup` detecta e injeta as regras Caveman nativamente:

| Tool | O que é injetado |
|------|-----------------|
| Claude Code | `customInstructions` em `~/.claude/settings.json` |
| Cursor | `cursor.rules` em `Cursor/User/settings.json` |
| GitHub Copilot | `.github/copilot-instructions.md` na raiz do projeto |
| Windsurf | `~/.codeium/windsurf/.windsurfrc` |

---

### Modelos suportados

| Provedor | Modelos | Variável de ambiente |
|----------|---------|---------------------|
| Anthropic | claude-sonnet-4-6, claude-haiku-4-5 | `ANTHROPIC_API_KEY` |
| OpenAI | gpt-4o, gpt-4o-mini | `OPENAI_API_KEY` |
| Google | gemini-1.5-pro, gemini-1.5-flash | `GOOGLE_API_KEY` |

---

### Requisitos

- Node.js 18+
- API key de pelo menos um provedor (Anthropic, OpenAI ou Google)
- Python 3.10+ com `headroom-ai` para compressão máxima (opcional)

---

---

## 🇺🇸 English

### What it is

tokensave is a CLI that structures how you interact with AI. Instead of ad-hoc prompts, you define **role → task → context → reasoning mode → exit condition** — the system auto-compresses the context, calls the API, and streams the result to your terminal. Every run is saved locally with token and cost metrics.

**Typical savings: 60–75% on input tokens + 40–60% on output tokens.**

---

### Installation

No installation needed. Requires Node.js 18+ only.

```bash
npx tokensave
```

---

### Quickstart

```bash
# 1. Set your API key (Claude, GPT, or Gemini)
npx tokensave config

# 2. Inject Caveman rules into Claude Code / Cursor / Copilot / Windsurf
npx tokensave setup

# 3. Run a structured pipeline
npx tokensave run

# 4. Check your savings
npx tokensave stats
```

---

### How it works

```
npx tokensave run
       │
       ▼
┌─────────────────────────────────────────┐
│           Pipeline Builder              │
│                                         │
│  ROLE       → AI persona                │
│  TASK       → session objective         │
│  CONTEXT    → code / file / text        │
│  MODE       → reasoning mode            │
│  CONDITION  → done-when criteria        │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│              Compressor                 │
│                                         │
│  Headroom (Python) → -60 to -75%        │
│  Native fallback   → -20 to -35%        │
│  Caveman rules     → -40 to -60% output │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│               Executor                  │
│                                         │
│  Claude / GPT / Gemini (streaming)      │
│  Metrics saved to local SQLite          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│             Dashboard                   │
│                                         │
│  Terminal TUI  →  npx tokensave dash    │
│  Web (Hono)    →  localhost:7878        │
└─────────────────────────────────────────┘
```

---

### Project structure

```
tokensave/
├── bin/
│   └── tokensave.js              ← npx entry point
├── src/
│   ├── cli/
│   │   ├── index.js              ← Commander commands (run/setup/dash/skills/stats/config)
│   │   └── commands/
│   │       ├── run.js            ← starts pipeline builder + executor
│   │       ├── setup.js          ← detects tools and injects configs
│   │       ├── dash.js           ← TUI or web dashboard
│   │       ├── skills.js         ← domain bundle menu
│   │       ├── stats.js          ← quick terminal summary
│   │       └── config.js         ← API keys and default model
│   ├── pipeline/
│   │   ├── builder.js            ← interactive flow with Inquirer
│   │   ├── executor.js           ← calls API, streams, saves metrics
│   │   └── modes/
│   │       ├── index.js          ← getModeById, getModeChoices, MODES[]
│   │       ├── criar-sistema.js  ← architecture from scratch
│   │       ├── revisar-codigo.js ← bugs, security, quality
│   │       ├── documentacao.js   ← README, ADR, JSDoc
│   │       ├── consultor.js      ← ROI, risk, C-level decision
│   │       ├── swot.js           ← strategic analysis
│   │       ├── compare.js        ← A vs B with criteria
│   │       ├── multi-perspectiva.js ← Dev + PM + User + Ops
│   │       ├── parallel-lens.js  ← 3 approaches + decision matrix
│   │       ├── pitfalls.js       ← what can go wrong
│   │       ├── metrics-mode.js   ← KPIs and instrumentation
│   │       └── context-stack.js  ← progressive context in layers
│   ├── compressor/
│   │   ├── headroom.js           ← Python headroom-ai subprocess
│   │   ├── native.js             ← lightweight compression, no Python
│   │   └── caveman.js            ← Caveman rules in system prompts
│   ├── detector/
│   │   └── index.js              ← detects Claude Code, Cursor, Copilot, Windsurf
│   ├── injector/
│   │   ├── claude-code.js        ← customInstructions in ~/.claude/settings.json
│   │   ├── cursor.js             ← cursor.rules in Cursor/settings.json
│   │   ├── copilot.js            ← .github/copilot-instructions.md
│   │   └── windsurf.js           ← ~/.codeium/windsurf/.windsurfrc
│   ├── dashboard/
│   │   ├── tui.js                ← terminal dashboard (keyboard-driven)
│   │   └── web/
│   │       ├── server.js         ← Hono HTTP server + REST API
│   │       └── index.html        ← web dashboard (vanilla HTML + JS)
│   └── store/
│       └── db.js                 ← better-sqlite3, run history
├── skills/
│   └── index.js                  ← 8 bundles: Security Audit, DevOps, etc.
└── tests/                        ← 35 tests (vitest)
```

---

### Commands

| Command | Description |
|---------|-------------|
| `npx tokensave run` | Interactive pipeline builder |
| `npx tokensave run --mode swot` | Skip menu, jump to a specific mode |
| `npx tokensave setup` | Detect AI tools + inject Caveman rules |
| `npx tokensave skills` | Domain skill bundle menu |
| `npx tokensave dash` | Terminal dashboard |
| `npx tokensave dash --web` | Web dashboard at localhost:7878 |
| `npx tokensave stats` | Quick token savings summary |
| `npx tokensave config` | Set API keys and default model |

---

### Pipeline fields

| Field | What it is | Example |
|-------|-----------|---------|
| **ROLE** | AI persona | Security Auditor, Senior Architect |
| **TASK** | What needs to be done | "Review the authentication API" |
| **CONTEXT** | Code, file path, or text | `./src/auth/` or pasted code |
| **MODE** | Reasoning mode | SWOT, Pitfalls, Parallel Lens |
| **CONDITION** | Done-when criteria | "All critical vulnerabilities identified" |

---

### Reasoning modes

| # | Mode | What it does |
|---|------|-------------|
| 1 | Criar Sistema | Architecture from scratch: stack, structure, decisions |
| 2 | Revisar Código | Bugs, security, quality, code smell |
| 3 | Documentação | README, ADR, changelog, JSDoc |
| 4 | Consultor | ROI, risk, decisions as C-level |
| 5 | SWOT | Strengths, weaknesses, opportunities, threats |
| 6 | Compare | A vs B with explicit criteria |
| 7 | Multi-perspectiva | Dev + PM + User + Ops angles |
| 8 | Parallel Lens | 3 independent approaches + decision matrix |
| 9 | Pitfalls | What can go wrong, traps, edge cases |
| 10 | Metrics Mode | Define and measure KPIs |
| 11 | Context Stack | Progressive context without token explosion |

---

### Skills — Domain bundles

Access via `npx tokensave skills`:

| Bundle | Default Role | Modes |
|--------|-------------|-------|
| Security Audit | Security Auditor | Revisar Código + Pitfalls + Multi-perspectiva |
| Data Science | Data Scientist | Metrics Mode + Criar Sistema + Compare |
| Database | DBA | Criar Sistema + Revisar Código + Pitfalls |
| Software Architect | Senior Architect | Criar Sistema + Compare + Multi-perspectiva |
| UX/UI | UX Researcher | Multi-perspectiva + Consultor + Pitfalls |
| DevOps | SRE | Criar Sistema + Metrics Mode + Pitfalls |
| Code Review | Tech Lead | Revisar Código + Pitfalls + Consultor |
| Documentation | Technical Writer | Documentação + Context Stack |

---

### Token compression

**Input (Headroom):** compresses code, logs, and JSON before sending to the API.
- With `headroom-ai` (Python 3.10+): 60–75% savings
- Native fallback (comment removal + smart truncation): 20–35%

**Output (Caveman):** rules injected into every mode's system prompt eliminate filler, pleasantries, and hedging — 40–60% savings on responses.

---

### AI tool integration

`npx tokensave setup` detects and natively injects Caveman rules into:

| Tool | What gets injected |
|------|--------------------|
| Claude Code | `customInstructions` in `~/.claude/settings.json` |
| Cursor | `cursor.rules` in `Cursor/User/settings.json` |
| GitHub Copilot | `.github/copilot-instructions.md` in project root |
| Windsurf | `~/.codeium/windsurf/.windsurfrc` |

---

### Supported models

| Provider | Models | Env var |
|----------|--------|---------|
| Anthropic | claude-sonnet-4-6, claude-haiku-4-5 | `ANTHROPIC_API_KEY` |
| OpenAI | gpt-4o, gpt-4o-mini | `OPENAI_API_KEY` |
| Google | gemini-1.5-pro, gemini-1.5-flash | `GOOGLE_API_KEY` |

---

### Requirements

- Node.js 18+
- API key for at least one provider (Anthropic, OpenAI, or Google)
- Python 3.10+ with `headroom-ai` for maximum compression (optional)

---

### License

MIT
