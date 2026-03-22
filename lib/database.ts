import { supabase } from './supabase'
import { Member, Attendance, Note } from './types'

export type KidBehaviorValue = 'GOOD' | 'NEUTRAL' | 'BAD'

export interface KidBehaviorEvent {
  id?: string
  kid_id: string
  date: string
  value: KidBehaviorValue
  coach_id?: string | null
  created_at: string
  updated_at?: string
}

export interface CoachProfile {
  id: string
  full_name: string | null
  avatar_url?: string | null
  role?: string | null
}

export interface ScheduleSlotRow {
  id: string
  code: string
  day_of_week: string
  start_time: string
  end_time: string
  program: string
  kids_group?: string | null
  gi_type: string
  tags?: string[] | null
  default_coach_id?: string | null
}

export interface ClassPlanRow {
  id: string
  slot_id: string
  date: string
  topic?: string | null
  techniques?: string | null
  coach_primary_id?: string | null
  coach_secondary_id?: string | null
  updated_at?: string
  updated_by?: string | null
}

// Members
export const getMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const createMember = async (member: Omit<Member, 'id' | 'created_at'>): Promise<Member> => {
  const { data, error } = await supabase
    .from('members')
    .insert([member])
    .select()
    .single()

  if (error) {
    console.error('Supabase createMember insert failed', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload: member,
    })
    throw error
  }

  if (!data) {
    console.error('Supabase createMember insert returned no data', { payload: member })
    throw new Error('Failed to create member: no data returned from Supabase insert.')
  }

  return data
}

export const updateMember = async (id: string, updates: Partial<Member>): Promise<Member> => {
  const { data, error } = await supabase
    .from('members')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteMember = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export const getMemberByEmail = async (email: string): Promise<Member | null> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('email', email)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export const getMemberById = async (id: string): Promise<Member | null> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

// Attendance
export const getAttendanceForMember = async (memberId: string): Promise<Attendance[]> => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('member_id', memberId)
    .order('date', { ascending: true })

  if (error) throw error
  return data || []
}

export const setAttendance = async (memberId: string, date: string, attended: boolean): Promise<Attendance> => {
  // First, check if attendance record exists
  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('member_id', memberId)
    .eq('date', date)
    .single()

  if (existing) {
    // Update existing record
    const { data, error } = await supabase
      .from('attendance')
      .update({ attended })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new record
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        member_id: memberId,
        date,
        attended
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export const getAttendanceForDate = async (date: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('attendance')
    .select('member_id')
    .eq('date', date)
    .eq('attended', true)
    .order('member_id', { ascending: true })

  if (error) throw error
  return (data || []).map(row => row.member_id)
}

// Notes
export const getNotesForMember = async (memberId: string): Promise<Note[]> => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export const createNote = async (note: Omit<Note, 'id' | 'created_at'>): Promise<Note> => {
  const { data, error } = await supabase
    .from('notes')
    .insert(note)
    .select()
    .single()

  if (error) throw error
  return data
}

export const getRecentTeacherNotes = async (limit: number = 5): Promise<Note[]> => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export const upsertKidBehavior = async ({ kidId, dateKey, value, coachId }: { kidId: string; dateKey: string; value: KidBehaviorValue; coachId?: string }): Promise<KidBehaviorEvent> => {
  const { data, error } = await supabase
    .from('kid_behavior_events')
    .upsert(
      {
        kid_id: kidId,
        date: dateKey,
        value,
        coach_id: coachId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'kid_id,date' }
    )
    .select('id, kid_id, date, value, coach_id, created_at, updated_at')
    .single()

  if (error) {
    console.error('Supabase upsertKidBehavior failed', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      kidId,
      dateKey,
      value,
    })
    throw error
  }

  return data as KidBehaviorEvent
}

export const getKidBehaviorEvents = async ({ fromDateKey, toDateKey }: { fromDateKey: string; toDateKey: string }): Promise<KidBehaviorEvent[]> => {
  const { data, error } = await supabase
    .from('kid_behavior_events')
    .select('id, kid_id, date, value, coach_id, created_at, updated_at')
    .gte('date', fromDateKey)
    .lte('date', toDateKey)
    .order('date', { ascending: false })

  if (error) {
    console.error('Supabase getKidBehaviorEvents failed', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fromDateKey,
      toDateKey,
    })
    throw error
  }

  return (data || []) as KidBehaviorEvent[]
}

