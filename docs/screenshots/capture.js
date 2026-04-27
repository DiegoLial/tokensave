/**
 * Generates real PNG screenshots from SVGs and the web dashboard.
 * Run: node docs/screenshots/capture.js
 */
import puppeteer from 'puppeteer'
import { readdirSync, existsSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const OUT = __dirname

async function svgToPng(browser, svgPath, pngPath) {
  const page = await browser.newPage()
  try {
    // Load SVG to read its dimensions
    await page.goto(pathToFileURL(svgPath).href, { waitUntil: 'networkidle0' })

    // Get SVG natural dimensions
    const dims = await page.evaluate(() => {
      const svg = document.querySelector('svg')
      return {
        width:  parseInt(svg.getAttribute('width')  || svg.viewBox.baseVal.width),
        height: parseInt(svg.getAttribute('height') || svg.viewBox.baseVal.height),
      }
    })

    await page.setViewport({ width: dims.width, height: dims.height, deviceScaleFactor: 2 })
    await page.reload({ waitUntil: 'networkidle0' })

    await page.screenshot({ path: pngPath, clip: { x: 0, y: 0, width: dims.width, height: dims.height } })
    console.log(`✓ ${pngPath.replace(OUT, '.')}`)
  } finally {
    await page.close()
  }
}

async function screenshotDashboard(browser, pngPath) {
  // Start the web server as a child process
  // Pass OPEN=0 so the dash command skips auto-opening browser
  const srv = spawn(process.execPath, [join(ROOT, 'bin/tokensave.js'), 'dash', '--web'], {
    cwd: ROOT,
    env: { ...process.env, BROWSER: 'none' },
    stdio: 'pipe',
  })

  // Wait for server to be ready — dash prints "http://localhost:7878"
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Dashboard server timed out')), 15_000)
    const onData = (d) => {
      const s = d.toString()
      if (s.includes('localhost') || s.includes('http') || s.includes('Dashboard')) {
        clearTimeout(timeout)
        resolve()
      }
    }
    srv.stdout.on('data', onData)
    srv.stderr.on('data', onData)
    srv.on('error', (e) => { clearTimeout(timeout); reject(e) })
    srv.on('exit', (code) => { if (code !== 0) { clearTimeout(timeout); reject(new Error(`Server exited ${code}`)) } })
  })

  // Give it a moment to settle
  await new Promise((r) => setTimeout(r, 800))

  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 })
    await page.goto('http://localhost:7878', { waitUntil: 'networkidle0', timeout: 8000 })
    await page.screenshot({ path: pngPath, fullPage: false })
    console.log(`✓ ${pngPath.replace(OUT, '.')}  (web dashboard)`)
  } finally {
    await page.close()
    srv.kill()
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    // Convert all SVGs to PNG
    const svgs = readdirSync(OUT).filter((f) => f.endsWith('.svg')).sort()
    for (const svg of svgs) {
      const svgPath = join(OUT, svg)
      const pngPath = join(OUT, svg.replace('.svg', '.png'))
      await svgToPng(browser, svgPath, pngPath)
    }

    // Screenshot web dashboard
    const dashPng = join(OUT, '10-dashboard.png')
    try {
      await screenshotDashboard(browser, dashPng)
    } catch (err) {
      console.warn(`⚠ Dashboard screenshot skipped: ${err.message}`)
    }
  } finally {
    await browser.close()
  }

  console.log(`\nDone — PNGs in ${OUT}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
