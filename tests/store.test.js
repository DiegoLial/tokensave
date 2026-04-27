import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createStore } from '../src/store/db.js'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

function tempDb() {
  return join(tmpdir(), `tokensave-test-${randomBytes(4).toString('hex')}.db`)
}

describe('store', () => {
  let store, dbPath

  beforeEach(() => {
    dbPath = tempDb()
    store = createStore(dbPath)
  })

  afterEach(() => {
    store.close()
  })

  it('saves and retrieves a pipeline run', () => {
    const run = {
      papel: 'Arquiteto',
      tarefa: 'Revisar API',
      contexto: 'src/auth/',
      modo: 'revisar-codigo',
      condicao: 'Vulnerabilidades identificadas',
      model: 'claude-sonnet-4-6',
      tokens_original: 2847,
      tokens_compressed: 810,
      tokens_output: 512,
      cost_usd: 0.004,
      duration_ms: 2100,
      success: true,
    }

    const id = store.saveRun(run)
    expect(id).toBeTypeOf('number')

    const saved = store.getRunById(id)
    expect(saved.papel).toBe('Arquiteto')
    expect(saved.modo).toBe('revisar-codigo')
    expect(saved.tokens_compressed).toBe(810)
  })

  it('returns summary stats', () => {
    store.saveRun({ papel:'A',tarefa:'T',contexto:'C',modo:'swot',condicao:'X',model:'claude-sonnet-4-6',tokens_original:1000,tokens_compressed:300,tokens_output:200,cost_usd:0.002,duration_ms:1000,success:true })
    store.saveRun({ papel:'A',tarefa:'T',contexto:'C',modo:'swot',condicao:'X',model:'gpt-4o',tokens_original:2000,tokens_compressed:600,tokens_output:400,cost_usd:0.005,duration_ms:2000,success:true })

    const stats = store.getSummary()
    expect(stats.total_runs).toBe(2)
    expect(stats.total_tokens_original).toBe(3000)
    expect(stats.total_tokens_compressed).toBe(900)
    expect(stats.total_cost_usd).toBeCloseTo(0.007)
  })

  it('returns recent runs ordered by created_at desc', () => {
    store.saveRun({ papel:'A',tarefa:'1',contexto:'',modo:'swot',condicao:'',model:'claude-sonnet-4-6',tokens_original:100,tokens_compressed:30,tokens_output:50,cost_usd:0.001,duration_ms:500,success:true })
    store.saveRun({ papel:'A',tarefa:'2',contexto:'',modo:'pitfalls',condicao:'',model:'claude-sonnet-4-6',tokens_original:200,tokens_compressed:60,tokens_output:100,cost_usd:0.002,duration_ms:800,success:true })

    const runs = store.getRecentRuns(10)
    expect(runs[0].tarefa).toBe('2')
    expect(runs[1].tarefa).toBe('1')
  })
})
