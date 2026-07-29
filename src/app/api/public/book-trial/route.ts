import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { officialSchedule } from '@/components/student/studentData'
import { isKidsProgram } from '@/components/leads/leadAutomation'
import { syncToGoogleCalendar } from '../../../../../lib/googleCalendar'

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

// Public, unauthenticated endpoint — books a trial-class slot chosen on the
// /register trial-booking step. Runs with the service-role key for the same
// reason as /api/public/register-lead (no visitor session to authenticate).
export async function POST(request: Request) {
  const env = getEnv()
  if ('error' in env) {
    console.error('book-trial: missing env', env.error)
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const leadId = String(body.leadId || '').trim()
  const slotCode = String(body.slotCode || '').trim()
  const dateKey = String(body.dateKey || '').trim()

  if (!leadId || !slotCode || !dateKey) {
    return NextResponse.json({ error: 'Dados de marcação incompletos.' }, { status: 400 })
  }

  const officialSlot = officialSchedule.find((slot) => slot.id === slotCode)
  if (!officialSlot) {
    return NextResponse.json({ error: 'Sessão inválida.' }, { status: 400 })
  }

  const adminClient = createClient(env.supabaseUrl, env.serviceRoleKey)

  const { data: slotRow, error: slotRowError } = await adminClient
    .from('schedule_slots')
    .select('id, trial_capacity_kids, trial_capacity_adults')
    .eq('code', slotCode)
    .maybeSingle()

  if (slotRowError || !slotRow) {
    console.error('book-trial: slot row not found', slotRowError)
    return NextResponse.json({ error: 'Sessão não encontrada.' }, { status: 404 })
  }

  const capacity = isKidsProgram(officialSlot.program as any)
    ? slotRow.trial_capacity_kids ?? null
    : slotRow.trial_capacity_adults ?? null

  const { count: booked, error: countError } = await adminClient
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('trial_schedule_id', slotRow.id)
    .eq('trial_date', dateKey)

  if (countError) {
    console.error('book-trial: count failed', countError)
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  if (capacity !== null && (booked || 0) >= capacity) {
    return NextResponse.json({ error: 'Sessão cheia. Escolhe outra sessão.' }, { status: 409 })
  }

  const { data: leadRow, error: leadFetchError } = await adminClient
    .from('leads')
    .select('id, name')
    .eq('id', leadId)
    .maybeSingle()

  if (leadFetchError || !leadRow) {
    return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 })
  }

  const { error: updateError } = await adminClient
    .from('leads')
    .update({
      trial_schedule_id: slotRow.id,
      trial_date: dateKey,
      status: 'Aula agendada',
    })
    .eq('id', leadId)

  if (updateError) {
    console.error('book-trial: update failed', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await adminClient.from('lead_status_history').insert([
    { lead_id: leadId, status: 'Aula agendada', changed_by: null },
  ])

  await syncToGoogleCalendar({
    leadId,
    leadName: leadRow.name,
    scheduleId: slotRow.id,
    date: dateKey,
    time: `${officialSlot.startTime}-${officialSlot.endTime}`,
  })

  return NextResponse.json({
    success: true,
    dateKey,
    startTime: officialSlot.startTime,
    endTime: officialSlot.endTime,
  })
}
