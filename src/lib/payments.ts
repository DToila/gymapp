import { supabase } from '../../lib/supabase'
import { calculateMonthlyFee, getAgeFromDateOfBirth, Member } from '../../lib/types'

export type PaymentMethod = 'DD' | 'TPA_CARD' | 'TPA_MBWAY' | 'CASH'
export type DdItemStatus = 'success' | 'failed'

export interface PaymentRow {
  id: string
  member_id: string | null
  amount: number
  method: PaymentMethod
  payment_month: string
  paid_at: string
  note: string | null
  dd_batch_item_id: string | null
  voided: boolean
  voided_at: string | null
  created_at: string
}

export interface DdBatchRow {
  id: string
  month: string
  file_name: string | null
  uploaded_by: string | null
  created_at: string
}

export interface DdBatchItemRow {
  id: string
  batch_id: string
  member_id: string | null
  match_key: string | null
  amount: number
  status: DdItemStatus
  reason: string | null
  raw_row: Record<string, unknown> | null
  ignored: boolean
  ignored_by: string | null
  ignored_at: string | null
  payment_id: string | null
  created_at: string
}

export interface MemberPaymentView {
  id: string
  name: string
  phone?: string
  email?: string
  type: 'Adult' | 'Kids'
  status?: 'Active' | 'Paused' | 'Unpaid' | 'Pending' | null
  dd: boolean
  amount_due: number
  paid_through?: string | null
  dd_failed_this_month?: boolean
  dd_failed_month?: string | null
}

const LOCAL_STORAGE_KEY = 'gymapp.payments.localState'

interface LocalPaymentsState {
  payments: PaymentRow[]
  batches: DdBatchRow[]
  batchItems: DdBatchItemRow[]
  memberOverrides: Record<string, { paid_through?: string | null; dd_failed_this_month?: boolean; dd_failed_month?: string | null }>
}

const emptyLocalState = (): LocalPaymentsState => ({
  payments: [],
  batches: [],
  batchItems: [],
  memberOverrides: {},
})

const parseMaybeNumber = (value: unknown, fallback: number): number => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const isPaymentsTableMissingError = (error: { message?: string; code?: string } | null | undefined): boolean => {
  if (!error) return false
  if (error.code === 'PGRST205') return true
  const message = error.message || ''
  return (
    message.includes("Could not find the table 'public.payments'") ||
    message.includes("Could not find the table 'public.dd_batches'") ||
    message.includes("Could not find the table 'public.dd_batch_items'") ||
    message.includes('relation "payments" does not exist') ||
    message.includes('relation "dd_batches" does not exist') ||
    message.includes('relation "dd_batch_items" does not exist')
  )
}

const readLocalState = (): LocalPaymentsState => {
  if (typeof window === 'undefined') return emptyLocalState()

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return emptyLocalState()
    const parsed = JSON.parse(raw) as LocalPaymentsState
    return {
      payments: parsed?.payments || [],
      batches: parsed?.batches || [],
      batchItems: parsed?.batchItems || [],
      memberOverrides: parsed?.memberOverrides || {},
    }
  } catch {
    return emptyLocalState()
  }
}

const writeLocalState = (state: LocalPaymentsState): void => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
}

