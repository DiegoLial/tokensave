import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { getConfig, setGlobalConfig, setProjectConfig, getAllConfig, getProjectRoot } from '../../core/config.js'
import { MODES } from '../../pipeline/modes/index.js'
import { SKILLS } from '../../../skills/index.js'
import { listTemplates, saveTemplate, deleteTemplate } from '../../store/templates.js'
import { getRecentRuns, getSummary, getTodaySummary, getModeStats } from '../../core/metrics.js'
import { runPipeline } from '../../core/runner.js'
import { validatePipeline } from '../../core/validator.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Hono app ──────────────────────────────────────────────────────────────────

const app = new Hono()
app.use('*', cors())

// Static
app.get('/', (c) => c.html(readFileSync(join(__dirname, 'index.html'), 'utf8')))

// Config
app.get('/api/config', (c) => {
  const cfg = getConfig()
  return c.json({
    default_model:   cfg.default_model,
    default_caveman: cfg.default_caveman,
    default_papel:   cfg.default_papel,
    ollama_base_url: cfg.ollama_base_url,
    has_anthropic:   !!cfg.anthropic_api_key,
    has_openai:      !!cfg.openai_api_key,
    has_google:      !!cfg.google_api_key,
  })
})

app.put('/api/config', async (c) => {
  const body = await c.req.json()
  const allowed = ['default_model','default_caveman','default_papel','ollama_base_url',
                   'anthropic_api_key','openai_api_key','google_api_key']
  for (const [k, v] of Object.entries(body)) {
    if (allowed.includes(k) && v !== undefined) setGlobalConfig(k, v)
  }
  return c.json({ ok: true })
})

app.get('/api/config/project', (c) => {
  const all  = getAllConfig()
  const root = getProjectRoot()
  return c.json({ root, config: all.projects?.[root] ?? {} })
})

app.put('/api/config/project', async (c) => {
  const body = await c.req.json()
  const allowed = ['default_model','default_caveman','default_papel']
  for (const [k, v] of Object.entries(body)) {
    if (allowed.includes(k) && v !== undefined) setProjectConfig(k, v)
  }
  return c.json({ ok: true })
})

// Modes + Skills
app.get('/api/modes', (c) => c.json(MODES.map(m => ({
  id: m.id, name: m.name, description: m.description, cavemanLevel: m.cavemanLevel
}))))

app.get('/api/skills', (c) => c.json(SKILLS ?? []))

// Templates
app.get('/api/templates', (c) => c.json(listTemplates()))

app.post('/api/templates', async (c) => {
  const body = await c.req.json()
  if (!body.name) return c.json({ error: 'name required' }, 400)
  saveTemplate(body.name, body)
  return c.json({ ok: true })
})

app.delete('/api/templates/:name', (c) => {
  deleteTemplate(c.req.param('name'))
  return c.json({ ok: true })
})

// Summary + Runs
app.get('/api/summary', (c) => c.json({
  total: getSummary(),
  today: getTodaySummary(),
  modes: getModeStats(),
}))

app.get('/api/runs', (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500)
  return c.json(getRecentRuns(limit))
})

app.get('/api/runs/export.csv', (c) => {
  const runs = getRecentRuns(500)
  const header = 'id,created_at,papel,tarefa,modo,model,tokens_original,tokens_compressed,tokens_output,cost_usd,duration_ms,success'
  const rows = runs.map(r =>
    [r.id, r.created_at, `"${r.papel}"`, `"${r.tarefa}"`, r.modo, r.model,
     r.tokens_original, r.tokens_compressed, r.tokens_output, r.cost_usd, r.duration_ms, r.success].join(',')
  )
  c.header('Content-Type', 'text/csv')
  c.header('Content-Disposition', 'attachment; filename="tokensave-runs.csv"')
  return c.text([header, ...rows].join('\n'))
})

// Run dispatch
app.post('/api/run', async (c) => {
  const pipeline = await c.req.json()
  const { valid, errors } = validatePipeline(pipeline)
  if (!valid) return c.json({ error: errors.join('; ') }, 400)

  const job_id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  setImmediate(() => dispatchJob(job_id, pipeline))
  return c.json({ job_id })
})

// ── WebSocket ─────────────────────────────────────────────────────────────────

const clients = new Set()

function broadcast(msg) {
  const text = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) client.send(text)
  }
}

async function dispatchJob(job_id, pipeline) {
  broadcast({ type: 'start', job_id, pipeline })
  try {
    const result = await runPipeline(pipeline, {
      silent: true,
      onChunk: (text) => broadcast({ type: 'chunk', job_id, text }),
    })
    broadcast({ type: 'done', job_id, metrics: result.metrics })
  } catch (err) {
    broadcast({ type: 'error', job_id, message: err.message })
  }
}

// ── Server boot ───────────────────────────────────────────────────────────────

export function startWebServer(port = 7878) {
  // Raw HTTP server so we can attach WebSocket to same port
  const httpServer = createServer(async (req, res) => {
    const url = `http://localhost${req.url}`
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = chunks.length ? Buffer.concat(chunks) : undefined

    const request = new Request(url, {
      method:  req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).filter(([, v]) => v != null)
      ),
      body: ['GET','HEAD'].includes(req.method) ? undefined : body,
    })

    try {
      const response = await app.fetch(request)
      const resBody  = await response.arrayBuffer()
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
      res.end(Buffer.from(resBody))
    } catch (err) {
      res.writeHead(500)
      res.end(JSON.stringify({ error: err.message }))
    }
  })

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.send(JSON.stringify({ type: 'status', message: 'connected' }))

    ws.on('close', () => clients.delete(ws))
    ws.on('message', (data) => {
      let msg
      try { msg = JSON.parse(data.toString()) } catch { return }

      if (msg.type === 'run_request') {
        const job_id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        dispatchJob(job_id, msg.pipeline)
      }
    })
  })

  httpServer.listen(port, () => {
    console.log(`\n${chalk_cyan('⚡')} Tokensave Dashboard → http://localhost:${port}`)
    console.log(`   WebSocket  → ws://localhost:${port}/ws`)
    console.log(`   Ctrl+C para parar.\n`)
  })

  return port
}

function chalk_cyan(s) { return `\x1b[36m${s}\x1b[0m` }
