import inquirer from 'inquirer'
import { readFileSync } from 'fs'

const PAPEIS_COMUNS = [
  'Arquiteto de Software Sênior',
  'Security Auditor',
  'Tech Lead',
  'CTO Advisor',
  'Data Scientist',
  'DBA',
  'DevOps/SRE',
  'UX Researcher',
  'Technical Writer',
  'Outro (digitar)',
]

export async function buildPipeline({ modeOverride } = {}) {
  const { papel: papelChoice } = await inquirer.prompt([{
    type: 'list',
    name: 'papel',
    message: 'Papel (persona do AI):',
    choices: PAPEIS_COMUNS,
    pageSize: 12,
  }])

  let papel = papelChoice
  if (papelChoice === 'Outro (digitar)') {
    const { papelCustom } = await inquirer.prompt([{
      type: 'input', name: 'papelCustom', message: 'Digite o papel:',
    }])
    papel = papelCustom
  }

  const { tarefa } = await inquirer.prompt([{
    type: 'input',
    name: 'tarefa',
    message: 'Tarefa (o que precisa ser feito):',
    validate: (v) => v.trim().length > 3 || 'Descreva a tarefa',
  }])

  const { contextoType } = await inquirer.prompt([{
    type: 'list',
    name: 'contextoType',
    message: 'Contexto:',
    choices: [
      { name: 'Digitar texto', value: 'text' },
      { name: 'Caminho de arquivo/pasta', value: 'file' },
      { name: 'Pular', value: 'skip' },
    ],
  }])

  let contexto = ''
  if (contextoType === 'text') {
    const { contextoText } = await inquirer.prompt([{
      type: 'editor', name: 'contextoText', message: 'Cole o contexto:',
    }])
    contexto = contextoText
  } else if (contextoType === 'file') {
    const { filePath } = await inquirer.prompt([{
      type: 'input', name: 'filePath', message: 'Caminho do arquivo:',
    }])
    try {
      contexto = readFileSync(filePath.trim(), 'utf8')
    } catch {
      console.warn(`⚠ Could not read ${filePath}, continuing without context`)
    }
  }

  let modo = modeOverride
  if (!modo) {
    const { getModeChoices } = await import('./modes/index.js')
    const { modoChoice } = await inquirer.prompt([{
      type: 'list',
      name: 'modoChoice',
      message: 'Modo de raciocínio:',
      choices: getModeChoices(),
      pageSize: 12,
    }])
    modo = modoChoice
  }

  const { getModeById } = await import('./modes/index.js')
  const modeObj = getModeById(modo)
  const { condicao } = await inquirer.prompt([{
    type: 'input',
    name: 'condicao',
    message: 'Condição de saída (o que define "pronto"):',
    default: modeObj?.defaultCondicao || '',
  }])

  return { papel, tarefa, contexto, modo, condicao }
}
