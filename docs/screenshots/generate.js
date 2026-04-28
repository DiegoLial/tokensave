/**
 * Generates terminal screenshot SVGs for the tokensave README.
 * Run: node docs/screenshots/generate.js
 */
import { writeFileSync } from 'fs'
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
const RED  = '#f85149'

function line(tokens) {
  if (typeof tokens === 'string') return `<tspan fill="${FG}">${esc(tokens)}</tspan>`
  return tokens.map(([color, text]) => {
    const fill = color === 'c' ? CYAN : color === 'g' ? GREEN : color === 'y' ? YELLOW
               : color === 'd' ? DIM  : color === 'w' ? WHITE : color === 'r' ? RED : FG
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

  // 1. help — v3 commands
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
      [['d','  '],['c','dash       '],['d','Abre o dashboard web cockpit (localhost:7878)']],
      [['d','  '],['c','stats      '],['d','Resumo rápido de tokens economizados']],
      [['d','  '],['c','templates  '],['d','Lista e gerencia templates de pipeline']],
      [['d','  '],['c','config     '],['d','Configura API keys e preferências']],
      [['d','  '],['c','listen     '],['d','Modo daemon — executa jobs do dashboard via WebSocket']],
      [['d','  '],['c','skills     '],['d','Menu interativo de bundles de domínio']],
      [['d','  '],['c','mcp        '],['d','Inicia o MCP server de compressão']],
    ],
  },

  // 2. run non-interactive — v3 minimalist output
  {
    file: '02-run.svg',
    title: 'tokensave run --yes (non-interactive)',
    lines: [
      [['d','$ '],['c','npx tokensave run \\']],
      [['d','    --papel "Security Auditor" \\']],
      [['d','    --tarefa "Revisar endpoint de login" \\']],
      [['d','    --context-file ./src/api/auth.js \\']],
      [['d','    --mode revisar-codigo --yes']],
      '',
      [['c','⚡ '],['w','revisar-codigo'],['d','  ·  claude-sonnet-4-6  ·  ~$0.0018']],
      [['d','Security Auditor → Revisar endpoint de login']],
      [['d','   361/1204 tokens (native, -70%)']],
      '',
      [['d','▶ '],['w','CRITICAL ISSUES']],
      '',
      [['g','1. '],['w','SQL injection'],['d',' — auth.js:23']],
      [['d','   '],['c','db.query("SELECT * FROM users WHERE id=" + id)']],
      '',
      [['g','2. '],['w','JWT hardcoded secret'],['d',' — auth.js:7']],
      [['d','   '],['c',"const SECRET = 'my-secret-key'"]],
      '',
      [['g','3. '],['w','No rate limiting on /login']],
      '',
      [['g','✓ '],['d','361/1204 tokens  ·  $0.0017  ·  2.8s']],
    ],
  },

  // 3. dry-run
  {
    file: '03-dry-run.svg',
    title: 'tokensave run --dry-run',
    lines: [
      [['d','$ '],['c','npx tokensave run \\']],
      [['d','    --papel "Engineer" --tarefa "Revisar auth" \\']],
      [['d','    --context-file ./src/auth.js --mode revisar-codigo --dry-run']],
      '',
      [['c','⚡ '],['w','dry-run']],
      '',
      [['d','  Tokens originais:  '],['y','1204']],
      [['d','  Após compressão:   '],['g','361'],['d',' (native, -70%)']],
      [['d','  Custo estimado:    '],['c','$0.0012']],
      '',
      [['d','  Contexto comprimido:']],
      '',
      [['d','  export async function login(req, res) {']],
      [['d','    const user = await db.query(']],
      [['d','      "SELECT * FROM users WHERE id=" + req.body.id)']],
      [['d','  ...']],
    ],
  },

  // 4. stats — v3 minimalist
  {
    file: '04-stats.svg',
    title: 'tokensave stats',
    lines: [
      [['d','$ '],['c','npx tokensave stats']],
      '',
      [['c','⚡ '],['d','tokensave stats']],
      '',
      [['d','  '],['w','87'],['d',' runs  ·  '],['w','$1.3240'],['d',' total  ·  '],['g','69% salvo']],
      '',
      [['d','  Top modos:  '],['_','revisar-codigo (34)  pitfalls (18)  swot (12)']],
      [['d','  Hoje:        '],['_','3 runs  ·  $0.0821']],
      '',
      [['d','  Por projeto:']],
      [['d','    tokensave                41 runs  -71%  $0.62']],
      [['d','    meu-saas                 28 runs  -68%  $0.47']],
      [['d','    api-service              18 runs  -65%  $0.23']],
    ],
  },

  // 5. stdin pipe
  {
    file: '05-stdin.svg',
    title: 'stdin pipe — cat file | tokensave run',
    lines: [
      [['d','$ '],['c','cat src/api/auth.js | npx tokensave run \\']],
      [['d','    --papel "Security Auditor" \\']],
      [['d','    --tarefa "Revisar vulnerabilidades" \\']],
      [['d','    --mode revisar-codigo --yes']],
      '',
      [['c','⚡ '],['w','revisar-codigo'],['d','  ·  claude-sonnet-4-6  ·  ~$0.0021']],
      [['d','Security Auditor → Revisar vulnerabilidades']],
      [['d','   482/1847 tokens (headroom, -74%)']],
      '',
      [['d','▶ ...']],
      '',
      [['g','✓ '],['d','482/1847 tokens  ·  $0.0019  ·  3.1s']],
    ],
  },

  // 6. multiple context files
  {
    file: '06-context-files.svg',
    title: 'tokensave run --context-file (múltiplos)',
    lines: [
      [['d','$ '],['c','npx tokensave run \\']],
      [['d','    --papel "Architect" \\']],
      [['d','    --tarefa "Documentar todos os módulos core" \\']],
      [['d','    --context-file src/core/runner.js \\']],
      [['d','    --context-file src/core/provider.js \\']],
      [['d','    --context-file src/core/metrics.js \\']],
      [['d','    --mode documentacao --yes']],
      '',
      [['c','⚡ '],['w','documentacao'],['d','  ·  claude-sonnet-4-6  ·  ~$0.0034']],
      [['d','Architect → Documentar todos os módulos core']],
      [['d','   891/2843 tokens (headroom, -69%)']],
      '',
      [['g','✓ '],['d','891/2843 tokens  ·  $0.0031  ·  4.2s']],
    ],
  },

  // 7. templates
  {
    file: '07-templates.svg',
    title: 'tokensave templates',
    lines: [
      [['d','$ '],['c','npx tokensave run --save-as security-audit --papel "Security Auditor" \\']],
      [['d','    --mode revisar-codigo --condicao "Todos os CVEs identificados" --yes']],
      [['g','  ✓ Template "security-audit" salvo.']],
      '',
      [['d','$ '],['c','npx tokensave templates']],
      '',
      [['c','⚡ '],['w','Templates salvos']],
      '',
      [['w','  security-audit']],
      [['d','    Papel:    Security Auditor']],
      [['d','    Modo:     revisar-codigo']],
      [['d','    Condição: Todos os CVEs identificados']],
      [['d','    Salvo:    2026-04-28']],
      '',
      [['d','  Usar:    '],['c','tokensave run --template security-audit']],
      [['d','  Remover: '],['c','tokensave templates --delete security-audit']],
    ],
  },

  // 8. listen daemon
  {
    file: '08-listen.svg',
    title: 'tokensave listen (daemon mode)',
    lines: [
      [['d','$ '],['c','npx tokensave listen']],
      '',
      [['c','⚡ tokensave listen'],['d',' → ws://localhost:7878/ws']],
      '',
      [['d','  Aguardando jobs do dashboard. Ctrl+C para parar.']],
      '',
      [['d','  Job job_1745823001_x8k2p: revisar-codigo — Revisar auth.js']],
      [['d','▶ CRITICAL ISSUES...']],
      [['g','  ✓ Job concluído.']],
      '',
      [['d','  Job job_1745823045_m3n7q: swot — Analisar arquitetura de microserviços']],
      [['d','▶ FORÇAS...']],
      [['g','  ✓ Job concluído.']],
      '',
      [['d','  ^C']],
      [['d','  Listen encerrado.']],
    ],
  },

  // 9. config
  {
    file: '09-config.svg',
    title: 'tokensave config',
    lines: [
      [['d','$ '],['c','npx tokensave config']],
      '',
      [['c','⚡ '],['w','tokensave config']],
      '',
      [['d','  Config atual:']],
      [['d','  Modelo padrão:   '],['c','claude-sonnet-4-6']],
      [['d','  Caveman padrão:  '],['c','full']],
      [['d','  Anthropic key:   '],['g','✓ configurada']],
      [['d','  OpenAI key:      '],['r','✗ não configurada']],
      [['d','  Google key:      '],['r','✗ não configurada']],
      '',
      [['g','? '],['w','Anthropic API Key (Enter para manter): '],['d','****']],
      [['g','? '],['w','OpenAI API Key (Enter para manter): ']],
      [['g','? '],['w','Modelo padrão: '],['c','claude-sonnet-4-6']],
      [['g','? '],['w','Caveman level padrão: '],['c','full']],
      '',
      [['g','  ✓ Config salva.']],
    ],
  },

]

for (const { file, title, lines } of screens) {
  const content = svg(title, lines)
  writeFileSync(join(OUT, file), content, 'utf8')
  console.log(`✓ ${file}`)
}

console.log(`\nGerados ${screens.length} screenshots em ${OUT}`)