export const deleteKidBehaviorForDate = async ({ kidId, dateKey }: { kidId: string; dateKey: string }): Promise<void> => {
  const { error } = await supabase
    .from('kid_behavior_events')
    .delete()
    .eq('kid_id', kidId)
    .eq('date', dateKey)

  if (error) throw error
}

export const getCoachProfiles = async (): Promise<CoachProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role')
    .in('role', ['coach', 'admin'])
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Supabase getCoachProfiles failed', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }

  return (data || []) as CoachProfile[]
}

export const ensureScheduleSlots = async (
  slots: Array<Omit<ScheduleSlotRow, 'id'>>
): Promise<ScheduleSlotRow[]> => {
  if (slots.length === 0) return []

  const { error } = await supabase
    .from('schedule_slots')
    .upsert(slots, { onConflict: 'code' })

  if (error) throw error

  const codes = slots.map((slot) => slot.code)
  const { data, error: readError } = await supabase
    .from('schedule_slots')
    .select('id, code, day_of_week, start_time, end_time, program, kids_group, gi_type, tags, default_coach_id')
    .in('code', codes)

  if (readError) throw readError
  return (data || []) as ScheduleSlotRow[]
}

export const getClassPlan = async (slotId: string, dateKey: string): Promise<ClassPlanRow | null> => {
  const { data, error } = await supabase
    .from('class_plans')
    .select('*')
    .eq('slot_id', slotId)
    .eq('date', dateKey)
    .maybeSingle()

  if (error) throw error
  return (data as ClassPlanRow | null) || null
}

export const getClassPlansForSlotsAndDates = async (
  slotIds: string[],
  dateKeys: string[]
): Promise<ClassPlanRow[]> => {
  if (slotIds.length === 0 || dateKeys.length === 0) return []

  const { data, error } = await supabase
    .from('class_plans')
    .select('*')
    .in('slot_id', slotIds)
    .in('date', dateKeys)

  if (error) throw error
  return (data || []) as ClassPlanRow[]
}

export const upsertClassPlan = async (
  slotId: string,
  dateKey: string,
  payload: {
    topic?: string
    techniques?: string
    coach_primary_id: string
    coach_secondary_id?: string | null
    updated_by?: string | null
  }
): Promise<ClassPlanRow> => {
  const { data, error } = await supabase
    .from('class_plans')
    .upsert(
      {
        slot_id: slotId,
        date: dateKey,
        topic: payload.topic || null,
        techniques: payload.techniques || null,
        coach_primary_id: payload.coach_primary_id,
        coach_secondary_id: payload.coach_secondary_id || null,
        updated_by: payload.updated_by || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slot_id,date' }
    )
    .select('*')
    .single()

  if (error) throw error
  return data as ClassPlanRow
}

export interface UnpaidPaymentRecord {
  id: string
  name: string
  amount: number
  dueDate: string
  overdueDays?: number
}

export const getUnpaidPayments = async (limit?: number): Promise<UnpaidPaymentRecord[]> => {
  const { data: members, error } = await supabase
    .from('members')
    .select('id, name, paid_through')
    .order('paid_through', { ascending: true })

  if (error) {
    console.error('Supabase getUnpaidPayments failed', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const unpaid = (members || [])
    .filter((member) => {
      if (!member.paid_through) return true
      const paidThrough = new Date(member.paid_through)
      paidThrough.setHours(23, 59, 59, 999)
      return paidThrough < today
    })
    .map((member) => {
      const paidThrough = member.paid_through ? new Date(member.paid_through) : new Date(2000, 0, 1)
      paidThrough.setHours(0, 0, 0, 0)
      const daysOverdue = Math.floor((today.getTime() - paidThrough.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        id: member.id,
        name: member.name,
        amount: 0,
        dueDate: paidThrough.toISOString().split('T')[0],
        overdueDays: Math.max(0, daysOverdue),
      }
    })

  return limit ? unpaid.slice(0, limit) : unpaid
}