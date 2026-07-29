import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { toLocalDateKey } from '@/components/leads/leadAutomation'

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

  const name = body && typeof body === 'object' ? String(body.name || '').trim() : ''
  const phone = body && typeof body === 'object' && body.phone ? String(body.phone).trim() : ''
  const email = body && typeof body === 'object' && body.email ? String(body.email).trim() : ''
  const message = body && typeof body === 'object' && body.message ? String(body.message).trim() : ''
  const ageRaw = body && typeof body === 'object' ? body.age : undefined
  const age = ageRaw !== undefined && ageRaw !== null && String(ageRaw).trim() !== '' && Number.isFinite(Number(ageRaw))
    ? Number(ageRaw)
    : null

  if (!name || (!phone && !email)) {
    const errorMessage = 'Missing name or phone/email — nothing usable to create a lead from.'
    await adminClient
      .from('webhook_logs')
      .insert([{ source: 'wix-leads', payload: logPayload, success: false, error_message: errorMessage }])
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }

  const payload = {
    name,
    contact_source: 'Site Wix',
    contact_date: toLocalDateKey(new Date()),
    phone: phone || null,
    email: email || null,
    class_type: age !== null && age < 18 ? 'GBK' : 'GB1',
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
      .insert([{ source: 'wix-leads', payload: logPayload, success: false, error_message: error.message }])
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await adminClient
    .from('webhook_logs')
    .insert([{ source: 'wix-leads', payload: logPayload, lead_id: data.id, success: true }])

  return NextResponse.json({ success: true, leadId: data.id })
}
