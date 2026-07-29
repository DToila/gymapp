import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getTrialSlotsForAge,
  getUpcomingSessionDatesForSlot,
  isKidsProgram,
  toLocalDateKey,
} from '@/components/leads/leadAutomation'

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

const SESSIONS_PER_SLOT = 4
const MAX_SESSIONS = 12

// Public, unauthenticated endpoint (used by the /register trial-booking step)
// — runs with the service-role key server-side, same reasoning as
// /api/public/register-lead: the visitor has no Supabase session.
export async function GET(request: Request) {
  const env = getEnv()
  if ('error' in env) {
    console.error('trial-availability: missing env', env.error)
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const age = Number(searchParams.get('age'))
  if (!Number.isFinite(age) || age < 0) {
    return NextResponse.json({ error: 'Idade inválida.' }, { status: 400 })
  }

  const slots = getTrialSlotsForAge(age)
  if (slots.length === 0) {
    return NextResponse.json({ sessions: [] })
  }

  const codes = slots.map((slot) => slot.id)
  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)

  const { data: slotRows, error: slotRowsError } = await adminClient
    .from('schedule_slots')
    .select('id, code, program, kids_group, trial_capacity_kids, trial_capacity_adults')
    .in('code', codes)

  if (slotRowsError) {
    console.error('trial-availability: fetch slots failed', slotRowsError)
    return NextResponse.json({ error: slotRowsError.message }, { status: 500 })
  }

  const slotRowByCode = new Map((slotRows || []).map((row) => [row.code, row]))
  const today = toLocalDateKey(new Date())

  const upcoming = slots.flatMap((slot) => getUpcomingSessionDatesForSlot(slot, SESSIONS_PER_SLOT))
  upcoming.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey)
    return a.slot.startTime.localeCompare(b.slot.startTime)
  })
  const trimmed = upcoming.slice(0, MAX_SESSIONS)

  const rowIds = trimmed
    .map((session) => slotRowByCode.get(session.slot.id)?.id)
    .filter((id): id is string => Boolean(id))

  const { data: bookings, error: bookingsError } = await adminClient
    .from('leads')
    .select('trial_schedule_id, trial_date')
    .in('trial_schedule_id', rowIds.length > 0 ? rowIds : ['00000000-0000-0000-0000-000000000000'])
    .gte('trial_date', today)

  if (bookingsError) {
    console.error('trial-availability: fetch bookings failed', bookingsError)
    return NextResponse.json({ error: bookingsError.message }, { status: 500 })
  }

  const bookedCountByKey = new Map<string, number>()
  ;(bookings || []).forEach((row) => {
    const key = `${row.trial_schedule_id}|${row.trial_date}`
    bookedCountByKey.set(key, (bookedCountByKey.get(key) || 0) + 1)
  })

  const sessions = trimmed
    .map((session) => {
      const row = slotRowByCode.get(session.slot.id)
      if (!row) return null

      const capacity = isKidsProgram(session.slot.program as any)
        ? row.trial_capacity_kids ?? null
        : row.trial_capacity_adults ?? null
      const booked = bookedCountByKey.get(`${row.id}|${session.dateKey}`) || 0

      return {
        slotCode: session.slot.id,
        program: session.slot.program,
        kidsGroup: session.slot.kidsGroup || null,
        dayOfWeek: session.slot.dayOfWeek,
        dateKey: session.dateKey,
        dateLabel: session.dateLabel,
        startTime: session.slot.startTime,
        endTime: session.slot.endTime,
        capacity,
        booked,
        full: capacity !== null && booked >= capacity,
      }
    })
    .filter((session): session is NonNullable<typeof session> => session !== null)

  return NextResponse.json({ sessions })
}
