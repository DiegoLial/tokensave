# ⚡ tokensave

> Structured AI pipeline for any tool. One command. 70% less tokens.

```
npx tokensave
```

No installation required beyond Node.js 18+.

---

## What it does

tokensave structures how you interact with AI: define role, task, context, reasoning mode, and exit condition — then executes via API with automatic token compression and streams the result. A local dashboard tracks every run.

**Typical savings: 60–75% on input tokens (via headroom/native compression) + 40–60% on output (via Caveman rules).**

---

## Quickstart

```bash
# 1. Configure your API key
npx tokensave config

# 2. Inject Caveman rules into Claude Code / Cursor / Copilot / Windsurf
npx tokensave setup

# 3. Run a structured pipeline
npx tokensave run

# 4. Check your savings
npx tokensave stats
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npx tokensave run` | Interactive pipeline builder |
| `npx tokensave run --mode swot` | Skip menu, go straight to a mode |
| `npx tokensave setup` | Detect AI tools + inject Caveman rules |
| `npx tokensave skills` | Domain skill bundles (Security Audit, DevOps, etc.) |
| `npx tokensave dash` | Terminal dashboard |
| `npx tokensave dash --web` | Web dashboard at localhost:7878 |
| `npx tokensave stats` | Quick token savings summary |
| `npx tokensave config` | Set API keys and default model |

---

## Pipeline Fields

| Field | What it is | Example |
|-------|-----------|---------|
| **PAPEL** | AI persona | Security Auditor, Arquiteto Sênior |
| **TAREFA** | What to do | "Review the authentication API" |
| **CONTEXTO** | Code, file path, or text | `./src/auth/` or pasted code |
| **MODO** | Reasoning mode | SWOT, Pitfalls, Parallel Lens |
| **CONDIÇÃO** | Done-when | "All critical vulnerabilities identified" |

---

## Reasoning Modes

| # | Mode | What it does |
|---|------|-------------|
| 1 | Criar Sistema | Architecture from scratch: stack, structure, decisions |
| 2 | Revisar Código | Bugs, security, quality, smell |
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

## Skills (Domain Bundles)

Access via `npx tokensave skills`:

| Bundle | Default Role | Modes |
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

## Token Compression

**Input (Headroom):** Compresses code, logs, JSON before sending to API.
- Uses `headroom-ai` Python subprocess when available (60–75% savings)
- Falls back to native compression (comment removal + smart truncation, 20–35%)

**Output (Caveman):** Rules injected into every system prompt eliminate filler, pleasantries, and hedging (40–60% savings).

---

## AI Tool Integration

`npx tokensave setup` detects and injects Caveman rules natively into:

| Tool | What gets injected |
|------|--------------------|
| Claude Code | `customInstructions` in `~/.claude/settings.json` |
| Cursor | `cursor.rules` in Cursor `settings.json` |
| GitHub Copilot | `.github/copilot-instructions.md` in project root |
| Windsurf | `~/.codeium/windsurf/.windsurfrc` |

---

## Models Supported

Configure via `npx tokensave config` or set env vars:

| Provider | Models | Env var |
|----------|--------|---------|
| Anthropic | claude-sonnet-4-6, claude-haiku-4-5 | `ANTHROPIC_API_KEY` |
| OpenAI | gpt-4o, gpt-4o-mini | `OPENAI_API_KEY` |
| Google | gemini-1.5-pro, gemini-1.5-flash | `GOOGLE_API_KEY` |

---

## Dashboard

```
npx tokensave dash        # terminal TUI
npx tokensave dash --web  # web at localhost:7878
```

Web dashboard features:
- Token savings by day, mode, model
- Full run history with filters
- CSV export
- Zero external dependencies (Hono + vanilla HTML/JS)

---

## Requirements

- Node.js 18+
- API key for at least one provider (Anthropic, OpenAI, or Google)
- Python 3.10+ with `headroom-ai` for maximum compression (optional)

---

## License

MIT
