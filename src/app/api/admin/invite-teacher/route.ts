import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '../../../../../lib/supabaseServer'

type AppRole = 'admin' | 'staff' | 'coach'

const isRole = (value: string): value is AppRole => {
  return value === 'admin' || value === 'staff' || value === 'coach'
}

const getEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Missing Supabase environment variables.' }
  }

  return { supabaseUrl, serviceRoleKey }
}

const ensureAdmin = async () => {
  const serverClient = createSupabaseServerClient()
  const { data: userData, error: authError } = await serverClient.auth.getUser()
  const user = userData?.user

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await serverClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  const env = getEnv()
  if ('error' in env) {
    return NextResponse.json({ error: env.error }, { status: 500 })
  }

  const access = await ensureAdmin()
  if ('error' in access) return access.error

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ items: data || [] })
}

export async function POST(request: Request) {
  const env = getEnv()
  if ('error' in env) {
    return NextResponse.json({ error: env.error }, { status: 500 })
  }

  const access = await ensureAdmin()
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  const email = String(body?.email || '').trim().toLowerCase()
  const roleValue = String(body?.role || '').trim()
  const fullName = String(body?.fullName || '').trim()

  if (!email || !isRole(roleValue)) {
    return NextResponse.json({ error: 'Valid email and role are required.' }, { status: 400 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)

  const invite = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      role: roleValue,
      full_name: fullName || null,
    },
  })

  if (invite.error) {
    return NextResponse.json({ error: invite.error.message }, { status: 500 })
  }

  const invitedUserId = invite.data.user?.id

  if (!invitedUserId) {
    return NextResponse.json({ error: 'Invite sent but no user id returned.' }, { status: 500 })
  }

  const { error: profileUpsertError } = await adminClient
    .from('profiles')
    .upsert(
      {
        id: invitedUserId,
        email,
        full_name: fullName || null,
        role: roleValue,
      },
      { onConflict: 'id' }
    )

  if (profileUpsertError) {
    return NextResponse.json({ error: profileUpsertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
