import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireRole } from '../../../../../lib/apiAuth'

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

interface PushSubscriptionJson {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function POST(request: Request) {
  const access = await requireRole(['admin', 'staff', 'coach'])
  if ('error' in access) return access.error

  const env = getEnv()
  if ('error' in env) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const body = (await request.json().catch(() => null)) as PushSubscriptionJson | null
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid push subscription payload.' }, { status: 400 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)
  const { error } = await adminClient
    .from('push_subscriptions')
    .upsert(
      [{ endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth }],
      { onConflict: 'endpoint' }
    )

  if (error) {
    console.error('[push/subscribe] insert failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request) {
  const access = await requireRole(['admin', 'staff', 'coach'])
  if ('error' in access) return access.error

  const env = getEnv()
  if ('error' in env) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null
  if (!body?.endpoint) {
    return NextResponse.json({ error: 'Missing endpoint.' }, { status: 400 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)
  await adminClient.from('push_subscriptions').delete().eq('endpoint', body.endpoint)

  return NextResponse.json({ success: true })
}
