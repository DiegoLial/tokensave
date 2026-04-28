/**
 * Real CLI test + screenshot generator for tokensave v0.3.0
 * Run: node docs/screenshots/real-capture.js
 */
import puppeteer from 'puppeteer'
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

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '')
}

function terminalHtml(title, rawOutput, { width = 900 } = {}) {
  const lines = stripAnsi(rawOutput).split('\n').slice(0, 55)
  const escaped = lines.map((l) =>
    l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/ /g,'&nbsp;')
  ).join('\n')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:#0d1117; width:${width}px; }
.window { border-radius:10px; overflow:hidden; font-family:'Cascadia Code','JetBrains Mono','Fira Code',Menlo,monospace; font-size:13.5px; line-height:1.6; }
.titlebar { height:38px; background:linear-gradient(#21262d,#161b22); display:flex; align-items:center; padding:0 18px; position:relative; }
.lights { display:flex; gap:8px; }
.light { width:13px; height:13px; border-radius:50%; }
.red { background:#ff5f57; } .yellow { background:#febc2e; } .green { background:#28c840; }
.title { position:absolute; left:50%; transform:translateX(-50%); color:#6e7681; font-size:12px; letter-spacing:0.3px; }
.body { background:#0d1117; padding:18px 26px 24px; white-space:pre; color:#c9d1d9; }
</style></head><body><div class="window">
<div class="titlebar"><div class="lights"><div class="light red"></div><div class="light yellow"></div><div class="light green"></div></div><div class="title">${title}</div></div>
<div class="body">${escaped}</div></div></body></html>`
}

async function run(args, { timeout = 12000 } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(NODE, [CLI, ...args], {
      cwd: ROOT, timeout, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    })
    return (stdout + stderr).trimEnd()
  } catch (err) {
    return ((err.stdout ?? '') + (err.stderr ?? '')).trimEnd() || err.message
  }
}

async function screenshotHtml(browser, html, outPath) {
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 2 })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const el = await page.$('.window')
    await el.screenshot({ path: outPath, type: 'png' })
    console.log(`  ✓  ${outPath.split(/[\/]/).pop()}`)
  } finally { await page.close() }
}

async function screenshotDashboardTabs(browser) {
  const srv = spawn(NODE, [CLI, 'dash', '--web'], {
    cwd: ROOT, env: { ...process.env, BROWSER: 'none' }, stdio: 'pipe',
  })
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 15000)
    const ok = (d) => { if (d.toString().match(/localhost|7878|Dashboard/i)) { clearTimeout(t); resolve() } }
    srv.stdout.on('data', ok); srv.stderr.on('data', ok); srv.on('error', reject)
  })
  await new Promise((r) => setTimeout(r, 800))
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 2 })
    await page.goto('http://localhost:7878', { waitUntil: 'networkidle0', timeout: 10000 })
    const tabs = [
      { selector: '[data-tab="run"]',       file: 'dash-01-run.png' },
      { selector: '[data-tab="history"]',   file: 'dash-02-history.png' },
      { selector: '[data-tab="templates"]', file: 'dash-03-templates.png' },
      { selector: '[data-tab="settings"]',  file: 'dash-04-settings.png' },
    ]
    for (const { selector, file } of tabs) {
      await page.click(selector)
      await new Promise((r) => setTimeout(r, 350))
      await page.screenshot({ path: join(OUT, file), type: 'png' })
      console.log(`  ✓  ${file}  (dashboard)`)
    }
  } finally { await page.close(); srv.kill() }
}

async function main() {
  console.log('\n⚡ tokensave v0.3.0 — real CLI tests + screenshots\n')
  console.log('▶  Running CLI commands...\n')

  const help      = await run(['--help'])
  const version   = await run(['--version'])
  const stats     = await run(['stats'])
  const templates = await run(['templates'])
  const runHelp   = await run(['run', '--help'])

  console.log(`  --help       ${help.includes('Usage')     ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`  --version    ${version.match(/\d+\.\d+/)  ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`  stats        ${stats.includes('tokensave')? '✓ PASS' : '✗ FAIL'}`)
  console.log(`  templates    ${templates.length > 0       ? '✓ PASS' : '✗ FAIL'}`)
  console.log(`  run --help   ${runHelp.includes('papel')  ? '✓ PASS' : '✗ FAIL'}`)

  console.log('\n▶  Generating CLI screenshots...\n')
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const shots = [
      { file: 'cli-01-help.png',      title: 'tokensave --help',     output: `$ npx tokensave --help\n\n${help}` },
      { file: 'cli-02-version.png',   title: 'tokensave --version',  output: `$ npx tokensave --version\n\n${version}` },
      { file: 'cli-03-stats.png',     title: 'tokensave stats',      output: `$ npx tokensave stats\n\n${stats}` },
      { file: 'cli-04-templates.png', title: 'tokensave templates',  output: `$ npx tokensave templates\n\n${templates}` },
      { file: 'cli-05-run-help.png',  title: 'tokensave run --help', output: `$ npx tokensave run --help\n\n${runHelp}` },
    ]
    for (const { file, title, output } of shots) {
      await screenshotHtml(browser, terminalHtml(title, output), join(OUT, file))
    }
    console.log('\n▶  Generating dashboard screenshots...\n')
    try { await screenshotDashboardTabs(browser) }
    catch (e) { console.warn(`  ⚠  dashboard skipped: ${e.message}`) }
  } finally { await browser.close() }

  console.log('\n✓ Done — screenshots saved to docs/screenshots/\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
