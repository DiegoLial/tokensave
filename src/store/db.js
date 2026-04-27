import Database from 'better-sqlite3'
import { homedir } from 'os'
import { join } from 'path'
import { mkdirSync } from 'fs'

const DEFAULT_PATH = join(homedir(), '.tokensave', 'metrics.db')

export function createStore(dbPath = DEFAULT_PATH) {
  mkdirSync(join(dbPath, '..'), { recursive: true })
  const db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS pipeline_runs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      papel         TEXT    NOT NULL,
      tarefa        TEXT    NOT NULL,
      contexto      TEXT    NOT NULL DEFAULT '',
      modo          TEXT    NOT NULL,
      condicao      TEXT    NOT NULL DEFAULT '',
      model         TEXT    NOT NULL,
      project_root  TEXT    NOT NULL DEFAULT '',
      tokens_original   INTEGER NOT NULL DEFAULT 0,
      tokens_compressed INTEGER NOT NULL DEFAULT 0,
      tokens_output     INTEGER NOT NULL DEFAULT 0,
      cost_usd          REAL    NOT NULL DEFAULT 0,
      duration_ms       INTEGER NOT NULL DEFAULT 0,
      success           INTEGER NOT NULL DEFAULT 1
    )
  `)

  // Non-destructive migration for existing DBs
  try { db.exec(`ALTER TABLE pipeline_runs ADD COLUMN project_root TEXT NOT NULL DEFAULT ''`) } catch {}

  const stmtInsert = db.prepare(`
    INSERT INTO pipeline_runs
      (papel, tarefa, contexto, modo, condicao, model, project_root,
       tokens_original, tokens_compressed, tokens_output,
       cost_usd, duration_ms, success)
    VALUES
      (@papel, @tarefa, @contexto, @modo, @condicao, @model, @project_root,
       @tokens_original, @tokens_compressed, @tokens_output,
       @cost_usd, @duration_ms, @success)
  `)

  return {
    saveRun(run) {
      const info = stmtInsert.run({ project_root: '', ...run, success: run.success ? 1 : 0 })
      return info.lastInsertRowid
    },

    getRunById(id) {
      return db.prepare('SELECT * FROM pipeline_runs WHERE id = ?').get(id)
    },

    getRecentRuns(limit = 20) {
      return db.prepare('SELECT * FROM pipeline_runs ORDER BY created_at DESC, id DESC LIMIT ?').all(limit)
    },

    getSummary() {
      return db.prepare(`
        SELECT
          COUNT(*)                           AS total_runs,
          COALESCE(SUM(tokens_original),  0) AS total_tokens_original,
          COALESCE(SUM(tokens_compressed),0) AS total_tokens_compressed,
          COALESCE(SUM(tokens_output),    0) AS total_tokens_output,
          COALESCE(SUM(cost_usd),         0) AS total_cost_usd,
          COALESCE(AVG(
            CASE WHEN tokens_original > 0
              THEN (1.0 - tokens_compressed * 1.0 / tokens_original) * 100
            ELSE 0 END
          ), 0) AS avg_compression_pct
        FROM pipeline_runs
      `).get()
    },

    getTodaySummary() {
      return db.prepare(`
        SELECT COUNT(*) AS runs_today,
          COALESCE(SUM(tokens_original),  0) AS tokens_original_today,
          COALESCE(SUM(tokens_compressed),0) AS tokens_compressed_today,
          COALESCE(SUM(cost_usd),         0) AS cost_today
        FROM pipeline_runs
        WHERE date(created_at) = date('now')
      `).get()
    },

    getModeStats() {
      return db.prepare(`
        SELECT modo, COUNT(*) AS count
        FROM pipeline_runs GROUP BY modo ORDER BY count DESC
      `).all()
    },

    getProjectStats() {
      return db.prepare(`
        SELECT
          COALESCE(NULLIF(project_root,''), '(global)') AS project,
          COUNT(*) AS runs,
          COALESCE(SUM(cost_usd), 0) AS cost_usd,
          COALESCE(SUM(tokens_original),  0) AS tokens_original,
          COALESCE(SUM(tokens_compressed),0) AS tokens_compressed
        FROM pipeline_runs
        GROUP BY project_root
        ORDER BY runs DESC
      `).all()
    },

    close() { db.close() },
  }
}
