import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('inquirer', () => ({
  default: { prompt: vi.fn() },
}))

vi.mock('../src/pipeline/modes/index.js', () => ({
  getModeChoices: vi.fn(() => [{ name: 'SWOT', value: 'swot', short: 'SWOT' }]),
  getModeById: vi.fn(() => ({ id: 'swot', defaultCondicao: '' })),
}))

import inquirer from 'inquirer'
import { buildPipeline } from '../src/pipeline/builder.js'

describe('buildPipeline', () => {
  beforeEach(() => { inquirer.prompt.mockReset() })

  it('returns pipeline config with all required fields', async () => {
    inquirer.prompt
      .mockResolvedValueOnce({ papel: 'Arquiteto de Software Sênior' })
      .mockResolvedValueOnce({ tarefa: 'Revisar API de autenticação' })
      .mockResolvedValueOnce({ contextoType: 'skip' })
      .mockResolvedValueOnce({ modoChoice: 'swot' })
      .mockResolvedValueOnce({ condicao: 'All issues found' })

    const result = await buildPipeline()

    expect(result).toMatchObject({
      papel: 'Arquiteto de Software Sênior',
      tarefa: 'Revisar API de autenticação',
      contexto: '',
      modo: 'swot',
      condicao: 'All issues found',
    })
  })

  it('accepts modeOverride to skip mode selection prompt', async () => {
    inquirer.prompt
      .mockResolvedValueOnce({ papel: 'Tech Lead' })
      .mockResolvedValueOnce({ tarefa: 'SWOT da arquitetura' })
      .mockResolvedValueOnce({ contextoType: 'skip' })
      .mockResolvedValueOnce({ condicao: 'Done' })

    const result = await buildPipeline({ modeOverride: 'swot' })
    expect(result.modo).toBe('swot')
    expect(inquirer.prompt).toHaveBeenCalledTimes(4)
  })
})
