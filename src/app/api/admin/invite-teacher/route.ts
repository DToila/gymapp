import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '../../../../../lib/supabaseServer'

type AppRole = 'admin' | 'staff' | 'coach'

const isRole = (value: string): value is AppRole => {
  return value === 'admin' || value === 'staff' || value === 'coach'
}

const getEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY

  const missing: string[] = []
  if (!supabaseUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)')
  }
  if (!serviceRoleKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY')
  }

  if (missing.length > 0) {
    return { error: `Missing Supabase environment variables: ${missing.join(', ')}` }
  }

  return { supabaseUrl: supabaseUrl as string, serviceRoleKey: serviceRoleKey as string }
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
  const password = String(body?.password || '').trim()

  if (!email || !isRole(roleValue)) {
    return NextResponse.json({ error: 'Valid email and role are required.' }, { status: 400 })
  }

  if (password && password.length < 8) {
    return NextResponse.json({ error: 'Temporary password must be at least 8 characters.' }, { status: 400 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)

  if (password) {
    const listed = await adminClient.auth.admin.listUsers()
    if (listed.error) {
      return NextResponse.json({ error: listed.error.message }, { status: 500 })
    }

    const existingUser = listed.data.users.find((user) => user.email?.toLowerCase() === email)

    if (existingUser) {
      const updateResult = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          role: roleValue,
          full_name: fullName || null,
        },
      })

      if (updateResult.error) {
        return NextResponse.json({ error: updateResult.error.message }, { status: 500 })
      }

      const { error: profileUpsertError } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: existingUser.id,
            email,
            full_name: fullName || null,
            role: roleValue,
          },
          { onConflict: 'id' }
        )

      if (profileUpsertError) {
        return NextResponse.json({ error: profileUpsertError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, mode: 'password_updated' })
    }

    const createResult = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: roleValue,
        full_name: fullName || null,
      },
    })

    if (createResult.error) {
      return NextResponse.json({ error: createResult.error.message }, { status: 500 })
    }

    const createdId = createResult.data.user?.id
    if (!createdId) {
      return NextResponse.json({ error: 'User created but no user id returned.' }, { status: 500 })
    }

    const { error: profileUpsertError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: createdId,
          email,
          full_name: fullName || null,
          role: roleValue,
        },
        { onConflict: 'id' }
      )

    if (profileUpsertError) {
      return NextResponse.json({ error: profileUpsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, mode: 'created_with_password' })
  }

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

  return NextResponse.json({ success: true, mode: 'invite_sent' })
}
