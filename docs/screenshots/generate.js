/**
 * Generates terminal screenshot SVGs for the tokensave README.
 * Run: node docs/screenshots/generate.js
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = __dirname

const FONT = `Consolas,Menlo,monospace`
const BG   = '#0d1117'
const FG   = '#c9d1d9'
const DIM  = '#6e7681'
const CYAN = '#79c0ff'
const GREEN= '#3fb950'
const YELLOW='#d29922'
const WHITE= '#e6edf3'

// Token colors: c=cyan, g=green, y=yellow, d=dim, w=white/bold, _=normal
function line(tokens) {
  if (typeof tokens === 'string') return `<tspan fill="${FG}">${esc(tokens)}</tspan>`
  return tokens.map(([color, text]) => {
    const fill = color === 'c' ? CYAN : color === 'g' ? GREEN : color === 'y' ? YELLOW
               : color === 'd' ? DIM  : color === 'w' ? WHITE : FG
    const bold = color === 'w' ? ' font-weight="700"' : ''
    return `<tspan fill="${fill}"${bold}>${esc(text)}</tspan>`
  }).join('')
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function svg(title, lines, { width = 780, prompt = '$ ' } = {}) {
  const lineH = 20
  const padT  = 52
  const padX  = 24
  const height = padT + lines.length * lineH + 28

  const tspans = lines.map((l, i) => {
    const y = padT + i * lineH
    const content = typeof l === 'string'
      ? `<tspan fill="${FG}">${esc(l)}</tspan>`
      : line(l)
    return `<text x="${padX}" y="${y}" font-size="13" font-family="${FONT}">${content}</text>`
  }).join('\n  ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="titlebar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#21262d"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
  </defs>
  <!-- window -->
  <rect width="${width}" height="${height}" rx="10" fill="${BG}"/>
  <!-- titlebar -->
  <rect width="${width}" height="36" rx="10" fill="url(#titlebar)"/>
  <rect y="26" width="${width}" height="10" fill="#161b22"/>
  <!-- traffic lights -->
  <circle cx="20" cy="18" r="6" fill="#ff5f57"/>
  <circle cx="40" cy="18" r="6" fill="#febc2e"/>
  <circle cx="60" cy="18" r="6" fill="#28c840"/>
  <!-- title -->
  <text x="${width/2}" y="23" text-anchor="middle" font-size="12" font-family="${FONT}" fill="${DIM}">${esc(title)}</text>
  <!-- content -->
  ${tspans}
</svg>`
}

// ── Screenshots ──────────────────────────────────────────────────────────────

const screens = [

  // 1. help
  {
    file: '01-help.svg',
    title: 'tokensave --help',
    lines: [
      [['d','$ '],['c','npx tokensave']],
      '',
      [['c','Usage: '],['w','tokensave'],['d',' [options] [command]']],
      '',
      [['d','  Structured AI pipeline for any tool. One command. 70% less tokens.']],
      '',
      [['w','Options:']],
      [['d','  -V, --version   output the version number']],
      [['d','  -h, --help      display help for command']],
      '',
      [['w','Commands:']],
      [['d','  '],['c','setup      '],['d','Detecta AI tools e injeta configurações nativas']],
      [['d','  '],['c','run        '],['d','Executa o pipeline builder interativo']],
      [['d','  '],['c','skills     '],['d','Menu interativo de bundles de domínio']],
      [['d','  '],['c','dash       '],['d','Abre o dashboard de monitoramento']],
      [['d','  '],['c','stats      '],['d','Resumo rápido de tokens economizados']],
      [['d','  '],['c','templates  '],['d','Lista e gerencia templates de pipeline']],
      [['d','  '],['c','config     '],['d','Configura API keys e preferências']],
      [['d','  '],['c','mcp        '],['d','Inicia o MCP server de compressão']],
    ],
  },

  // 2. setup
  {
    file: '02-setup.svg',
    title: 'tokensave setup',
    lines: [
      [['d','$ '],['c','npx tokensave setup']],
      '',
      [['w','⚡ Tokensave Setup']],
      '',
      [['d','  Detectando AI tools instalados...']],
      '',
      [['d','  Detectados: '],['c','claude-code'],['d',', '],['c','cursor']],
      '',
      [['d','  Injetando configurações em '],['w','claude-code'],['d','... '],['g','✓'],['d',' ~/.claude/settings.json']],
      [['d','  Injetando configurações em '],['w','cursor'],['d','...     '],['g','✓'],['d',' Cursor/User/settings.json']],
      '',
      [['g','  ✓ Setup concluído.']],
      '',
      [['d','  Regras Caveman injetadas. Respostas serão mais curtas e técnicas.']],
      [['d','  MCP server registrado em ~/.claude/settings.json']],
      [['d','  Para executar um pipeline: '],['c','tokensave run']],
    ],
  },

  // 3. run interactive
  {
    file: '03-run-interactive.svg',
    title: 'tokensave run (interactive)',
    lines: [
      [['d','$ '],['c','npx tokensave run']],
      '',
      [['w','⚡ Tokensave — Pipeline']],
      '',
      [['g','? '],['w','Papel (persona do AI): '],['c','Security Auditor']],
      [['g','? '],['w','Tarefa: '],['c','Revisar a API de autenticação']],
      [['g','? '],['w','Contexto: '],['c','Caminho de arquivo/pasta']],
      [['g','? '],['w','Caminho do arquivo: '],['c','./src/api/auth.js']],
      [['g','? '],['w','Modo de raciocínio: '],['c','[2] Revisar Código — Bugs, segurança, qualidade']],
      [['g','? '],['w','Condição de saída: '],['c','Todas as vulnerabilidades críticas identificadas']],
      '',
      [['d','  ─────────────────────────────────────────']],
      [['d','  Tokens originais:    '],['y','2.847']],
      [['d','  Após compressão:     '],['g','810'],['d',' (headroom -71%)']],
      [['d','  Custo estimado:      '],['c','~$0.0041']],
      [['d','  Modelo:              '],['c','claude-sonnet-4-6']],
      [['d','  ─────────────────────────────────────────']],
      '',
      [['g','? '],['w','Executar pipeline? '],['c','Yes']],
    ],
  },

  // 4. streaming response
  {
    file: '04-streaming.svg',
    title: 'tokensave run — streaming response',
    lines: [
      [['d','▶ '],['w','CRITICAL ISSUES (must fix before production)']],
      '',
      [['g','1. '],['w','JWT secret hardcoded in source'],['d',' — auth.js:14']],
      [['d','   Bad:  '],['c',"const SECRET = 'my-secret-key-123'"]],
      [['d','   Fix:  '],['c','process.env.JWT_SECRET (validate on startup)']],
      '',
      [['g','2. '],['w','Missing rate limiting on /login'],['d',' — auth.js:89']],
      [['d','   Brute-force: 1000 attempts/sec possible']],
      [['d','   Fix: express-rate-limit, 5 req/15min per IP']],
      '',
      [['g','3. '],['w','SQL injection via raw string concat'],['d',' — auth.js:142']],
      [['d','   Bad:  '],['c','db.query("SELECT * FROM users WHERE id=" + id)']],
      [['d','   Fix:  '],['c','db.query("SELECT * FROM users WHERE id=$1", [id])']],
      '',
      [['d','  ─────────────────────────────────────────']],
      [['d','  Tokens in: '],['g','810'],['d','  out: '],['g','412'],['d','  compressão: '],['g','-71%']],
      [['d','  Custo real: '],['c','$0.0052'],['d','   Tempo: '],['c','3.2s']],
      [['d','  ─────────────────────────────────────────']],
    ],
  },

  // 5. non-interactive
  {
    file: '05-non-interactive.svg',
    title: 'tokensave run --yes (non-interactive / CI)',
    lines: [
      [['d','$ '],['c','npx tokensave run \\']],
      [['d','    '],['d','--papel "Security Auditor" \\']],
      [['d','    '],['d','--tarefa "Revisar endpoint de login" \\']],
      [['d','    '],['d','--context-file ./src/api/auth.js \\']],
      [['d','    '],['d','--modo revisar-codigo --yes']],
      '',
      [['w','⚡ Tokensave — Pipeline']],
      '',
      [['d','  Papel:    '],['c','Security Auditor']],
      [['d','  Tarefa:   '],['c','Revisar endpoint de login']],
      [['d','  Modo:     '],['c','revisar-codigo']],
      '',
      [['d','  ─────────────────────────────────────────']],
      [['d','  Tokens originais:    '],['y','1.204']],
      [['d','  Após compressão:     '],['g','361'],['d',' (native -70%)']],
      [['d','  Custo estimado:      '],['c','~$0.0018']],
      [['d','  Modelo:              '],['c','claude-sonnet-4-6']],
      [['d','  ─────────────────────────────────────────']],
      '',
      [['d','▶ '],['w','…resposta em streaming…']],
    ],
  },

  // 6. skills chain
  {
    file: '06-skills-chain.svg',
    title: 'tokensave skills — Security Audit (chain)',
    lines: [
      [['d','$ '],['c','npx tokensave skills']],
      '',
      [['w','⚡ Tokensave Skills — Bundles por Domínio']],
      '',
      [['g','? '],['w','Escolha um bundle: '],['c','Security Audit']],
      '',
      [['d','  Papel: Security Auditor']],
      [['d','  Modos: revisar-codigo → pitfalls → multi-perspectiva']],
      [['d','  Encadeamento: 3 etapas']],
      '',
      [['g','? '],['w','O que fazer? '],['c','Executar encadeado (3 modos em sequência)']],
      '',
      [['c','  1/3 — Revisão de código (bugs e segurança)']],
      [['d','  ▶ Executando revisar-codigo...']],
      [['g','  ✓ Etapa 1 concluída. Output salvo para próxima etapa.']],
      '',
      [['g','? '],['w','Continuar para próxima etapa? '],['c','Yes']],
      '',
      [['c','  2/3 — Pitfalls (o que pode ser explorado)']],
      [['d','  ▶ Executando pitfalls com contexto da etapa anterior...']],
    ],
  },

  // 7. templates
  {
    file: '07-templates.svg',
    title: 'tokensave templates',
    lines: [
      [['d','$ '],['c','npx tokensave run --save-as security-weekly']],
      [['g','  ✓ Template "security-weekly" salvo.']],
      '',
      [['d','$ '],['c','npx tokensave templates']],
      '',
      [['w','⚡ Templates salvos']],
      '',
      [['w','  security-weekly']],
      [['d','    Papel:   Security Auditor']],
      [['d','    Modo:    revisar-codigo']],
      [['d','    Condição: Todas as vulnerabilidades críticas identificadas']],
      [['d','    Salvo:   2026-04-27']],
      '',
      [['d','  Usar template: '],['c','tokensave run --template security-weekly']],
      [['d','  Remover:       '],['c','tokensave templates --delete security-weekly']],
    ],
  },

  // 8. stats
  {
    file: '08-stats.svg',
    title: 'tokensave stats',
    lines: [
      [['d','$ '],['c','npx tokensave stats']],
      '',
      [['w','⚡ Tokensave Stats']],
      '',
      [['d','  Total de pipelines:   '],['w','87']],
      [['d','  Tokens economizados:  '],['g','341.200'],['d',' ('],['g','-69%'],['d',')']],
      [['d','  Custo total:          '],['c','$1.3240']],
      [['d','  Hoje (pipelines):     '],['w','12']],
      [['d','  Hoje (custo):         '],['c','$0.1820']],
      '',
      [['d','  Modos mais usados:']],
      [['d','    revisar-codigo          34 runs']],
      [['d','    pitfalls                18 runs']],
      [['d','    swot                    12 runs']],
      '',
      [['d','  Por projeto:']],
      [['d','    tokensave               41 runs  -71%  $0.62']],
      [['d','    meu-saas                28 runs  -68%  $0.47']],
      [['d','    api-service             18 runs  -65%  $0.23']],
    ],
  },

  // 9. ollama
  {
    file: '09-ollama.svg',
    title: 'tokensave run --model ollama/llama3 (local, free)',
    lines: [
      [['d','$ '],['c','npx tokensave run \\']],
      [['d','    '],['d','--papel "Tech Lead" \\']],
      [['d','    '],['d','--tarefa "Revisar este código" \\']],
      [['d','    '],['d','--model ollama/llama3 --yes']],
      '',
      [['w','⚡ Tokensave — Pipeline']],
      '',
      [['d','  Papel:    '],['c','Tech Lead']],
      [['d','  Tarefa:   '],['c','Revisar este código']],
      [['d','  Modo:     '],['c','revisar-codigo']],
      '',
      [['d','  ─────────────────────────────────────────']],
      [['d','  Custo estimado:      '],['g','local (sem custo)']],
      [['d','  Modelo:              '],['c','llama3'],['d',' via Ollama localhost:11434']],
      [['d','  ─────────────────────────────────────────']],
      '',
      [['d','▶ '],['w','…resposta em streaming (sem API key)…']],
    ],
  },

]

for (const { file, title, lines } of screens) {
  const content = svg(title, lines)
  writeFileSync(join(OUT, file), content, 'utf8')
  console.log(`✓ ${file}`)
}

console.log(`\nGerados ${screens.length} screenshots em ${OUT}`)
