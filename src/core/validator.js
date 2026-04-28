import { MODES } from '../pipeline/modes/index.js'

export const VALID_MODELS = [
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'gpt-4o',
  'gpt-4o-mini',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

const VALID_MODE_IDS = new Set(MODES.map(m => m.id))

export function validatePipeline(pipeline) {
  const errors = []

  if (!pipeline.papel?.trim())
    errors.push('papel é obrigatório')

  if (!pipeline.tarefa?.trim())
    errors.push('tarefa é obrigatória')

  if (!pipeline.modo?.trim())
    errors.push('modo é obrigatório')
  else if (!VALID_MODE_IDS.has(pipeline.modo))
    errors.push(`modo "${pipeline.modo}" inválido. Use: ${[...VALID_MODE_IDS].join(', ')}`)

  if (pipeline.model && !pipeline.model.startsWith('ollama/') && !pipeline.model.startsWith('ollama:')) {
    if (!VALID_MODELS.includes(pipeline.model))
      errors.push(`model "${pipeline.model}" não reconhecido. Modelos válidos: ${VALID_MODELS.join(', ')} (ou ollama/<nome>)`)
  }

  return { valid: errors.length === 0, errors }
}
