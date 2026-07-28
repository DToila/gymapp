import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '../../../../../lib/supabaseServer'

type AppRole = 'admin' | 'staff' | 'coach'

type AdminUser = {
  id: string
  email: string | null
  full_name: string | null
  role: AppRole
  created_at: string
}

const isRole = (value: string): value is AppRole => {
  return value === 'admin' || value === 'staff' || value === 'coach'
}

const roleFromMetadata = (metadata: unknown): AppRole | null => {
  if (!metadata || typeof metadata !== 'object') return null
  const roleValue = (metadata as { role?: unknown }).role
  if (typeof roleValue === 'string' && isRole(roleValue)) {
    return roleValue
  }
  return null
}

const roleFromUser = (user: { user_metadata?: unknown; app_metadata?: unknown }): AppRole | null => {
  return roleFromMetadata(user.user_metadata) || roleFromMetadata(user.app_metadata)
}

const fullNameFromUser = (user: { user_metadata?: unknown; app_metadata?: unknown }): string | null => {
  return fullNameFromMetadata(user.user_metadata) || fullNameFromMetadata(user.app_metadata)
}

const fullNameFromMetadata = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== 'object') return null
  const fullNameValue = (metadata as { full_name?: unknown }).full_name
  return typeof fullNameValue === 'string' && fullNameValue.trim() ? fullNameValue : null
}

