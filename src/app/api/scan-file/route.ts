import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface ScanRequest {
  fileBase64: string
  fileType: 'image' | 'pdf'
  mimeType: string
  prompt?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json()
    const { fileBase64, fileType, mimeType, prompt: customPrompt } = body

    if (!fileBase64 || !fileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Use custom prompt if provided, otherwise default to DD file format
    const systemPrompt = customPrompt
      ? customPrompt
      : fileType === 'pdf'
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

    // Parse JSON from response (can be array or object)
    let extractedData
    try {
      // Try to find JSON array first
      const arrayMatch = content.match(/\[[\s\S]*\]/)
      if (arrayMatch) {
        extractedData = JSON.parse(arrayMatch[0])
      } else {
        // Try to find JSON object
        const objectMatch = content.match(/\{[\s\S]*\}/)
        if (objectMatch) {
          extractedData = JSON.parse(objectMatch[0])
        } else {
          extractedData = JSON.parse(content)
        }
      }
    } catch (parseError) {
      console.error('[API] JSON parse error:', parseError)
      return NextResponse.json(
        { error: `Could not parse API response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    console.log(`[API] Successfully extracted data (${fileType})`)
    
    // Return based on whether response is array or object
    if (Array.isArray(extractedData)) {
      return NextResponse.json({ data: extractedData })
    } else {
      // For object responses (like lead forms), return the object directly
      return NextResponse.json(extractedData)
    }
  } catch (error) {
    console.error('[API] Unhandled error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
