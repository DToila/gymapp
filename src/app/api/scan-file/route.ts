import { NextRequest, NextResponse } from 'next/server'
import * as Tesseract from 'tesseract.js'

export const runtime = 'nodejs'

interface ScanRequest {
  fileBase64: string
  fileType: 'image' | 'pdf'
  mimeType: string
  prompt?: string
}

// Parse DD file text to extract structured data
const parseDdText = (text: string): Record<string, unknown>[] => {
  const rows: Record<string, unknown>[] = []
  const lines = text.split('\n').filter(line => line.trim())

  for (const line of lines) {
    // Skip headers and irrelevant lines
    if (line.match(/^(IBAN|Swift|Valor|Tipo|Ref|Data|Nome|NIF|iban|swift|valor|tipo|ref|data|nome|nif)/i)) {
      continue
    }

    // Match IBAN pattern (PT + 24 digits)
    const ibanMatch = line.match(/PT\d{24}\b/)
    if (!ibanMatch) continue

    const iban = ibanMatch[0]

    // Extract other fields from the same line
    const nifMatch = line.match(/\b\d{9}\b/)
    const nif = nifMatch ? nifMatch[0] : ''

    // Look for amount (number with optional decimal)
    const amountMatch = line.match(/\d+[.,]\d{2}\b/)
    const valor = amountMatch ? amountMatch[0] : ''

    // Extract name (text between non-digits, usually after IBAN)
    const afterIban = line.substring(line.indexOf(iban) + iban.length)
    const nameMatch = afterIban.match(/[A-Za-z\s]+/)
    const nome = nameMatch ? nameMatch[0].trim() : ''

    rows.push({
      iban,
      nome,
      nif,
      valor,
      swift: '',
      tipo: 'DD',
      ref: '',
      data: new Date().toISOString().split('T')[0],
    })
  }

  return rows
}

// Parse lead form text to extract form fields
const parseLeadFormText = (text: string): Record<string, unknown> => {
  const result: Record<string, unknown> = {
    name: null,
    date_of_birth: null,
    nif: null,
    phone: null,
    email: null,
    address: null,
    emergency_contact: null,
    how_they_found_us: null,
    parent_name: null,
  }

  const lines = text.split('\n')

  for (const line of lines) {
    // Email
    if (!result.email) {
      const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) result.email = emailMatch[0]
    }

    // Phone (Portuguese format)
    if (!result.phone) {
      const phoneMatch = line.match(/\b\d{3}\s?\d{3}\s?\d{3}\b|\+351\s?\d{9}\b|\(\d{2}\)\s?\d{4,5}-?\d{4}/)
      if (phoneMatch) result.phone = phoneMatch[0]
    }

    // NIF (9 digits)
    if (!result.nif) {
      const nifMatch = line.match(/\b\d{9}\b/)
      if (nifMatch) result.nif = nifMatch[0]
    }

    // Date (DD/MM/YYYY or YYYY-MM-DD)
    if (!result.date_of_birth) {
      const dateMatch = line.match(/\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}/)
      if (dateMatch) {
        const date = dateMatch[0]
        // Convert DD/MM/YYYY to YYYY-MM-DD
        if (date.includes('/')) {
          const [d, m, y] = date.split('/')
          result.date_of_birth = `${y}-${m}-${d}`
        } else {
          result.date_of_birth = date
        }
      }
    }

    // Name (extract after "Nome:" or at beginning of lines with capital letters)
    if (!result.name) {
      const nomeMatch = line.match(/Nome:\s*([A-Za-z\s]+)/i)
      if (nomeMatch) {
        result.name = nomeMatch[1].trim()
      }
    }

    // Address
    if (!result.address) {
      const addrMatch = line.match(/Rua|Avenida|Travessa|Morada:\s*(.+)/i)
      if (addrMatch) {
        result.address = addrMatch[1].trim()
      }
    }
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json()
    const { fileBase64, fileType, prompt: customPrompt } = body

    if (!fileBase64 || !fileType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert base64 to Buffer
    const buffer = Buffer.from(fileBase64, 'base64')

    console.log(`[API] Starting OCR for ${fileType}, size: ${buffer.length} bytes`)

    // Run Tesseract OCR with timeout
    const ocrPromise = Tesseract.recognize(buffer, 'por', {
      logger: (m) => {
        if (m.status === 'recognizing') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`)
        }
      },
    })

    // Race against 55 second timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('OCR processing timeout - image too complex or server overloaded')), 55000)
    )

    const result = await Promise.race([ocrPromise, timeoutPromise]) as Awaited<typeof ocrPromise>

    const ocrText = result.data.text

    console.log(`[API] OCR extracted ${ocrText.length} characters`)

    if (!ocrText || ocrText.trim().length === 0) {
      return NextResponse.json({ error: 'No text found in image/PDF' }, { status: 400 })
    }

    let extractedData: Record<string, unknown> | Record<string, unknown>[]

    // Determine what we're parsing based on context
    if (customPrompt && customPrompt.includes('welcome form')) {
      // Parse as lead form
      extractedData = parseLeadFormText(ocrText)
    } else {
      // Parse as DD file (returns array)
      extractedData = parseDdText(ocrText)
      if (extractedData.length === 0) {
        return NextResponse.json(
          { error: 'Could not extract structured data from document. No valid IBAN entries found.' },
          { status: 400 }
        )
      }
    }

    console.log(`[API] Successfully extracted data`)

    // Return based on whether response is array or object
    if (Array.isArray(extractedData)) {
      return NextResponse.json({ data: extractedData })
    } else {
      return NextResponse.json(extractedData)
    }
  } catch (error) {
    console.error('[API] Unhandled error:', error)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
