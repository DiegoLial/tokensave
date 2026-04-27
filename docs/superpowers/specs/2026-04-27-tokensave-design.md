# Tokensave — Design Spec
**Data:** 2026-04-27  
**Status:** Draft  
**Autor:** diegokiub@gmail.com

---

## Proposta de Valor

> *"Structured AI pipeline for any tool. One command. 70% less tokens."*

Um sistema de pipeline que estrutura **como** você interage com AI — define papel, tarefa, contexto, modo de raciocínio e condição de saída — executa via API diretamente ou injeta no AI tool instalado, com compressão automática de tokens e dashboard de monitoramento em tempo real.

---

## Problema

Desenvolvedores e empresas usam AI coding tools (Claude Code, Cursor, Copilot, Windsurf) de forma não estruturada: prompts ad-hoc, sem contexto claro, sem modo de raciocínio adequado para a tarefa, e gastando tokens desnecessários em respostas prolixas e contextos não comprimidos.

Resultado: custo alto, respostas genéricas, nenhuma visibilidade de quanto está sendo gasto.

---

## Solução

`npx tokensave` — uma CLI universal que:

1. Detecta qual AI tool está instalado e injeta configurações nativas
2. Guia o usuário por um pipeline estruturado (PAPEL → TAREFA → CONTEXTO → RACIOCÍNIO → CONDIÇÃO)
3. Comprime entrada e saída automaticamente (Headroom + Caveman)
4. Executa via API e streama o resultado
5. Coleta métricas e exibe no dashboard (TUI + web)

---

## Arquitetura

```
npx tokensave
      │
      ├─ [setup] detecta tools instalados, injeta configs nativas, sobe proxy sidecar
      │
      └─ [run] Pipeline Builder interativo
              │
              ├─ PAPEL       → persona do AI
              ├─ TAREFA      → objetivo da sessão
              ├─ CONTEXTO    → código / URL / arquivo / texto
              ├─ RACIOCÍNIO  → modo selecionado
              └─ CONDIÇÃO    → critério de conclusão
                      │
                      ▼
              Executor
              ├─ monta system prompt otimizado por modo
              ├─ comprime contexto via Headroom (Python subprocess)
              ├─ injeta regras Caveman no system prompt
              ├─ chama API (Claude / OpenAI / Gemini)
              ├─ streama resposta no terminal
              └─ persiste métricas no SQLite local
                      │
                      ▼
              Dashboard (TUI | Web)
```

---

## Pipeline Builder — Campos

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| **PAPEL** | Persona que o AI assume | Arquiteto de Software, Consultor, Security Auditor |
| **TAREFA** | O que precisa ser feito | "Revisar a API de autenticação" |
| **CONTEXTO** | Background, código, arquivo, URL | path de arquivo, trecho de código, URL |
| **RACIOCÍNIO** | Modo de análise | SWOT, pitfalls, multi-perspectiva... |
| **CONDIÇÃO** | O que define "pronto" | "Todas vulnerabilidades críticas identificadas" |

---

## Modos de Raciocínio

Cada modo carrega um system prompt otimizado + nível Caveman calibrado para aquele tipo de output.

| # | Modo | O que faz | Caveman level |
|---|------|-----------|---------------|
| 1 | **Criar sistema** | Arquitetura do zero: stack, estrutura, decisões | full |
| 2 | **Revisar código** | Bugs, segurança, qualidade, smell | full |
| 3 | **Documentação** | README, ADR, changelog, JSDoc | lite |
| 4 | **Consultor** | ROI, risco, decisão como C-level | full |
| 5 | **SWOT** | Forças, fraquezas, oportunidades, ameaças | full |
| 6 | **Compare** | A vs B com critérios explícitos | full |
| 7 | **Multi-perspectiva** | Mesmo problema por N ângulos (dev, PM, user, ops) | full |
| 8 | **Parallel lens** | N abordagens simultâneas, mostra todas | ultra |
| 9 | **Pitfalls** | O que pode dar errado, armadilhas, edge cases | full |
| 10 | **Metrics mode** | Define e mede KPIs do que está sendo construído | full |
| 11 | **Context stack** | Empilha contexto progressivo sem explodir tokens | full |

---

## Fluxo Interativo (UX do terminal)