const uid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const monthToEndDate = (month: string): string => {
  const [yearRaw, monthRaw] = month.split('-')
  const year = Number(yearRaw)
  const monthIndex = Number(monthRaw) - 1
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return new Date().toISOString().slice(0, 10)
  }

  const date = new Date(year, monthIndex + 1, 0)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const toMonthKey = (date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const todayIsoDate = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getMemberType = (member: Member): 'Adult' | 'Kids' => {
  const age = getAgeFromDateOfBirth(member.date_of_birth)
  return age !== null && age < 16 ? 'Kids' : 'Adult'
}

export const getMembersForPayments = async (): Promise<MemberPaymentView[]> => {
  let { data, error } = await supabase
    .from('members')
    .select('id, name, phone, email, status, payment_type, fee, date_of_birth, paid_through, dd_failed_this_month, dd_failed_month')
    .order('name', { ascending: true })

  if (error) {
    const message = error.message || ''
    const missingMemberColumns =
      message.includes('paid_through') ||
      message.includes('dd_failed_this_month') ||
      message.includes('dd_failed_month')

    if (!missingMemberColumns) {
      throw error
    }

    const retry = await supabase
      .from('members')
      .select('id, name, phone, email, status, payment_type, fee, date_of_birth')
      .order('name', { ascending: true })

    if (retry.error) throw retry.error
    data = retry.data as typeof data
  }

  const local = readLocalState()

  return ((data || []) as Array<Member & { paid_through?: string | null; dd_failed_this_month?: boolean; dd_failed_month?: string | null }>)
    .map((member) => {
      const localOverride = local.memberOverrides[member.id] || {}
      const paymentType = String(member.payment_type || '').toLowerCase()
      const dd = paymentType.includes('direct') || paymentType === 'dd'
      const monthlyFee = parseMaybeNumber(member.fee, calculateMonthlyFee(member.date_of_birth, member.payment_type))
      return {
        id: member.id,
        name: member.name,
        phone: member.phone,
        email: member.email,
        status: member.status,
        type: getMemberType(member),
        dd,
        amount_due: monthlyFee,
        paid_through: localOverride.paid_through ?? member.paid_through ?? null,
        dd_failed_this_month: localOverride.dd_failed_this_month ?? member.dd_failed_this_month ?? false,
        dd_failed_month: localOverride.dd_failed_month ?? member.dd_failed_month ?? null,
      }
    })
}

export const getPaymentsForMonth = async (month: string): Promise<PaymentRow[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('payment_month', month)
    .eq('voided', false)

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error
    const local = readLocalState()
    return local.payments.filter((payment) => payment.payment_month === month && !payment.voided)
  }

  return (data || []) as PaymentRow[]
}

export const createManualPayment = async (params: {
  memberId: string
  amount: number
  month: string
  paidAt: string
  method: Exclude<PaymentMethod, 'DD'>
  note?: string
}): Promise<PaymentRow> => {
  const payload = {
    member_id: params.memberId,
    amount: params.amount,
    method: params.method,
    payment_month: params.month,
    paid_at: params.paidAt,
    note: params.note || null,
  }

  const { data, error } = await supabase
    .from('payments')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error

    const local = readLocalState()
    const row: PaymentRow = {
      id: uid(),
      member_id: params.memberId,
      amount: params.amount,
      method: params.method,
      payment_month: params.month,
      paid_at: params.paidAt,
      note: params.note || null,
      dd_batch_item_id: null,
      voided: false,
      voided_at: null,
      created_at: new Date().toISOString(),
    }
    local.payments.push(row)
    local.memberOverrides[params.memberId] = {
      ...(local.memberOverrides[params.memberId] || {}),
      paid_through: monthToEndDate(params.month),
      dd_failed_this_month: false,
      dd_failed_month: null,
    }
    writeLocalState(local)
    return row
  }

  return data as PaymentRow
}

export const updateMemberPaidThrough = async (memberId: string, paidThrough: string | null): Promise<void> => {
  const { error } = await supabase
    .from('members')
    .update({ paid_through: paidThrough })
    .eq('id', memberId)

  if (error) {
    const local = readLocalState()
    local.memberOverrides[memberId] = {
      ...(local.memberOverrides[memberId] || {}),
      paid_through: paidThrough,
    }
    writeLocalState(local)
  }
}

export const setDdFailedFlag = async (memberId: string, month: string, failed: boolean): Promise<void> => {
  const payload = {
    dd_failed_this_month: failed,
    dd_failed_month: failed ? month : null,
  }

  const { error } = await supabase
    .from('members')
    .update(payload)
    .eq('id', memberId)

  if (error) {
    const local = readLocalState()
    local.memberOverrides[memberId] = {
      ...(local.memberOverrides[memberId] || {}),
      dd_failed_this_month: failed,
      dd_failed_month: failed ? month : null,
    }
    writeLocalState(local)
  }
}

