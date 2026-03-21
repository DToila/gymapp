import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface ScanRequest {
  fileBase64: string
  fileType: 'image' | 'pdf'
  mimeType: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json()
    const { fileBase64, fileType, mimeType } = body

    if (!fileBase64 || !fileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const systemPrompt =
      fileType === 'pdf'
        ? 'This is a Portuguese Direct Debit file. Extract ALL data rows from the table. Return ONLY a valid JSON array with no markdown or extra text. Each object MUST have these keys: iban, swift, valor, tipo, ref, data, nome, nif. Omit status/notas fields. If a field is not in the PDF, use empty string "". Do NOT include headers. Do NOT filter rows.'
        : 'This is a Portuguese Direct Debit file. Extract all rows and return ONLY valid JSON array with no markdown, each row having: iban, swift, valor, tipo, ref, data, nome, nif'

    const contentBlock =
      fileType === 'pdf'
        ? {
            type: 'document' as const,
            source: {
              type: 'base64' as const,
              media_type: 'application/pdf' as const,
              data: fileBase64,
            },
          }
        : {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: mimeType,
              data: fileBase64,
            },
          }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: fileType === 'pdf' ? 4096 : 2048,
        messages: [
          {
            role: 'user',
            content: [contentBlock, { type: 'text', text: systemPrompt }],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      console.error('[API] Anthropic error:', errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: response.status })
    }

    const data = await response.json()
    const content = data.content[0]?.text

    if (!content) {
      console.error('[API] No text content in response')
      return NextResponse.json({ error: 'No response content from API' }, { status: 500 })
    }

    // Parse JSON from response
    let extractedData
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0])
      } else {
        extractedData = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('[API] JSON parse error:', parseError)
      return NextResponse.json(
        { error: `Could not parse API response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    if (!Array.isArray(extractedData)) {
      console.error('[API] Response is not array:', typeof extractedData)
      return NextResponse.json({ error: 'API response is not a valid array' }, { status: 500 })
    }

    console.log(`[API] Successfully extracted ${extractedData.length} rows (${fileType})`)
    return NextResponse.json({ data: extractedData })
  } catch (error) {
    console.error('[API] Unhandled error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
