import { supabase } from './supabase'
import { Member, Attendance, Note, GameTag, MemberGameTag } from './types'

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
  trial_capacity_kids?: number | null
  trial_capacity_adults?: number | null
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

export interface ClassLogRow {
  id: string
  schedule_id: string
  date: string
  topic?: string | null
  content?: string | null
  teacher_id?: string | null
  teacher_name?: string | null
  attendees?: string[] | null
  created_at?: string
  updated_at?: string
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

// Trimmed variant for the Members list page — MembersTable only renders
// name/belt/status/payment/group/behavior, and opening a member always does
// its own separate getMemberById fetch for the full record, so the list
// never needs iban/nif/address/billing/emergency-contact/etc. per row.
export const getMembersForList = async (): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, email, phone, belt_level, status, payment_type, fee, date_of_birth, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as Member[]
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

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

export const getMemberByEmail = async (email: string): Promise<Member | null> => {
  const normalizedEmail = normalizeEmail(email)
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .ilike('email', normalizedEmail)
    .maybeSingle()

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

// Trimmed variant for the student portal (src/components/student/*) — those
// pages only read name/email/phone/belt_level/status/fee/date_of_birth, not
// the billing/IBAN/NIF/emergency-contact columns getMemberById also selects.
// Students aren't authenticated via real Supabase Auth (just a localStorage
// id, see studentSession.ts), so this also avoids shipping that data to a
// client that isn't a real authenticated session.
export const getStudentMemberById = async (id: string): Promise<Member | null> => {
  const { data, error } = await supabase
    .from('members')
    .select('id, name, email, phone, belt_level, status, fee, date_of_birth')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return (data as Member) || null
}

// Attendance
export const getAttendanceForMember = async (
  memberId: string,
  range?: { fromDateKey: string; toDateKey: string }
): Promise<Attendance[]> => {
  let query = supabase
    .from('attendance')
    .select('*')
    .eq('member_id', memberId)
    .order('date', { ascending: true })

  if (range) {
    query = query.gte('date', range.fromDateKey).lte('date', range.toDateKey)
  }

  const { data, error } = await query

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

// O Meu Jogo (game tags)
export const getGameTags = async (): Promise<GameTag[]> => {
  const { data, error } = await supabase
    .from('game_tags')
    .select('id, category, label, sort_order')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data || []
}

export const getMemberGame = async (memberId: string): Promise<MemberGameTag[]> => {
  const { data, error } = await supabase
    .from('member_game')
    .select('tag_id, priority, game_tags(category, label)')
    .eq('member_id', memberId)
    .order('priority', { ascending: true })

  if (error) throw error
  return (data || []).map((row: any) => ({
    tag_id: row.tag_id,
    priority: row.priority,
    category: row.game_tags.category,
    label: row.game_tags.label,
  }))
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

export const getKidBehaviorEvents = async ({
  fromDateKey,
  toDateKey,
  kidId,
}: {
  fromDateKey: string
  toDateKey: string
  // Scopes the query to one kid (e.g. a single member's profile page) instead
  // of pulling every kid's events for the date range and filtering client-side.
  kidId?: string
}): Promise<KidBehaviorEvent[]> => {
  let query = supabase
    .from('kid_behavior_events')
    .select('id, kid_id, date, value, coach_id, created_at, updated_at')
    .gte('date', fromDateKey)
    .lte('date', toDateKey)
    .order('date', { ascending: false })

  if (kidId) {
    query = query.eq('kid_id', kidId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase getKidBehaviorEvents failed', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fromDateKey,
      toDateKey,
      kidId,
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

  // Chaining .select() onto .upsert() returns the upserted rows directly —
  // this used to be a separate .in('code', codes) read straight after,
  // doubling the round trip every time the Schedule page mounted (it
  // unconditionally upserts the whole static weekly template on load).
  const { data, error } = await supabase
    .from('schedule_slots')
    .upsert(slots, { onConflict: 'code' })
    .select('id, code, day_of_week, start_time, end_time, program, kids_group, gi_type, tags, default_coach_id, trial_capacity_kids, trial_capacity_adults')

  if (error) throw error
  return (data || []) as ScheduleSlotRow[]
}

export const getScheduleSlotsByCodes = async (codes: string[]): Promise<ScheduleSlotRow[]> => {
  if (codes.length === 0) return []

  const { data, error } = await supabase
    .from('schedule_slots')
    .select('id, code, day_of_week, start_time, end_time, program, kids_group, gi_type, tags, default_coach_id, trial_capacity_kids, trial_capacity_adults')
    .in('code', codes)

  if (error) throw error
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

export const getClassLog = async (scheduleId: string, dateKey: string): Promise<ClassLogRow | null> => {
  const { data, error } = await supabase
    .from('class_logs')
    .select('*')
    .eq('schedule_id', scheduleId)
    .eq('date', dateKey)
    .maybeSingle()

  if (error) throw error
  return (data as ClassLogRow | null) || null
}

export const getClassLogsForSlotsAndDates = async (
  scheduleIds: string[],
  dateKeys: string[]
): Promise<ClassLogRow[]> => {
  if (scheduleIds.length === 0 || dateKeys.length === 0) return []

  const { data, error } = await supabase
    .from('class_logs')
    .select('*')
    .in('schedule_id', scheduleIds)
    .in('date', dateKeys)

  if (error) throw error
  return (data || []) as ClassLogRow[]
}

export const upsertClassLog = async (
  scheduleId: string,
  dateKey: string,
  payload: {
    topic?: string
    content: string
    teacher_id?: string | null
    teacher_name?: string | null
    attendees?: string[] | null
  }
): Promise<ClassLogRow> => {
  const { data, error } = await supabase
    .from('class_logs')
    .upsert(
      {
        schedule_id: scheduleId,
        date: dateKey,
        topic: payload.topic || null,
        content: payload.content,
        teacher_id: payload.teacher_id || null,
        teacher_name: payload.teacher_name || null,
        attendees: payload.attendees || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'schedule_id,date' }
    )
    .select('*')
    .single()

  if (error) throw error
  return data as ClassLogRow
}

// ─── Leads automation support ────────────────────────────────────────────────

export interface LeadStatusHistoryRow {
  id: string
  lead_id: string
  status: string
  changed_at: string
  changed_by?: string | null
}

export interface ReminderLogRow {
  id: string
  lead_id: string
  scheduled_for: string
  message: string
  sent: boolean
  channel: string
  created_at: string
}

export const logLeadStatusChange = async (
  leadId: string,
  status: string,
  changedBy?: string | null
): Promise<void> => {
  const { error } = await supabase.from('lead_status_history').insert({
    lead_id: leadId,
    status,
    changed_by: changedBy || null,
  })

  if (error) {
    console.error('Supabase logLeadStatusChange failed', { message: error.message, leadId, status })
    throw error
  }
}

// Trimmed variant for the Leads Kanban board — it only renders
// name/email/phone/contact_date/contact_source/class_type/next_contact_date/
// status, and opening a lead's edit drawer does its own separate getLeadById
// fetch for the full record (nif, morada, mensagem_inicial, trial_feedback,
// etc.), so the board never needs those wider columns per row.
export const getLeadsForList = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, email, phone, contact_date, contact_source, class_type, next_contact_date, status')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const getLeadById = async (id: string) => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data
}

export const getLeadStatusHistory = async (leadId: string): Promise<LeadStatusHistoryRow[]> => {
  const { data, error } = await supabase
    .from('lead_status_history')
    .select('*')
    .eq('lead_id', leadId)
    .order('changed_at', { ascending: true })

  if (error) throw error
  return (data || []) as LeadStatusHistoryRow[]
}

export const getTrialBookingsCount = async (scheduleId: string, dateKey: string): Promise<number> => {
  const { count, error } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('trial_schedule_id', scheduleId)
    .eq('trial_date', dateKey)

  if (error) throw error
  return count || 0
}

// Batched sibling of getTrialBookingsCount — the trial-booking picker used to
// fire one count-only query per candidate session (up to 12 in parallel).
// This fetches every matching row in one request and counts them client-side
// per (scheduleId, dateKey) pair instead.
export const getTrialBookingsCountsForSessions = async (
  sessions: Array<{ scheduleId: string; dateKey: string }>
): Promise<Map<string, number>> => {
  const counts = new Map<string, number>()
  if (sessions.length === 0) return counts

  const scheduleIds = Array.from(new Set(sessions.map((s) => s.scheduleId)))
  const dateKeys = Array.from(new Set(sessions.map((s) => s.dateKey)))

  const { data, error } = await supabase
    .from('leads')
    .select('trial_schedule_id, trial_date')
    .in('trial_schedule_id', scheduleIds)
    .in('trial_date', dateKeys)

  if (error) throw error

  ;(data || []).forEach((row: { trial_schedule_id: string | null; trial_date: string | null }) => {
    if (!row.trial_schedule_id || !row.trial_date) return
    const key = `${row.trial_schedule_id}:${row.trial_date}`
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  return counts
}

export const getRemindersForDate = async (dateKey: string): Promise<ReminderLogRow[]> => {
  const { data, error } = await supabase
    .from('reminders_log')
    .select('*')
    .eq('scheduled_for', dateKey)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []) as ReminderLogRow[]
}

export const insertReminderLog = async (payload: {
  lead_id: string
  scheduled_for: string
  message: string
  channel?: string
}): Promise<ReminderLogRow> => {
  const { data, error } = await supabase
    .from('reminders_log')
    .insert({
      lead_id: payload.lead_id,
      scheduled_for: payload.scheduled_for,
      message: payload.message,
      channel: payload.channel || 'whatsapp',
      sent: false,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as ReminderLogRow
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

// ─── Grupos Familiares ───────────────────────────────────────────────────────

export interface FamilyGroup {
  id: string
  name: string
  discount_per_member: number  // desconto em € por membro (ex: 5)
  created_at: string
}

/**
 * Listar todos os grupos familiares.
 * Requer a tabela `family_groups` no Supabase.
 */
export const getFamilyGroups = async (): Promise<FamilyGroup[]> => {
  const { data, error } = await supabase
    .from('family_groups')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.warn('family_groups table may not exist yet:', error.message)
    return []
  }
  return (data ?? []) as FamilyGroup[]
}

/**
 * Criar um novo grupo familiar.
 */
export const createFamilyGroup = async (params: {
  name: string
  discountPerMember: number
}): Promise<FamilyGroup> => {
  const { data, error } = await supabase
    .from('family_groups')
    .insert({ name: params.name, discount_per_member: params.discountPerMember })
    .select()
    .single()

  if (error) throw error
  return data as FamilyGroup
}

/**
 * Obter membros de um grupo familiar.
 */
export const getMembersByFamilyGroup = async (familyGroupId: string): Promise<Member[]> => {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('family_group_id', familyGroupId)
    .order('name', { ascending: true })

  if (error) {
    console.warn('Error fetching family group members:', error.message)
    return []
  }
  return (data ?? []) as Member[]
}