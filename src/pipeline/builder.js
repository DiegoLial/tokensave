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

export async function buildPipeline({ modeOverride, defaults = {} } = {}) {
  // PAPEL
  let papel = defaults.papel
  if (!papel) {
    const { papel: papelChoice } = await inquirer.prompt([{
      type: 'list',
      name: 'papel',
      message: 'Papel (persona do AI):',
      choices: PAPEIS_COMUNS,
      pageSize: 12,
    }])
    papel = papelChoice
    if (papel === 'Outro (digitar)') {
      const { papelCustom } = await inquirer.prompt([{
        type: 'input', name: 'papelCustom', message: 'Digite o papel:',
      }])
      papel = papelCustom
    }
  }

  // TAREFA
  let tarefa = defaults.tarefa
  if (!tarefa) {
    const res = await inquirer.prompt([{
      type: 'input',
      name: 'tarefa',
      message: 'Tarefa (o que precisa ser feito):',
      validate: (v) => v.trim().length > 3 || 'Descreva a tarefa',
    }])
    tarefa = res.tarefa
  }

  // CONTEXTO — se já veio de flag, pula o menu
  let contexto = defaults.contextText || ''
  if (defaults.contextFile) {
    try { contexto = readFileSync(defaults.contextFile.trim(), 'utf8') } catch {
      console.warn(`⚠ Não foi possível ler ${defaults.contextFile}`)
    }
  } else if (defaults.contextUrl) {
    contexto = await fetchUrl(defaults.contextUrl)
  } else {
    const { contextoType } = await inquirer.prompt([{
      type: 'list',
      name: 'contextoType',
      message: 'Contexto:',
      choices: [
        { name: 'Digitar texto', value: 'text' },
        { name: 'Caminho de arquivo/pasta', value: 'file' },
        { name: 'URL (fetch automático)', value: 'url' },
        { name: 'Pular', value: 'skip' },
      ],
    }])

    if (contextoType === 'text') {
      const { contextoText } = await inquirer.prompt([{
        type: 'editor', name: 'contextoText', message: 'Cole o contexto:',
      }])
      contexto = contextoText
    } else if (contextoType === 'file') {
      const { filePath } = await inquirer.prompt([{
        type: 'input', name: 'filePath', message: 'Caminho do arquivo:',
      }])
      try { contexto = readFileSync(filePath.trim(), 'utf8') } catch {
        console.warn(`⚠ Não foi possível ler ${filePath}`)
      }
    } else if (contextoType === 'url') {
      const { url } = await inquirer.prompt([{
        type: 'input', name: 'url', message: 'URL:',
        validate: (v) => v.startsWith('http') || 'URL inválida',
      }])
      contexto = await fetchUrl(url)
    }
  }

  // MODO
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

  // CONDIÇÃO
  const { getModeById } = await import('./modes/index.js')
  const modeObj = getModeById(modo)
  let condicao = defaults.condicao
  if (condicao === undefined || condicao === null) {
    const res = await inquirer.prompt([{
      type: 'input',
      name: 'condicao',
      message: 'Condição de saída (o que define "pronto"):',
      default: modeObj?.defaultCondicao || '',
    }])
    condicao = res.condicao
  }

  return { papel, tarefa, contexto, modo, condicao }
}

async function fetchUrl(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    return text
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{3,}/g, '\n\n')
      .trim()
  } catch (err) {
    console.warn(`⚠ Fetch falhou (${err.message}), continuando sem contexto`)
    return ''
  }
}
