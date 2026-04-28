import { describe, it, expect } from 'vitest'
import { detectProvider, getApiKey } from '../../src/core/provider.js'

describe('detectProvider', () => {
  it('detects anthropic from claude- prefix', () => {
    expect(detectProvider('claude-sonnet-4-6')).toBe('anthropic')
    expect(detectProvider('claude-opus-4-7')).toBe('anthropic')
  })
  it('detects openai from gpt- prefix', () => {
    expect(detectProvider('gpt-4o')).toBe('openai')
    expect(detectProvider('gpt-4o-mini')).toBe('openai')
  })
  it('detects openai from o1/o3 prefix', () => {
    expect(detectProvider('o1-preview')).toBe('openai')
    expect(detectProvider('o3-mini')).toBe('openai')
  })
  it('detects google from gemini- prefix', () => {
    expect(detectProvider('gemini-1.5-pro')).toBe('google')
  })
  it('detects ollama from ollama/ prefix', () => {
    expect(detectProvider('ollama/llama3')).toBe('ollama')
    expect(detectProvider('ollama:mistral')).toBe('ollama')
  })
  it('defaults to anthropic for unknown', () => {
    expect(detectProvider(undefined)).toBe('anthropic')
    expect(detectProvider('')).toBe('anthropic')
  })
})

describe('getApiKey', () => {
  it('returns config value when set', () => {
    expect(getApiKey('anthropic', { anthropic_api_key: 'sk-test' })).toBe('sk-test')
  })
  it('returns empty string when key not set', () => {
    const backup = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    expect(getApiKey('anthropic', {})).toBe('')
    if (backup) process.env.ANTHROPIC_API_KEY = backup
  })
  it('returns ollama for ollama provider', () => {
    expect(getApiKey('ollama', {})).toBe('ollama')
  })
})