```
$ npx tokensave run

? Papel      › Arquiteto de Software
? Tarefa     › Revisar a API de autenticação do projeto
? Contexto   › [path: ./src/auth/] (2.847 tokens detectados)
? Modo       › [2] Revisar código
? Condição   › Todas as vulnerabilidades críticas identificadas

─────────────────────────────────────────
  Tokens originais:    2.847
  Após compressão:     810   (-71%)
  Custo estimado:      $0.004
  Modelo:              claude-sonnet-4-6
─────────────────────────────────────────

  Executar? (S/n) › S

  ▶ Executando pipeline...
```

---

## Compressão de Tokens

### Entrada (Headroom)
- Comprime código, logs, JSON, outputs de ferramentas antes de enviar para API
- Implementado via `headroom-ai` Python subprocess (requer Python 3.10+)
- Se Python não estiver disponível: tokensave usa compressão própria leve (truncamento inteligente + remoção de comentários/whitespace) com economia estimada de 20–35%
- Estimativa de economia com headroom: 60–75% em contextos de código

### Saída (Caveman)
- Regras Caveman embutidas no system prompt de cada modo
- Elimina filler, pleasantries, hedging, repetição
- Estimativa de economia: 40–60% nas respostas
- Funciona independente do Python — é injeção de texto no system prompt

### Estimativa pré-execução
- Antes de chamar a API, o pipeline estima tokens e custo
- Usuário confirma antes de executar

### Proxy Sidecar vs Subprocess Headroom
São dois componentes distintos:
- **Subprocess Headroom**: comprime contexto dentro do executor antes de chamar a API
- **Proxy Sidecar** (porta 7878): intercepta chamadas de tools externas (Claude Code, Cursor) para alimentar o dashboard com métricas reais de quem não usa o pipeline direto

---

## Integração com AI Tools Instalados

O setup (`npx tokensave setup`) detecta e injeta configurações nativas:

| Tool | O que injeta |
|------|-------------|
| **Claude Code** | MCP server headroom + hooks + regras Caveman em `settings.json` |
| **Cursor** | `cursor.rules` em `settings.json` + headroom em `mcp.json` |
| **GitHub Copilot** | `.github/copilot-instructions.md` com regras Caveman |
| **Windsurf** | `.windsurfrc` + regras no workspace settings |
| **Outro detectado** | Gera arquivo `.ai-rules.md` genérico + instrução manual |

Detecção por heurísticas de filesystem:
- `~/.claude/` → Claude Code
- `~/.cursor/` → Cursor
- `~/.vscode/extensions/github.copilot*/` → Copilot (detecção via extensão VS Code instalada)
- `~/.codeium/windsurf/` → Windsurf
- Fallback: pergunta ao usuário qual tool usar se nenhum for detectado com confiança

---

## Dashboard

### Terminal (padrão)
```
npx tokensave dash
```
```
┌─ TOKENSAVE ─────────────────────────────────────────────┐
│  Sessão    Pipelines   Tokens economizados   Custo real  │
│  ───────   ─────────   ───────────────────   ──────────  │
│  hoje      12          47.320 (-71%)         $0.18       │
│  total     87          341.200 (-69%)        $1.32       │
│                                                          │
│  Modo mais usado: Revisar código (34%)                   │
│                                                          │
│  Últimos pipelines                                       │
│  ─────────────────                                       │
│  14:23  security-audit   -68%  2.1s  ✓ claude-sonnet    │
│  13:45  criar-sistema    -74%  4.3s  ✓ claude-sonnet    │
│  12:10  swot-analysis    -61%  1.8s  ✓ gpt-4o           │
└─────────────────────────────────────────────────────────┘
  [r] refresh  [h] histórico  [w] abrir web  [q] sair
```

### Web (`--web`)
```
npx tokensave dash --web
→ http://localhost:7878
```
- Gráficos de tokens por dia, por modo, por modelo
- Tabela de histórico com filtros
- Exportação CSV
- Zero dependências externas (HTML + JS vanilla servido pelo Hono)

---

## Skills por Domínio

Acessível via `npx tokensave skills` (menu interativo):

| Bundle | Modos ativados por padrão | Papel padrão |
|--------|--------------------------|--------------|
| **Security Audit** | Revisar código + Pitfalls + Multi-perspectiva | Security Auditor |
| **Data Science** | Metrics mode + Criar sistema + Compare | Data Scientist |
| **Database** | Criar sistema + Revisar código + Pitfalls | DBA |
| **Software Architect** | Criar sistema + Compare + Multi-perspectiva | Arquiteto Sênior |
| **UX/UI** | Multi-perspectiva + Consultor + Pitfalls | UX Researcher |
| **DevOps** | Criar sistema + Metrics mode + Pitfalls | SRE |
| **Code Review** | Revisar código + Pitfalls + Consultor | Tech Lead |
| **Documentation** | Documentação + Context stack | Technical Writer |

