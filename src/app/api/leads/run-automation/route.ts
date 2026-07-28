import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../../lib/supabaseServer'
import { runDailyLeadAutomation } from '@/components/leads/leadAutomation'

type AppRole = 'admin' | 'staff' | 'coach'

const isRole = (value: unknown): value is AppRole =>
  value === 'admin' || value === 'staff' || value === 'coach'

async function ensureStaffOrAdmin() {
  const serverClient = createSupabaseServerClient()
  const { data: userData } = await serverClient.auth.getUser()
  const user = userData?.user

  if (!user) {
    return { error: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile } = await serverClient.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const metadataRole =
    (user.user_metadata as { role?: unknown } | null)?.role ?? (user.app_metadata as { role?: unknown } | null)?.role

  const role = (isRole(profile?.role) ? profile?.role : null) || (isRole(metadataRole) ? metadataRole : null)

  if (role !== 'admin' && role !== 'staff') {
    return { error: NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }) }
  }

  return { user }
}

export async function POST() {
  const access = await ensureStaffOrAdmin()
  if ('error' in access) return access.error

  try {
    const result = await runDailyLeadAutomation()
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    console.error('run-lead-automation failed', error)
    return NextResponse.json({ ok: false, error: error?.message || 'Unknown error' }, { status: 500 })
  }
}