export const getOrCreateDdBatch = async (params: { month: string; fileName: string; uploadedBy?: string | null }): Promise<DdBatchRow> => {
  const existing = await supabase
    .from('dd_batches')
    .select('*')
    .eq('month', params.month)
    .eq('file_name', params.fileName)
    .maybeSingle()

  if (!existing.error && existing.data) return existing.data as DdBatchRow

  if (existing.error && !isPaymentsTableMissingError(existing.error)) {
    throw existing.error
  }

  const { data, error } = await supabase
    .from('dd_batches')
    .insert({
      month: params.month,
      file_name: params.fileName,
      uploaded_by: params.uploadedBy || null,
    })
    .select('*')
    .single()

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error

    const local = readLocalState()
    const row: DdBatchRow = {
      id: uid(),
      month: params.month,
      file_name: params.fileName,
      uploaded_by: params.uploadedBy || null,
      created_at: new Date().toISOString(),
    }
    local.batches.push(row)
    writeLocalState(local)
    return row
  }

  return data as DdBatchRow
}

export const insertDdBatchItems = async (items: Array<Omit<DdBatchItemRow, 'id' | 'created_at'>>): Promise<DdBatchItemRow[]> => {
  const { data, error } = await supabase
    .from('dd_batch_items')
    .insert(items)
    .select('*')

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error
    const local = readLocalState()
    const rows = items.map((item) => ({
      ...item,
      id: uid(),
      created_at: new Date().toISOString(),
    }))
    local.batchItems.push(...rows)
    writeLocalState(local)
    return rows
  }

  return (data || []) as DdBatchItemRow[]
}

export const listDdBatchItems = async (batchId: string): Promise<DdBatchItemRow[]> => {
  const { data, error } = await supabase
    .from('dd_batch_items')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error
    return readLocalState().batchItems.filter((item) => item.batch_id === batchId)
  }

  return (data || []) as DdBatchItemRow[]
}

export const listDdBatchesForMonth = async (month: string): Promise<DdBatchRow[]> => {
  const { data, error } = await supabase
    .from('dd_batches')
    .select('*')
    .eq('month', month)
    .order('created_at', { ascending: false })

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error
    return readLocalState().batches.filter((batch) => batch.month === month).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  return (data || []) as DdBatchRow[]
}

export const mapDdBatchItemToMember = async (params: {
  id: string
  memberId: string
  matchKey?: string | null
  reason?: string | null
}): Promise<void> => {
  const payload = {
    member_id: params.memberId,
    match_key: params.matchKey || null,
    reason: params.reason || null,
  }

  const { error } = await supabase
    .from('dd_batch_items')
    .update(payload)
    .eq('id', params.id)

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error
    const local = readLocalState()
    local.batchItems = local.batchItems.map((item) => (item.id === params.id ? { ...item, ...payload } : item))
    writeLocalState(local)
  }
}