const isProfilesTableMissingError = (error: { message?: string; code?: string } | null | undefined): boolean => {
  if (!error) return false
  if (error.code === 'PGRST205') return true
  const msg = error.message || ''
  return msg.includes("Could not find the table 'public.profiles'") || msg.includes('relation "profiles" does not exist')
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

  const profileRole = profile?.role && isRole(profile.role) ? profile.role : null
  const metadataRole = roleFromUser(user)
  const effectiveRole = profileRole || metadataRole

  if (profileError && !isProfilesTableMissingError(profileError)) {
    return { error: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }

  if (effectiveRole !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

const findUserByEmail = async (adminClient: any, email: string) => {
  const listed = await adminClient.auth.admin.listUsers()
  if (listed.error) {
    return { error: listed.error.message }
  }

  const existingUser = listed.data.users.find((user: { email?: string | null }) => user.email?.toLowerCase() === email)
  return { existingUser }
}

const upsertProfile = async (
  adminClient: any,
  params: { id: string; email: string; fullName: string; role: AppRole }
) => {
  const profilePayload = {
    id: params.id,
    email: params.email,
    full_name: params.fullName || null,
    role: params.role,
  }

  const { error } = await (adminClient.from('profiles') as any).upsert(profilePayload, { onConflict: 'id' })

  if (error && !isProfilesTableMissingError(error)) {
    return { error: error.message }
  }

  return {}
}

const normalizeEmail = (value: string) => value.trim().toLowerCase()

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
    if (!isProfilesTableMissingError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const listed = await adminClient.auth.admin.listUsers()
    if (listed.error) {
      return NextResponse.json({ error: listed.error.message }, { status: 500 })
    }

    const fallbackItems: AdminUser[] = (listed.data.users || []).map((user) => ({
      id: user.id,
      email: user.email || null,
      full_name: fullNameFromUser(user),
      role: roleFromUser(user) || 'coach',
      created_at: user.created_at || new Date().toISOString(),
    }))

    return NextResponse.json({ items: fallbackItems })
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
  const email = normalizeEmail(String(body?.email || ''))
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
    const lookup = await findUserByEmail(adminClient, email)
    if ('error' in lookup) {
      return NextResponse.json({ error: lookup.error }, { status: 500 })
    }

    const existingUser = lookup.existingUser

    if (existingUser) {
      const updateResult = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        app_metadata: { role: roleValue },
        user_metadata: { role: roleValue, full_name: fullName || null },
      })

      if (updateResult.error) {
        return NextResponse.json({ error: updateResult.error.message }, { status: 500 })
      }

      const profileUpsert = await upsertProfile(adminClient, {
        id: existingUser.id,
        email,
        fullName,
        role: roleValue as AppRole,
      })

      if ('error' in profileUpsert) {
        return NextResponse.json({ error: profileUpsert.error }, { status: 500 })
      }

      return NextResponse.json({ success: true, mode: 'password_updated' })
    }

    const createResult = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: roleValue },
      user_metadata: { role: roleValue, full_name: fullName || null },
    })

    if (createResult.error) {
      return NextResponse.json({ error: createResult.error.message }, { status: 500 })
    }

    const createdId = createResult.data.user?.id
    if (!createdId) {
      return NextResponse.json({ error: 'User created but no user id returned.' }, { status: 500 })
    }

    const profileUpsert = await upsertProfile(adminClient, {
      id: createdId,
      email,
      fullName,
      role: roleValue as AppRole,
    })

    if ('error' in profileUpsert) {
      return NextResponse.json({ error: profileUpsert.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, mode: 'created_with_password' })
  }

  const invite = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      role: roleValue,
      full_name: fullName || null,
    },
    redirectTo: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login` : undefined,
  })

  if (invite.error) {
    return NextResponse.json({ error: invite.error.message }, { status: 500 })
  }

  const invitedUserId = invite.data.user?.id
  if (!invitedUserId) {
    return NextResponse.json({ error: 'Invite sent but no user id returned.' }, { status: 500 })
  }

  const profileUpsert = await upsertProfile(adminClient, {
    id: invitedUserId,
    email,
    fullName,
    role: roleValue as AppRole,
  })

  if ('error' in profileUpsert) {
    return NextResponse.json({ error: profileUpsert.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, mode: 'invite_sent' })
}

export async function PUT(request: Request) {
  const env = getEnv()
  if ('error' in env) {
    return NextResponse.json({ error: env.error }, { status: 500 })
  }

  const access = await ensureAdmin()
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  const email = normalizeEmail(String(body?.email || ''))
  const roleValue = String(body?.role || '').trim()
  const fullName = String(body?.fullName || '').trim()
  const password = String(body?.password || '').trim()
  const targetId = String(body?.id || '').trim()

  if (!email || !isRole(roleValue)) {
    return NextResponse.json({ error: 'Valid email and role are required.' }, { status: 400 })
  }

  if (password && password.length < 8) {
    return NextResponse.json({ error: 'Temporary password must be at least 8 characters.' }, { status: 400 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)
  const lookup = await findUserByEmail(adminClient, email)
  if ('error' in lookup) {
    return NextResponse.json({ error: lookup.error }, { status: 500 })
  }

  const existingUser = lookup.existingUser

  if (existingUser) {
    const updates: Parameters<typeof adminClient.auth.admin.updateUserById>[1] = {
      app_metadata: { role: roleValue },
      user_metadata: { role: roleValue, full_name: fullName || null },
    }

    if (password) {
      updates.password = password
      updates.email_confirm = true
    }

    const updateResult = await adminClient.auth.admin.updateUserById(existingUser.id, updates)

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 })
    }

    const profileUpsert = await upsertProfile(adminClient, {
      id: existingUser.id,
      email,
      fullName,
      role: roleValue as AppRole,
    })

    if ('error' in profileUpsert) {
      return NextResponse.json({ error: profileUpsert.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, mode: 'updated' })
  }

  if (targetId) {
    const profileUpsert = await upsertProfile(adminClient, {
      id: targetId,
      email,
      fullName,
      role: roleValue as AppRole,
    })

    if ('error' in profileUpsert) {
      return NextResponse.json({ error: profileUpsert.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, mode: 'updated' })
  }

  return NextResponse.json({ error: 'No matching user found to update.' }, { status: 404 })
}

export async function DELETE(request: Request) {
  const env = getEnv()
  if ('error' in env) {
    return NextResponse.json({ error: env.error }, { status: 500 })
  }

  const access = await ensureAdmin()
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  const email = normalizeEmail(String(body?.email || ''))
  const targetId = String(body?.id || '').trim()

  if (!email && !targetId) {
    return NextResponse.json({ error: 'An email or id is required.' }, { status: 400 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)
  const lookup = await findUserByEmail(adminClient, email)
  if ('error' in lookup) {
    return NextResponse.json({ error: lookup.error }, { status: 500 })
  }

  const existingUser = lookup.existingUser
  const resolvedId = existingUser?.id || targetId

  if (resolvedId && resolvedId === access.user.id) {
    return NextResponse.json({ error: 'You cannot remove your own access.' }, { status: 403 })
  }

  if (resolvedId) {
    try {
      await adminClient.auth.admin.deleteUser(resolvedId)
    } catch {
      // Ignore delete errors and just remove the profile row if it exists.
    }
  }

  if (resolvedId) {
    const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('id', resolvedId)
    if (profileDeleteError && !isProfilesTableMissingError(profileDeleteError)) {
      return NextResponse.json({ error: profileDeleteError.message }, { status: 500 })
    }
  }

  if (email && !resolvedId) {
    const { error: profileDeleteError } = await adminClient.from('profiles').delete().eq('email', email)
    if (profileDeleteError && !isProfilesTableMissingError(profileDeleteError)) {
      return NextResponse.json({ error: profileDeleteError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
