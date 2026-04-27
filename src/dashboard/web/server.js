import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createStore } from '../../store/db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = new Hono()

app.get('/', (c) => {
  const html = readFileSync(join(__dirname, 'index.html'), 'utf8')
  return c.html(html)
})

app.get('/api/summary', (c) => {
  const store = createStore()
  try {
    const data = {
      total: store.getSummary(),
      today: store.getTodaySummary(),
      modes: store.getModeStats(),
    }
    return c.json(data)
  } finally {
    store.close()
  }
})

app.get('/api/runs', (c) => {
  const store = createStore()
  try {
    const limit = Number(c.req.query('limit') ?? 100)
    const runs = store.getRecentRuns(Math.min(limit, 500))
    return c.json(runs)
  } finally {
    store.close()
  }
})

app.get('/api/runs/export.csv', (c) => {
  const store = createStore()
  try {
    const runs = store.getRecentRuns(500)
    const header = 'id,created_at,papel,tarefa,modo,model,tokens_original,tokens_compressed,tokens_output,cost_usd,duration_ms,success'
    const rows = runs.map((r) =>
      [r.id, r.created_at, `"${r.papel}"`, `"${r.tarefa}"`, r.modo, r.model,
       r.tokens_original, r.tokens_compressed, r.tokens_output,
       r.cost_usd, r.duration_ms, r.success].join(',')
    )
    c.header('Content-Type', 'text/csv')
    c.header('Content-Disposition', 'attachment; filename="tokensave-runs.csv"')
    return c.text([header, ...rows].join('\n'))
  } finally {
    store.close()
  }
})

export function startWebServer(port = 7878) {
  serve({ fetch: app.fetch, port })
  return port
}
