import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// Public, unauthenticated endpoint — lets someone who already booked a trial
// class (via /register) find their own lead record on /register/complete by
// typing back the phone or email they used, instead of a per-person link
// (which would need real SMS/email delivery — still stubbed for now).
export async function GET(request: Request) {
  const env = getEnv()
  if ('error' in env) {
    console.error('find-lead: missing env', env.error)
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const contact = String(searchParams.get('contact') || '').trim()
  if (!contact) {
    return NextResponse.json({ error: 'Indica o teu telefone ou email.' }, { status: 400 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)

  const [phoneMatch, emailMatch] = await Promise.all([
    adminClient.from('leads').select('id, name, age, created_at').eq('phone', contact),
    adminClient.from('leads').select('id, name, age, created_at').ilike('email', contact),
  ])

  if (phoneMatch.error || emailMatch.error) {
    console.error('find-lead: query failed', phoneMatch.error || emailMatch.error)
    return NextResponse.json({ error: 'Erro ao procurar o registo.' }, { status: 500 })
  }

  const merged = new Map<string, { id: string; name: string; age: number | null; created_at: string }>()
  ;[...(phoneMatch.data || []), ...(emailMatch.data || [])].forEach((row) => merged.set(row.id, row))

  const matches = Array.from(merged.values()).sort((a, b) => b.created_at.localeCompare(a.created_at))

  if (matches.length === 0) {
    return NextResponse.json({ found: false })
  }

  const lead = matches[0]
  return NextResponse.json({ found: true, lead: { id: lead.id, name: lead.name, age: lead.age } })
}
