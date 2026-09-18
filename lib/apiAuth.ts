import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from './supabaseServer'

export type AppRole = 'admin' | 'staff' | 'coach'

export const isAppRole = (value: unknown): value is AppRole =>
  value === 'admin' || value === 'staff' || value === 'coach'

const roleFromMetadata = (metadata: unknown): AppRole | null => {
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as { role?: unknown }).role
  return isAppRole(value) ? value : null
}

const roleFromUser = (user: { user_metadata?: unknown; app_metadata?: unknown }): AppRole | null =>
  roleFromMetadata(user.user_metadata) || roleFromMetadata(user.app_metadata)

// Server-side session + role check for API routes, mirroring the role
// resolution in middleware.ts (profiles.role first, falling back to auth
// metadata for accounts created before the profiles table existed). Route
// protection at the middleware layer keeps the page from rendering, but
// someone could still hit these endpoints directly (curl, fetch from
// devtools) bypassing the UI entirely — this is the check that stops that.
export async function requireRole(allowedRoles: AppRole[]) {
  const serverClient = createSupabaseServerClient()
  const { data: userData } = await serverClient.auth.getUser()
  const user = userData?.user

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await serverClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = (isAppRole(profile?.role) ? profile?.role : null) || roleFromUser(user)

  if (!role || !allowedRoles.includes(role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { user, role }
}
