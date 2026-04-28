import { describe, it, expect } from 'vitest'
import { validatePipeline, VALID_MODELS } from '../../src/core/validator.js'

describe('validatePipeline', () => {
  const base = { papel: 'Engineer', tarefa: 'review code', modo: 'revisar-codigo' }

  it('passes a valid pipeline', () => {
    const r = validatePipeline(base)
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('fails when papel is missing', () => {
    const r = validatePipeline({ ...base, papel: '' })
    expect(r.valid).toBe(false)
    expect(r.errors[0]).toMatch(/papel/)
  })

  it('fails when tarefa is missing', () => {
    const r = validatePipeline({ ...base, tarefa: '' })
    expect(r.valid).toBe(false)
    expect(r.errors[0]).toMatch(/tarefa/)
  })

  it('fails when modo is invalid', () => {
    const r = validatePipeline({ ...base, modo: 'not-a-mode' })
    expect(r.valid).toBe(false)
    expect(r.errors[0]).toMatch(/modo/)
  })

  it('fails on unknown explicit model', () => {
    const r = validatePipeline({ ...base, model: 'unknown-model-xyz' })
    expect(r.valid).toBe(false)
    expect(r.errors[0]).toMatch(/model/)
  })

  it('allows ollama/* models', () => {
    const r = validatePipeline({ ...base, model: 'ollama/llama3' })
    expect(r.valid).toBe(true)
  })

  it('allows ollama: models', () => {
    const r = validatePipeline({ ...base, model: 'ollama:mistral' })
    expect(r.valid).toBe(true)
  })

  it('collects multiple errors', () => {
    const r = validatePipeline({ papel: '', tarefa: '', modo: 'bad' })
    expect(r.errors.length).toBeGreaterThanOrEqual(3)
  })

  it('VALID_MODELS includes claude-sonnet-4-6', () => {
    expect(VALID_MODELS).toContain('claude-sonnet-4-6')
  })
})
