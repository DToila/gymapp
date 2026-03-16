import { supabase } from './supabase'
import { Member, Attendance, Note } from './types'

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