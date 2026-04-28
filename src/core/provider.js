export function detectProvider(model) {
  if (!model) return 'anthropic'
  if (model.startsWith('ollama/') || model.startsWith('ollama:')) return 'ollama'
  if (model.startsWith('claude'))  return 'anthropic'
  if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3')) return 'openai'
  if (model.startsWith('gemini'))  return 'google'
  return 'anthropic'
}

export function getApiKey(provider, config) {
  switch (provider) {
    case 'anthropic': return config.anthropic_api_key ?? process.env.ANTHROPIC_API_KEY ?? ''
    case 'openai':    return config.openai_api_key    ?? process.env.OPENAI_API_KEY    ?? ''
    case 'google':    return config.google_api_key    ?? process.env.GOOGLE_API_KEY    ?? ''
    case 'ollama':    return 'ollama'
    default:          return ''
  }
}

export async function createClient(provider, apiKey, config) {
  switch (provider) {
    case 'anthropic': {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      return new Anthropic({ apiKey })
    }
    case 'openai': {
      const { default: OpenAI } = await import('openai')
      return new OpenAI({ apiKey })
    }
    case 'google': {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      return new GoogleGenerativeAI(apiKey)
    }
    case 'ollama': {
      const { default: OpenAI } = await import('openai')
      return new OpenAI({
        apiKey: 'ollama',
        baseURL: config?.ollama_base_url ?? 'http://localhost:11434/v1',
      })
    }
  }
}