Cada bundle instala um conjunto de papéis pré-configurados + condições de saída padrão para aquele domínio.

---

## Estrutura do Repositório

```
tokensave/
├── bin/
│   └── tokensave.js              ← entry point npx
├── src/
│   ├── cli/
│   │   └── index.js              ← comandos: run, setup, dash, skills, stats
│   ├── detector/
│   │   └── index.js              ← detecta Claude Code, Cursor, Copilot, Windsurf
│   ├── injector/
│   │   ├── claude-code.js
│   │   ├── cursor.js
│   │   ├── copilot.js
│   │   └── windsurf.js
│   ├── pipeline/
│   │   ├── builder.js            ← fluxo interativo PAPEL/TAREFA/CONTEXTO/...
│   │   ├── executor.js           ← chama API, streama, coleta métricas
│   │   └── modes/
│   │       ├── criar-sistema.js
│   │       ├── revisar-codigo.js
│   │       ├── documentacao.js
│   │       ├── consultor.js
│   │       ├── swot.js
│   │       ├── compare.js
│   │       ├── multi-perspectiva.js
│   │       ├── parallel-lens.js
│   │       ├── pitfalls.js
│   │       ├── metrics-mode.js
│   │       └── context-stack.js
│   ├── compressor/
│   │   ├── headroom.js           ← subprocess Python headroom-ai
│   │   └── caveman.js            ← regras Caveman por modo
│   ├── dashboard/
│   │   ├── tui.js                ← terminal UI via Ink
│   │   └── web/
│   │       ├── server.js         ← Hono HTTP server
│   │       └── index.html        ← dashboard HTML+JS vanilla
│   └── store/
│       └── db.js                 ← better-sqlite3, histórico de sessões
├── skills/
│   ├── security-audit/
│   ├── data-science/
│   ├── database/
│   ├── software-architect/
│   ├── ux-ui/
│   ├── devops/
│   ├── code-review/
│   └── documentation/
├── package.json
└── README.md
```

---

## Stack Técnica

| Peça | Tecnologia | Justificativa |
|------|-----------|---------------|
| CLI entry | Node.js 18+ | npx nativo, zero install |
| Menu interativo | Inquirer.js | battle-tested, rico |
| TUI | Ink (React no terminal) | componentes reutilizáveis |
| Web dashboard | Hono + HTML vanilla | < 50KB, zero bundler |
| AI calls | `@anthropic-ai/sdk` + `openai` + `@google/generative-ai` | Claude, GPT, Gemini |
| Compressão input | headroom-ai (Python subprocess) | já instalado |
| Compressão output | Caveman rules embutidas | sem deps extras |
| Storage | better-sqlite3 | zero config, local, rápido |
| Tool detection | heurísticas filesystem | sem deps extras |

---

## Comandos CLI

```
npx tokensave                  → menu principal
npx tokensave setup            → detecta tools, injeta configs
npx tokensave run              → pipeline builder interativo
npx tokensave run --mode swot  → pula menu, vai direto pro modo
npx tokensave skills           → menu de bundles de domínio
npx tokensave dash             → dashboard TUI
npx tokensave dash --web       → dashboard web (localhost:7878)
npx tokensave stats            → resumo rápido no terminal
npx tokensave config           → configura API keys e preferências
```

---

## Critérios de Sucesso

- `npx tokensave` funciona sem nenhuma instalação prévia além do Node.js
- Setup completo (detecção + injeção) em < 30 segundos
- Pipeline executa e retorna resposta em < 10 segundos para contextos de até 5.000 tokens
- Compressão média de pelo menos 60% nos tokens de entrada
- Dashboard mostra métricas em tempo real sem lag perceptível
- README é suficiente para um desenvolvedor começar em < 2 minutos

---

## O Que Está Fora do Escopo (v1)

- Interface web para o pipeline builder (só terminal na v1)
- Multi-turn conversation dentro do pipeline (uma execução por vez)
- Suporte a modelos locais (Ollama, LM Studio)
- Colaboração em time / métricas compartilhadas
- Marketplace online de skills customizadas
