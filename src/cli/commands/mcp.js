import { compressWithHeadroom } from '../../compressor/headroom.js'
import { countTokensEstimate } from '../../compressor/native.js'

// Minimal MCP server over stdio for Claude Code integration
// Exposes one tool: compress_context
export async function runMCP() {
  const tools = [{
    name: 'compress_context',
    description: 'Compress text context to reduce token usage before sending to AI. Uses headroom-ai when available, native compression as fallback.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to compress' },
        max_tokens: { type: 'number', description: 'Maximum tokens after compression (default 8000)' },
      },
      required: ['text'],
    },
  }]

  const respond = (obj) => process.stdout.write(JSON.stringify(obj) + '\n')

  process.stdin.setEncoding('utf8')
  let buf = ''

  process.stdin.on('data', (chunk) => {
    buf += chunk
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.trim()) continue
      let msg
      try { msg = JSON.parse(line) } catch { continue }

      if (msg.method === 'initialize') {
        respond({
          jsonrpc: '2.0', id: msg.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'tokensave', version: '0.1.0' },
          },
        })
      } else if (msg.method === 'tools/list') {
        respond({ jsonrpc: '2.0', id: msg.id, result: { tools } })
      } else if (msg.method === 'tools/call') {
        const { name, arguments: args } = msg.params
        if (name === 'compress_context') {
          const result = compressWithHeadroom(args.text, { maxTokens: args.max_tokens ?? 8000 })
          const saved = result.tokensOriginal - result.tokensCompressed
          const pct = result.tokensOriginal > 0
            ? Math.round(saved / result.tokensOriginal * 100) : 0
          respond({
            jsonrpc: '2.0', id: msg.id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  compressed: result.text,
                  tokens_original: result.tokensOriginal,
                  tokens_compressed: result.tokensCompressed,
                  saved_pct: pct,
                  method: result.usedHeadroom ? 'headroom' : 'native',
                }),
              }],
            },
          })
        }
      } else if (msg.method === 'notifications/initialized') {
        // no-op
      } else {
        respond({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } })
      }
    }
  })

  // Keep alive
  await new Promise(() => {})
}
