import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { toLocalDateKey } from '@/components/leads/leadAutomation'
import { sendPushToAll } from '../../../../../lib/webPush'

const normalizeKey = (key: string): string =>
  key
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (e.g. "Observações" -> "observacoes")
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

// The Wix Automation's actual body doesn't match our field names 1:1 — it
// sends the form's own Portuguese labels (e.g. "Nome", "telefone") and
// sometimes wraps everything under a "data" key. Rather than making the
// academy owner fight Wix's JSON-mapping UI to match our exact key names,
// this looks up each field under every name we've actually seen (or are
// likely to see) from Wix.
const extractField = (source: Record<string, unknown>, candidates: string[]): unknown => {
  const map = new Map<string, unknown>()
  Object.entries(source).forEach(([key, value]) => map.set(normalizeKey(key), value))
  for (const candidate of candidates) {
    const value = map.get(normalizeKey(candidate))
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return undefined
}

// Distinguishes "no matching key in the payload" from "the key is there but
// Wix sent an empty value" — the latter looks identical to a naming mismatch
// from the outside, but isn't fixable by adding more candidate names (this is
// exactly how the phone-always-empty bug was found: "telefone" was present
// and matched fine, Wix just never put a value in it). Surfacing which case
// happened points straight at "check the Wix Automation's field mapping"
// instead of "check our code" the next time any field goes missing.
const describeMissingField = (
  source: Record<string, unknown>,
  candidates: string[],
  label: string
): string | null => {
  const map = new Map<string, unknown>()
  Object.entries(source).forEach(([key, value]) => map.set(normalizeKey(key), value))
  const matchedCandidate = candidates.find((c) => map.has(normalizeKey(c)))
  if (!matchedCandidate) {
    return `${label}: nenhuma das chaves esperadas (${candidates.join(', ')}) veio no payload.`
  }
  const rawValue = map.get(normalizeKey(matchedCandidate))
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
    return `${label}: a chave "${matchedCandidate}" veio no payload mas vazia — provável erro de mapeamento na Automação do Wix, não no código deste endpoint.`
  }
  return null
}

// The Wix "Agende Aula Gratuita" form doesn't collect a raw age — it asks the
// visitor to pick a class category (Mini Campeões, Pequenos Campeões 1/2,
// Juniores, Adultos), mapped from the Automation as the "categoria" body
// param. Translated here to a representative age (lower bound of the
// bracket) so it flows through the same age-based logic everywhere else in
// the app (suggestClassTypesForAge / suggestKidsSubgroupForAge in
// leadAutomation.ts) — staff can correct it to the child's exact age once
// known, it's a starting point, not a reported fact.
const CATEGORY_TO_AGE: Array<{ match: string; age: number }> = [
  { match: 'minicampeoes', age: 3 },
  { match: 'pequenoscampeoes1', age: 6 },
  { match: 'pequenoscampeoes2', age: 9 },
  { match: 'juniores', age: 13 },
  { match: 'adultos', age: 18 },
]

const ageForCategory = (raw: unknown): number | null => {
  if (typeof raw !== 'string') return null
  const normalized = normalizeKey(raw)
  const match = CATEGORY_TO_AGE.find((entry) => normalized.includes(entry.match))
  return match ? match.age : null
}

const getEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Missing Supabase environment variables on the server.' }
  }

  return { supabaseUrl, serviceRoleKey }
}

