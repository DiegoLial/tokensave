import chalk from 'chalk'

const MAX_RETRIES = 3
const BASE_DELAY  = 1000

function isRetryable(err) {
  const status = err.status ?? err.statusCode ?? 0
  return status === 429 || status >= 500
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

/**
 * Returns an AsyncGenerator that yields string chunks.
 * Handles Anthropic, OpenAI-compat (OpenAI + Ollama), and Google.
 */
export async function* streamResponse({ provider, client, model, systemPrompt, userMessage }) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (provider === 'anthropic') {
        const stream = client.messages.stream({
          model,
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        })
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            yield event.delta.text
          }
        }
        return

      } else if (provider === 'openai' || provider === 'ollama') {
        const stream = await client.chat.completions.create({
          model: model.replace(/^ollama[/:]/, ''),
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMessage  },
          ],
        })
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content
          if (text) yield text
        }
        return

      } else if (provider === 'google') {
        const genModel = client.getGenerativeModel({ model })
        const result = await genModel.generateContentStream([
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }
        ])
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) yield text
        }
        return
      }

    } catch (err) {
      if (!isRetryable(err) || attempt === MAX_RETRIES) throw err
      const delay = BASE_DELAY * Math.pow(2, attempt)
      process.stderr.write(chalk.yellow(`\n  ⚠ ${err.status ?? 'error'} — retrying in ${delay/1000}s...\n`))
      await sleep(delay)
    }
  }
}
