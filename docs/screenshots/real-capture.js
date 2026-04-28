/**
 * Real CLI test + screenshot generator for tokensave.
 *
 * 1. Runs each CLI command (real execution, real output)
 * 2. Renders output in a terminal-styled HTML page
 * 3. Screenshots with Puppeteer @ 2x resolution
 * 4. Also screenshots the live web dashboard
 *
 * Run: node docs/screenshots/real-capture.js
 */
import puppeteer from 'puppeteer'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')
const NODE = process.execPath
const CLI  = join(ROOT, 'bin/tokensave.js')
const OUT  = __dirname

// ── ANSI stripping ────────────────────────────────────────────────────────────

function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '')
}

// ── Terminal HTML renderer ────────────────────────────────────────────────────

function terminalHtml(title, rawOutput, { width = 820 } = {}) {
  const lines = stripAnsi(rawOutput).split('\n')
  // Limit to 50 lines for readability
  const visible = lines.slice(0, 50)

  const escaped = visible
    .map((l) => l
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/ /g, '&nbsp;'))
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0d1117; width: ${width}px; }
  .window { border-radius: 10px; overflow: hidden; font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.55; }
  .titlebar {
    height: 36px;
    background: linear-gradient(#21262d, #161b22);
    display: flex; align-items: center; padding: 0 16px; position: relative;
  }
  .lights { display: flex; gap: 8px; }
  .light { width: 12px; height: 12px; border-radius: 50%; }
  .red    { background: #ff5f57; }
  .yellow { background: #febc2e; }
  .green  { background: #28c840; }
  .title  { position: absolute; left: 50%; transform: translateX(-50%); color: #6e7681; font-size: 12px; }
  .body   { background: #0d1117; padding: 16px 24px 20px; white-space: pre; color: #c9d1d9; }
</style>
</head>
<body>
<div class="window">
  <div class="titlebar">
    <div class="lights">
      <div class="light red"></div>
      <div class="light yellow"></div>
      <div class="light green"></div>
    </div>
    <div class="title">${title}</div>
  </div>
  <div class="body">${escaped}</div>
</div>
</body>
</html>`
}

// ── Run a CLI command and return stdout+stderr ─────────────────────────────────

async function run(args, { timeout = 10000 } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(NODE, [CLI, ...args], {
      cwd: ROOT,
      timeout,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    })
    return (stdout + stderr).trimEnd()
  } catch (err) {
    return ((err.stdout ?? '') + (err.stderr ?? '')).trimEnd() || err.message
  }
}

// ── Screenshot an HTML string ─────────────────────────────────────────────────

async function screenshotHtml(browser, html, outPath, { width = 820 } = {}) {
  const page = await browser.newPage()
  try {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const body = await page.$('.window')
    await body.screenshot({ path: outPath })
    console.log(`  ✓  ${outPath.replace(OUT + '\\', '')}`)
  } finally {
    await page.close()
  }
}

// ── Screenshot the live web dashboard ────────────────────────────────────────

async function screenshotDashboard(browser, outPath) {
  const srv = spawn(NODE, [CLI, 'dash', '--web'], {
    cwd: ROOT,
    env: { ...process.env, BROWSER: 'none' },
    stdio: 'pipe',
  })

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 15_000)
    const ok = (d) => { if (d.toString().match(/localhost|http|Dashboard/i)) { clearTimeout(t); resolve() } }
    srv.stdout.on('data', ok)
    srv.stderr.on('data', ok)
    srv.on('error', reject)
  })

  await new Promise((r) => setTimeout(r, 600))

  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 })
    await page.goto('http://localhost:7878', { waitUntil: 'networkidle0', timeout: 8000 })
    await page.screenshot({ path: outPath })
    console.log(`  ✓  ${outPath.replace(OUT + '\\', '')}  (web dashboard)`)
  } finally {
    await page.close()
    srv.kill()
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n⚡ Tokensave — real CLI tests + screenshots\n')

  // ── 1. Run and test all commands ──────────────────────────────────────────
  console.log('▶  Running CLI commands...\n')

  const results = {}

  // help
  results.help = await run(['--help'])
  console.log(`  help         ${results.help.includes('Usage') ? '✓ PASS' : '✗ FAIL'}`)

  // version
  results.version = await run(['--version'])
  console.log(`  --version    ${results.version.match(/\d+\.\d+/) ? '✓ PASS' : '✗ FAIL'}`)

  // stats
  results.stats = await run(['stats'])
  console.log(`  stats        ${results.stats.includes('Stats') ? '✓ PASS' : '✗ FAIL'}`)

  // templates list
  results.templates = await run(['templates'])
  console.log(`  templates    ${results.templates.length > 0 ? '✓ PASS' : '✗ FAIL (empty output)'}`)

  // mcp --help (non-interactive)
  results.mcp = await run(['mcp', '--help'])
  console.log(`  mcp --help   ${results.mcp.includes('mcp') ? '✓ PASS' : '✗ FAIL'}`)

  // run --help
  results.run = await run(['run', '--help'])
  console.log(`  run --help   ${results.run.includes('papel') || results.run.includes('Options') ? '✓ PASS' : '✗ FAIL'}`)

  // ── 2. Generate screenshots ──────────────────────────────────────────────
  console.log('\n▶  Generating screenshots...\n')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const shots = [
      { file: 'live-01-help.png',      title: 'tokensave --help',     output: results.help },
      { file: 'live-02-version.png',   title: 'tokensave --version',  output: results.version },
      { file: 'live-03-stats.png',     title: 'tokensave stats',      output: results.stats },
      { file: 'live-04-templates.png', title: 'tokensave templates',  output: results.templates },
      { file: 'live-05-run-help.png',  title: 'tokensave run --help', output: results.run },
    ]

    for (const { file, title, output } of shots) {
      const html = terminalHtml(title, `$ node tokensave.js ${title.replace('tokensave ', '')}\n\n${output}`)
      await screenshotHtml(browser, html, join(OUT, file))
    }

    // web dashboard
    try {
      await screenshotDashboard(browser, join(OUT, 'live-10-dashboard.png'))
    } catch (e) {
      console.warn(`  ⚠ dashboard skipped: ${e.message}`)
    }

  } finally {
    await browser.close()
  }

  console.log('\n✓ Done — screenshots saved to docs/screenshots/\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