// Receiving endpoint for the Wix Automation on the academy's "Agende Aula
// Gratuita" form (trigger: Formulário é enviado → Enviar solicitação HTTP).
// No shared secret is checked yet — see the write-up given alongside this
// file for the security trade-off and a cheap way to close it later.
export async function POST(request: Request) {
  const env = getEnv()
  if ('error' in env) {
    console.error('wix-leads webhook: missing env', env.error)
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)

  const rawText = await request.text().catch(() => '')
  let body: any = null
  try {
    body = rawText ? JSON.parse(rawText) : null
  } catch {
    body = null
  }

  // Logged unconditionally, success or failure — the whole point during
  // initial testing is seeing exactly what Wix actually sent.
  const logPayload = body && typeof body === 'object' ? body : { rawText }
  console.log('[wix-leads webhook] received payload:', logPayload)

  // Wix Automations sometimes wraps the actual field values under a "data" key.
  const fields: Record<string, unknown> =
    body && typeof body === 'object'
      ? (body.data && typeof body.data === 'object' ? body.data : body)
      : {}

  const NAME_KEYS = ['name', 'nome', 'fullname', 'nomecompleto']
  const PHONE_KEYS = [
    'phone', 'telefone', 'telemovel', 'mobile', 'contacto',
    'phonenumber', 'numerodetelefone', 'numerotelefone', 'numero', 'celular', 'whatsapp', 'contactphone',
  ]
  const EMAIL_KEYS = ['email', 'e-mail']
  const MESSAGE_KEYS = ['message', 'mensagem', 'comentario', 'comentário', 'observacoes']
  const AGE_KEYS = ['age', 'idade']
  const CATEGORY_KEYS = ['categoria', 'escolhaumaopcao', 'tipodeaula', 'faixaetaria']

  const name = String(extractField(fields, NAME_KEYS) || '').trim()
  const phone = String(extractField(fields, PHONE_KEYS) || '').trim()
  const email = String(extractField(fields, EMAIL_KEYS) || '').trim()
  const message = String(extractField(fields, MESSAGE_KEYS) || '').trim()
  const ageRaw = extractField(fields, AGE_KEYS)
  const categoryRaw = extractField(fields, CATEGORY_KEYS)
  const age = ageRaw !== undefined && Number.isFinite(Number(ageRaw))
    ? Number(ageRaw)
    : ageForCategory(categoryRaw)

  // Diagnostic-only, doesn't affect accept/reject — lets `webhook_logs` catch
  // "the field arrived empty" cases immediately instead of only noticing
  // once someone spots blank phone numbers piling up in the leads table.
  const warnings: string[] = []
  if (!phone) {
    const w = describeMissingField(fields, PHONE_KEYS, 'Telefone')
    if (w) warnings.push(w)
  }
  if (!email) {
    const w = describeMissingField(fields, EMAIL_KEYS, 'Email')
    if (w) warnings.push(w)
  }
  if (categoryRaw !== undefined && age === null) {
    warnings.push(`Categoria: veio "${String(categoryRaw)}" mas não corresponde a nenhuma categoria conhecida — idade não pôde ser inferida.`)
  }
  if (warnings.length) console.warn('[wix-leads webhook] field warnings:', warnings)
  const warningsText = warnings.length ? warnings.join(' | ') : null

  if (!name || (!phone && !email)) {
    const errorMessage = 'Missing name or phone/email — nothing usable to create a lead from.'
    await adminClient
      .from('webhook_logs')
      .insert([{ source: 'wix-leads', payload: logPayload, success: false, error_message: errorMessage, warnings: warningsText }])
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const payload = {
    name,
    contact_source: 'Site Wix',
    contact_date: toLocalDateKey(new Date()),
    phone: phone || null,
    email: email || null,
    // 16 matches the threshold used everywhere else age drives this decision
    // (suggestClassTypesForAge in leadAutomation.ts, getMemberType in
    // lib/payments.ts, calculateMonthlyFee in lib/types.ts) — this used to
    // say 18, which classified 16-17 year olds as GBK here while the rest of
    // the app treated them as adults.
    class_type: age !== null && age < 16 ? 'GBK' : 'GB1',
    age,
    status: 'Por contactar',
    enrolled: false,
    mensagem_inicial: message || null,
  }

  const { data, error } = await adminClient.from('leads').insert([payload]).select('id').single()

  if (error) {
    console.error('wix-leads webhook: insert failed', error)
    await adminClient
      .from('webhook_logs')
      .insert([{ source: 'wix-leads', payload: logPayload, success: false, error_message: error.message, warnings: warningsText }])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await adminClient
    .from('webhook_logs')
    .insert([{ source: 'wix-leads', payload: logPayload, lead_id: data.id, success: true, warnings: warningsText }])

  await sendPushToAll({
    title: 'Novo lead (Wix)',
    body: `${name} enviou um pedido através do site.`,
    url: '/leads',
  })

  return NextResponse.json({ success: true, leadId: data.id })
}
