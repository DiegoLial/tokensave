<div align="center">

# ⚡ tokensave

### Structured AI pipeline for any tool. One command. 70% less tokens.

</div>

---

## The Problem

Developers using AI coding tools (Claude Code, Cursor, Copilot, Windsurf) interact with them through unstructured, ad-hoc prompts. No clear role definition. No reasoning mode matched to the task. No context compression. No visibility into what's being spent.

The result: high cost, generic responses, and zero insight into how many tokens are being wasted.

---

## The Idea

Most of the tokens spent in an AI session are noise — not signal.

Noise on the **input** side: bloated context, comments, blank lines, redundant text that doesn't add meaning to the model.

Noise on the **output** side: pleasantries, hedging, filler phrases, repetition of what was already said.

tokensave attacks both sides simultaneously and adds a third layer: **structure**. A well-structured prompt — with a defined role, a clear task, a scoped context, and a specific exit condition — produces better answers with fewer tokens than any compression technique alone.

---

## What tokensave does

```
You define →   ROLE + TASK + CONTEXT + MODE + CONDITION
                          │
                          ▼
              Compress input (headroom or native)
              Inject Caveman output rules
                          │
                          ▼
              Stream response (Claude / GPT / Gemini)
                          │
                          ▼
              Save metrics → local SQLite
              Show savings → terminal or web dashboard
```

One command. Every AI tool. No boilerplate.

---

## The Compression Stack

tokensave uses two independent compression mechanisms:

### Input — Headroom
Semantic compressor that removes redundancy from code, logs, and JSON while preserving technical meaning. Runs as a Python subprocess (`headroom-ai`). When Python isn't available, falls back to a native JS compressor (comment removal, blank line collapse, smart truncation).

**Typical savings: 60–75% on input tokens.**

### Output — Caveman
A set of writing rules injected into the system prompt of every reasoning mode. Named after the principle that the most information-dense communication uses the fewest words. Three levels — `lite`, `full`, `ultra` — calibrated for the expected output type of each mode.

**Typical savings: 40–60% on output tokens.**

---

## Reasoning Modes

The core insight behind tokensave is that **the reasoning mode should match the task**. A security review requires a different cognitive frame than architecture design. A SWOT analysis requires a different structure than a comparison. Each mode ships with a system prompt engineered for that specific type of thinking.

| Mode | When to use |
|------|------------|
| **Criar Sistema** | You need to design something from scratch — pick a stack, define structure, make decisions |
| **Revisar Código** | You need a thorough technical review — bugs, security, quality, smell |
| **Documentação** | You need to produce developer-facing documentation |
| **Consultor** | You need a business or strategic recommendation with ROI and risk assessment |
| **SWOT** | You need to map the strategic landscape of a product, feature, or decision |
| **Compare** | You need to evaluate two or more options against explicit criteria |
| **Multi-perspectiva** | You need to see the same problem through Dev, PM, User, and Ops lenses simultaneously |
| **Parallel Lens** | You need three fully independent approaches with a decision matrix — no winner picked |
| **Pitfalls** | You need to find everything that can go wrong before it does |
| **Metrics Mode** | You need to define what success looks like in measurable terms |
| **Context Stack** | You have too much context — this mode layers it progressively to avoid token explosion |

---

## AI Tool Integration

tokensave doesn't replace your AI tool — it makes it better. Running `npx tokensave setup` detects which tools are installed and injects Caveman output rules natively into their configuration files. Your tool keeps working exactly as before, but its responses become denser and more technical.

| Tool | Integration |
|------|------------|
| Claude Code | `customInstructions` in `~/.claude/settings.json` |
| Cursor | `cursor.rules` in `Cursor/User/settings.json` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `~/.codeium/windsurf/.windsurfrc` |

---

## Skills — Domain Bundles

For teams or individuals who work primarily in one domain, Skills pre-configure the pipeline with the right role, modes, and exit conditions for that context. A Security Auditor skill, a DevOps skill, a Code Review skill — each one is a set of defaults that lets you skip configuration and go straight to the work.

---

## Dashboard

Every pipeline run is saved locally in a SQLite database. The dashboard — available both as a terminal TUI and a web interface at `localhost:7878` — shows token savings over time, cost by model, most used modes, and a full filterable run history with CSV export.

No telemetry. No cloud. Everything stays on your machine.

---

## Design Principles

**Zero install friction.** `npx tokensave` works on any machine with Node.js 18+. No global install, no setup wizard, no account creation.

**Local by default.** Metrics, config, and history live in `~/.tokensave/`. Nothing leaves your machine unless you call an AI provider API — which you were already doing.

**Progressive enhancement.** The system works without Python (native compression fallback), without headroom (Caveman still runs), and without setup (pipeline works standalone). Each layer adds savings on top of the previous one.

**Structure over volume.** A 300-token structured prompt outperforms a 3,000-token rambling one. tokensave enforces structure as a first-class concept, not as an afterthought.

---

## Who it's for

- Developers who use AI tools daily and want to reduce their API costs without changing their workflow
- Teams that want consistent, structured AI interactions across a project
- Anyone who finds AI responses too verbose and wants denser, more technical output by default

---

*Built with [Commander.js](https://github.com/tj/commander.js), [Inquirer.js](https://github.com/SBoudrias/Inquirer.js), [Hono](https://github.com/honojs/hono), [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), and [headroom-ai](https://github.com/outlines-dev/headroom).*
