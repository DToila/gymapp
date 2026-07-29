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

const HEARD_FROM_OPTIONS = [
  'Website',
  'Social Media',
  'Outras academias GB',
  'Alunos GBCQ',
  'Visibilidade Rua',
  'Flyer',
  'Outro',
]

// This is the write path for the public, unauthenticated registration form —
// it runs with the service-role key server-side (bypassing RLS by design)
// instead of having the browser insert directly with the anon key.
export async function POST(request: Request) {
  const env = getEnv()
  if ('error' in env) {
    console.error('register-lead: missing env', env.error)
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim()

  if (!name || !email) {
    return NextResponse.json({ error: 'Nome e email são obrigatórios.' }, { status: 400 })
  }

  const sexo = body.sexo === 'M' || body.sexo === 'F' ? body.sexo : null
  const comoSoube = HEARD_FROM_OPTIONS.includes(body.como_soube) ? body.como_soube : null
  const classType = body.class_type === 'GBK' || body.class_type === 'GB2' ? body.class_type : 'GB1'
  const age = Number.isFinite(Number(body.age)) ? Number(body.age) : null

  const payload = {
    name,
    contact_source: 'Website',
    contact_date: String(body.contact_date || new Date().toISOString().slice(0, 10)),
    email,
    phone: body.phone ? String(body.phone).trim() : null,
    class_type: classType,
    age,
    status: 'Por contactar',
    enrolled: false,
    nif: body.nif ? String(body.nif).trim() : null,
    sexo,
    morada: body.morada ? String(body.morada).trim() : null,
    codigo_postal: body.codigo_postal ? String(body.codigo_postal).trim() : null,
    contacto_emergencia: body.contacto_emergencia ? String(body.contacto_emergencia).trim() : null,
    como_soube: comoSoube,
    nome_pai: body.nome_pai ? String(body.nome_pai).trim() : null,
    nome_mae: body.nome_mae ? String(body.nome_mae).trim() : null,
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)
  const { data, error } = await adminClient.from('leads').insert([payload]).select('id').single()

  if (error) {
    console.error('register-lead: insert failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, leadId: data.id })
}