export const applyDdSuccessPayment = async (params: {
  batchItemId: string
  memberId: string
  month: string
  amount: number
}): Promise<{ paymentId: string }> => {
  const existing = await supabase
    .from('payments')
    .select('id')
    .eq('member_id', params.memberId)
    .eq('method', 'DD')
    .eq('payment_month', params.month)
    .eq('voided', false)
    .maybeSingle()

  let paymentId: string | null = null

  if (!existing.error && existing.data?.id) {
    paymentId = existing.data.id
  } else {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        member_id: params.memberId,
        amount: params.amount,
        method: 'DD',
        payment_month: params.month,
        paid_at: new Date().toISOString(),
        dd_batch_item_id: params.batchItemId,
      })
      .select('id')
      .single()

    if (error) {
      if (!isPaymentsTableMissingError(error)) throw error
      const local = readLocalState()
      const rowId = uid()
      local.payments.push({
        id: rowId,
        member_id: params.memberId,
        amount: params.amount,
        method: 'DD',
        payment_month: params.month,
        paid_at: new Date().toISOString(),
        note: null,
        dd_batch_item_id: params.batchItemId,
        voided: false,
        voided_at: null,
        created_at: new Date().toISOString(),
      })
      local.memberOverrides[params.memberId] = {
        ...(local.memberOverrides[params.memberId] || {}),
        paid_through: monthToEndDate(params.month),
        dd_failed_this_month: false,
        dd_failed_month: null,
      }
      writeLocalState(local)
      return { paymentId: rowId }
    }

    paymentId = data.id
  }

  if (!paymentId) {
    throw new Error('Unable to create or resolve DD success payment')
  }

  await updateMemberPaidThrough(params.memberId, monthToEndDate(params.month))
  await setDdFailedFlag(params.memberId, params.month, false)

  return { paymentId }
}

export const updateDdBatchItemPaymentLink = async (batchItemId: string, paymentId: string | null): Promise<void> => {
  const { error } = await supabase
    .from('dd_batch_items')
    .update({ payment_id: paymentId })
    .eq('id', batchItemId)

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error
    const local = readLocalState()
    local.batchItems = local.batchItems.map((item) => (item.id === batchItemId ? { ...item, payment_id: paymentId } : item))
    writeLocalState(local)
  }
}

export const ignoreDdBatchItem = async (params: { id: string; ignoredBy?: string | null; ignored: boolean }): Promise<void> => {
  const updatePayload = params.ignored
    ? { ignored: true, ignored_by: params.ignoredBy || null, ignored_at: new Date().toISOString() }
    : { ignored: false, ignored_by: null, ignored_at: null }

  const { error } = await supabase
    .from('dd_batch_items')
    .update(updatePayload)
    .eq('id', params.id)

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error
    const local = readLocalState()
    local.batchItems = local.batchItems.map((item) =>
      item.id === params.id
        ? {
            ...item,
            ignored: Boolean(updatePayload.ignored),
            ignored_by: (updatePayload as { ignored_by?: string | null }).ignored_by || null,
            ignored_at: (updatePayload as { ignored_at?: string | null }).ignored_at || null,
          }
        : item
    )
    writeLocalState(local)
  }
}

export const voidPayment = async (paymentId: string): Promise<void> => {
  const payload = { voided: true, voided_at: new Date().toISOString() }
  const { error } = await supabase
    .from('payments')
    .update(payload)
    .eq('id', paymentId)

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error
    const local = readLocalState()
    local.payments = local.payments.map((payment) => (payment.id === paymentId ? { ...payment, ...payload } : payment))
    writeLocalState(local)
  }
}

export const recomputeMemberPaidThrough = async (memberId: string): Promise<void> => {
  const { data, error } = await supabase
    .from('payments')
    .select('payment_month')
    .eq('member_id', memberId)
    .eq('voided', false)

  if (error) {
    if (!isPaymentsTableMissingError(error)) throw error
    const local = readLocalState()
    const activeMonths = local.payments
      .filter((payment) => payment.member_id === memberId && !payment.voided)
      .map((payment) => payment.payment_month)
      .sort()

    const latestMonth = activeMonths.length ? activeMonths[activeMonths.length - 1] : null
    local.memberOverrides[memberId] = {
      ...(local.memberOverrides[memberId] || {}),
      paid_through: latestMonth ? monthToEndDate(latestMonth) : null,
    }
    writeLocalState(local)
    return
  }

  const months = ((data || []) as Array<{ payment_month: string }>).map((row) => row.payment_month).sort()
  const latestMonth = months.length ? months[months.length - 1] : null
  await updateMemberPaidThrough(memberId, latestMonth ? monthToEndDate(latestMonth) : null)
}

export const getCurrentMonthKey = (): string => toMonthKey(new Date())

export const getTodayDateKey = (): string => todayIsoDate()
