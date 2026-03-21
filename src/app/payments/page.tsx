'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import TeacherSidebar from '@/components/members/TeacherSidebar'
import { supabase } from '../../../lib/supabase'
import {
  applyDdSuccessPayment,
  createManualPayment,
  DdBatchItemRow,
  getCurrentMonthKey,
  getMembersForPayments,
  getOrCreateDdBatch,
  getPaymentsForMonth,
  getTodayDateKey,
  ignoreDdBatchItem,
  insertDdBatchItems,
  listDdBatchesForMonth,
  listDdBatchItems,
  mapDdBatchItemToMember,
  MemberPaymentView,
  PaymentMethod,
  PaymentRow,
  recomputeMemberPaidThrough,
  setDdFailedFlag,
  updateDdBatchItemPaymentLink,
  voidPayment,
} from '@/lib/payments'

type TabKey = 'unpaid' | 'paid' | 'dd'
type ParsedStatus = 'success' | 'failed'

interface ParsedDdRow {
  rawRow: Record<string, unknown>
  amount: number
  status: ParsedStatus
  reason: string | null
  memberId: string | null
  matchKey: string | null
}

interface MarkPaidFormState {
  memberId: string
  method: Exclude<PaymentMethod, 'DD'>
  amount: number
  month: string
  paidAt: string
  note: string
}

const normalizeText = (value: unknown): string => String(value || '').trim()
const normalizeEmail = (value: unknown): string => normalizeText(value).toLowerCase()
const normalizePhone = (value: unknown): string => normalizeText(value).replace(/\D/g, '')
const normalizeMemberStatus = (value: unknown): string => normalizeText(value).toLowerCase()

const isRequestMember = (member: MemberPaymentView): boolean => {
  const status = normalizeMemberStatus(member.status)
  const requestStatus = normalizeMemberStatus(member.request_status)
  return status === 'pending' || status === 'request' || requestStatus === 'pending' || requestStatus === 'request'
}

const normalizeStatus = (value: unknown): ParsedStatus => {
  const text = normalizeText(value).toLowerCase()
  if (!text) return 'failed'
  if (['success', 'successful', 'ok', 'paid', 'completed', 'approved'].some((token) => text.includes(token))) {
    return 'success'
  }
  return 'failed'
}

const parseAmount = (value: unknown): number => {
  const raw = normalizeText(value)
  if (!raw) return 0
  const normalized = raw.replace(/\./g, '').replace(',', '.')
  const amount = Number(normalized)
  return Number.isFinite(amount) ? amount : 0
}

const getCurrentMonthDay8 = (): Date => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 8)
}

const getOverdueDays = (): number => {
  const now = new Date()
  const day8 = getCurrentMonthDay8()
  if (now < day8) return 0
  const diffMs = now.getTime() - day8.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

const addMonths = (month: string, count: number): string => {
  const [yearRaw, monthRaw] = month.split('-')
  const year = Number(yearRaw)
  const monthIndex = Number(monthRaw) - 1
  const next = new Date(year, monthIndex + count, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

const toDatetimeLocalValue = (isoDate: string): string => `${isoDate}T12:00`

const extractRowValue = (row: Record<string, unknown>, candidates: string[]): unknown => {
  const keyMap = new Map<string, unknown>()
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase().replace(/[\s_\-]+/g, '')
    keyMap.set(normalizedKey, value)
  })

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLowerCase().replace(/[\s_\-]+/g, '')
    if (keyMap.has(normalizedCandidate)) return keyMap.get(normalizedCandidate)
  }

  return undefined
}

const resolveMemberMatch = (
  row: Record<string, unknown>,
  members: MemberPaymentView[]
): { memberId: string | null; matchKey: string | null; reason: string | null } => {
  const memberIdRaw = normalizeText(extractRowValue(row, ['member_id', 'memberid', 'id', 'student_id']))
  if (memberIdRaw) {
    const direct = members.find((member) => member.id === memberIdRaw)
    if (direct) return { memberId: direct.id, matchKey: 'member_id', reason: null }
  }

  const phone = normalizePhone(extractRowValue(row, ['phone', 'telefone', 'mobile', 'telemovel']))
  const email = normalizeEmail(extractRowValue(row, ['email', 'mail']))

  const phoneMatches = phone ? members.filter((member) => normalizePhone(member.phone) === phone) : []
  const emailMatches = email ? members.filter((member) => normalizeEmail(member.email) === email) : []

  const merged = new Map<string, MemberPaymentView>()
  phoneMatches.forEach((member) => merged.set(member.id, member))
  emailMatches.forEach((member) => merged.set(member.id, member))

  const matches = Array.from(merged.values())
  if (matches.length === 1) {
    if (phoneMatches.length === 1) return { memberId: matches[0].id, matchKey: 'phone', reason: null }
    return { memberId: matches[0].id, matchKey: 'email', reason: null }
  }

  if (matches.length > 1) {
    return { memberId: null, matchKey: null, reason: 'Multiple member matches found (phone/email).' }
  }

  return { memberId: null, matchKey: null, reason: 'Unmatched member (missing member_id/phone/email match).' }
}

const sumAmount = (rows: Array<{ amount: number }>): number => rows.reduce((total, row) => total + Number(row.amount || 0), 0)

const mapMethodLabel = (method: PaymentMethod): string => {
  if (method === 'TPA_CARD') return 'TPA'
  if (method === 'TPA_MBWAY') return 'TPA MBWAY'
  if (method === 'CASH') return 'Cash'
  return 'DD'
}

export default function PaymentsPage() {
  const currentMonth = getCurrentMonthKey()
  const todayIso = getTodayDateKey()

  const [activeTab, setActiveTab] = useState<TabKey>('unpaid')
  const [members, setMembers] = useState<MemberPaymentView[]>([])
  const [currentMonthPayments, setCurrentMonthPayments] = useState<PaymentRow[]>([])
  const [paidMonth, setPaidMonth] = useState(currentMonth)
  const [paidMonthPayments, setPaidMonthPayments] = useState<PaymentRow[]>([])
  const [latestBatchId, setLatestBatchId] = useState<string | null>(null)
  const [ddItems, setDdItems] = useState<DdBatchItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mappingByItemId, setMappingByItemId] = useState<Record<string, string>>({})

  const [markPaidForm, setMarkPaidForm] = useState<MarkPaidFormState>({
    memberId: '',
    method: 'TPA_CARD',
    amount: 0,
    month: currentMonth,
    paidAt: toDatetimeLocalValue(todayIso),
    note: '',
  })

  const paidMonthMemberMap = useMemo(() => {
    const map: Record<string, boolean> = {}
    currentMonthPayments.forEach((payment) => {
      if (payment.member_id && !payment.voided) map[payment.member_id] = true
    })
    return map
  }, [currentMonthPayments])

  const overdueDays = getOverdueDays()
  const showOverdueList = new Date().getDate() >= 8

  const refreshCore = useCallback(async () => {
    setLoading(true)
    setError(null)
    setErrorDismissed(false)

    try {
      const [membersData, monthPayments, monthBatches] = await Promise.all([
        getMembersForPayments(),
        getPaymentsForMonth(currentMonth),
        listDdBatchesForMonth(currentMonth),
      ])

      setMembers(membersData)
      setCurrentMonthPayments(monthPayments)

      const latestBatch = monthBatches[0] || null
      setLatestBatchId(latestBatch?.id || null)

      if (latestBatch) {
        const items = await listDdBatchItems(latestBatch.id)
        setDdItems(items)
      } else {
        setDdItems([])
      }
    } catch (fetchError) {
      console.error('PAYMENTS_FETCH_ERROR', fetchError)
      setError("Couldn't load payments. Retry")
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  const refreshPaidMonth = useCallback(async () => {
    try {
      const rows = await getPaymentsForMonth(paidMonth)
      setPaidMonthPayments(rows.filter((row) => !row.voided))
    } catch (fetchError) {
      console.error('PAYMENTS_FETCH_ERROR', fetchError)
      setError("Couldn't load payments. Retry")
      setErrorDismissed(false)
      setPaidMonthPayments([])
    }
  }, [paidMonth])

  useEffect(() => {
    refreshCore()
  }, [refreshCore])

  useEffect(() => {
    refreshPaidMonth()
  }, [refreshPaidMonth])

  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>()
    members.forEach((member) => {
      map.set(member.id, member.name)
    })
    return map
  }, [members])

  const unpaidRows = useMemo(() => {
    if (!showOverdueList) return []

    return members
      .filter((member) => !isRequestMember(member))
      .filter((member) => !member.dd)
      .filter((member) => !paidMonthMemberMap[member.id])
      .map((member) => ({ ...member, overdueDays }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [members, overdueDays, paidMonthMemberMap, showOverdueList])

  const activeMemberIds = useMemo(() => {
    const ids = new Set<string>()
    members.forEach((member) => {
      if (!isRequestMember(member)) {
        ids.add(member.id)
      }
    })
    return ids
  }, [members])

  const filteredPaidMonthPayments = useMemo(() => {
    return paidMonthPayments.filter((payment) => payment.member_id && activeMemberIds.has(payment.member_id))
  }, [paidMonthPayments, activeMemberIds])

  const unmatchedRows = useMemo(() => ddItems.filter((item) => !item.member_id && !item.ignored), [ddItems])

  const ddSummary = useMemo(() => {
    const activeItems = ddItems.filter((item) => !item.ignored)
    const successRows = activeItems.filter((item) => item.status === 'success')
    const failed = activeItems.filter((item) => item.status === 'failed')
    const unmatched = activeItems.filter((item) => !item.member_id)

    return {
      successCount: successRows.length,
      failedCount: failed.length,
      unmatchedCount: unmatched.length,
      successAmount: sumAmount(successRows.map((row) => ({ amount: Number(row.amount || 0) }))),
      failedAmount: sumAmount(failed.map((row) => ({ amount: Number(row.amount || 0) }))),
    }
  }, [ddItems])

  const kpi = useMemo(() => {
    const unpaidTotal = unpaidRows.reduce((total, row) => total + Number(row.amount_due || 0), 0)
    const paidTotal = sumAmount(filteredPaidMonthPayments.map((row) => ({ amount: Number(row.amount || 0) })))

    return {
      unpaidCount: unpaidRows.length,
      unpaidTotal,
      paidCount: filteredPaidMonthPayments.length,
      paidTotal,
      ddSuccessCount: ddItems.length > 0 ? ddSummary.successCount : null,
      ddSuccessTotal: ddItems.length > 0 ? ddSummary.successAmount : null,
      ddFailedCount: ddItems.length > 0 ? ddSummary.failedCount : null,
      ddFailedTotal: ddItems.length > 0 ? ddSummary.failedAmount : null,
    }
  }, [ddItems.length, ddSummary.failedAmount, ddSummary.failedCount, ddSummary.successAmount, ddSummary.successCount, unpaidRows, filteredPaidMonthPayments])

  const handleRetry = async () => {
    await Promise.all([refreshCore(), refreshPaidMonth()])
  }

  const handleOpenMarkPaid = (member: MemberPaymentView) => {
    setMarkPaidForm({
      memberId: member.id,
      method: 'TPA_CARD',
      amount: Number(member.amount_due || 0),
      month: currentMonth,
      paidAt: toDatetimeLocalValue(todayIso),
      note: '',
    })
    setShowMarkPaidModal(true)
  }

  const handleMarkPaidSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!markPaidForm.memberId) return

    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      await createManualPayment({
        memberId: markPaidForm.memberId,
        amount: Number(markPaidForm.amount || 0),
        month: markPaidForm.month,
        paidAt: new Date(markPaidForm.paidAt).toISOString(),
        method: markPaidForm.method,
        note: markPaidForm.note,
      })

      setShowMarkPaidModal(false)
      setMessage('Payment marked as paid successfully.')
      await Promise.all([refreshCore(), refreshPaidMonth()])
    } catch (submitError) {
      console.error('PAYMENTS_FETCH_ERROR', submitError)
      setError("Couldn't load payments. Retry")
      setErrorDismissed(false)
    } finally {
      setSubmitting(false)
    }
  }

  const applyDdEffectsForItem = async (item: DdBatchItemRow): Promise<void> => {
    if (!item.member_id) return

    if (item.status === 'success') {
      const { paymentId } = await applyDdSuccessPayment({
        batchItemId: item.id,
        memberId: item.member_id,
        month: currentMonth,
        amount: Number(item.amount || 0),
      })
      await updateDdBatchItemPaymentLink(item.id, paymentId)
      return
    }

    await setDdFailedFlag(item.member_id, currentMonth, true)
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const scanDdImage = async (file: File): Promise<Record<string, unknown>[]> => {
    try {
      const base64Data = await fileToBase64(file)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: file.type,
                    data: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: 'This is a Portuguese Direct Debit file. Extract all rows and return ONLY valid JSON array with no markdown, each row having: iban, swift, valor, tipo, ref, data, nome, nif',
                },
              ],
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to process image')
      }

      const data = await response.json()
      const content = data.content[0]?.text

      if (!content) {
        throw new Error('No response from API')
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('Could not extract data from image')
      }

      const extractedData = JSON.parse(jsonMatch[0])
      if (!Array.isArray(extractedData)) {
        throw new Error('Expected JSON array')
      }

      return extractedData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error processing image'
      throw new Error(errorMessage)
    }
  }

  const processDdRows = async (rawRows: Record<string, unknown>[]): Promise<ParsedDdRow[]> => {
    return rawRows.map((rawRow) => {
      const amount = parseAmount(extractRowValue(rawRow, ['amount', 'valor', 'montante']))
      const status = normalizeStatus(extractRowValue(rawRow, ['status', 'result', 'outcome']))
      const reasonRaw = normalizeText(extractRowValue(rawRow, ['reason', 'note', 'motivo', 'error']))
      const match = resolveMemberMatch(rawRow, members)

      return {
        rawRow,
        amount,
        status,
        reason: reasonRaw || match.reason,
        memberId: match.memberId,
        matchKey: match.matchKey,
      }
    })
  }

  const handleDdUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setMessage(null)

    try {
      const authResult = await supabase.auth.getUser()
      const uploadedBy = authResult.data.user?.id || null

      let rawRows: Record<string, unknown>[] = []

      // Check if file is an image or Excel
      if (file.type.startsWith('image/')) {
        // Process image with Anthropic API
        rawRows = await scanDdImage(file)
      } else {
        // Process Excel file
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
      }

      const parsedRows = await processDdRows(rawRows)

      const batch = await getOrCreateDdBatch({ month: currentMonth, fileName: file.name, uploadedBy })
      const inserted = await insertDdBatchItems(
        parsedRows.map((row) => ({
          batch_id: batch.id,
          member_id: row.memberId,
          match_key: row.matchKey,
          amount: row.amount,
          status: row.status,
          reason: row.reason,
          raw_row: row.rawRow,
          ignored: false,
          ignored_by: null,
          ignored_at: null,
          payment_id: null,
        }))
      )

      for (const item of inserted) {
        await applyDdEffectsForItem(item)
      }

      setLatestBatchId(batch.id)
      setMessage(`DD file processed: ${inserted.length} rows imported.`)
      await Promise.all([refreshCore(), refreshPaidMonth()])
    } catch (uploadError) {
      console.error('PAYMENTS_FETCH_ERROR', uploadError)
      setError("Couldn't load payments. Retry")
      setErrorDismissed(false)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleIgnoreItem = async (item: DdBatchItemRow) => {
    setError(null)

    try {
      await ignoreDdBatchItem({ id: item.id, ignored: true })

      if (item.status === 'success' && item.payment_id && item.member_id) {
        await voidPayment(item.payment_id)
        await updateDdBatchItemPaymentLink(item.id, null)
        await recomputeMemberPaidThrough(item.member_id)
      }

      if (item.status === 'failed' && item.member_id) {
        const otherFailed = ddItems.some(
          (row) => row.id !== item.id && row.member_id === item.member_id && row.status === 'failed' && !row.ignored
        )
        await setDdFailedFlag(item.member_id, currentMonth, otherFailed)
      }

      await Promise.all([refreshCore(), refreshPaidMonth()])
    } catch (ignoreError) {
      console.error('PAYMENTS_FETCH_ERROR', ignoreError)
      setError("Couldn't load payments. Retry")
      setErrorDismissed(false)
    }
  }

  const handleMapUnmatched = async (item: DdBatchItemRow) => {
    const selectedMemberId = mappingByItemId[item.id]
    if (!selectedMemberId) return

    setSubmitting(true)

    try {
      await mapDdBatchItemToMember({
        id: item.id,
        memberId: selectedMemberId,
        matchKey: 'manual',
        reason: item.reason,
      })

      await applyDdEffectsForItem({ ...item, member_id: selectedMemberId })
      await Promise.all([refreshCore(), refreshPaidMonth()])
    } catch (mapError) {
      console.error('PAYMENTS_FETCH_ERROR', mapError)
      setError("Couldn't load payments. Retry")
      setErrorDismissed(false)
    } finally {
      setSubmitting(false)
    }
  }

  const renderKpiCard = (title: string, count: string, amount: string) => (
    <article className="rounded-2xl border border-[#252525] bg-[#131313] p-4 shadow-[0_6px_20px_rgba(0,0,0,0.3)]">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-white">{count}</p>
      <p className="mt-1 text-sm text-zinc-300">{amount}</p>
    </article>
  )

  return (
    <div className="flex h-screen bg-[#0b0b0b]">
      <TeacherSidebar active="payments" />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-[#222] bg-[#0d0d0d] px-8 py-6">
          <h1 className="text-4xl font-bold text-white">Payments</h1>
          <p className="mt-1 text-sm text-zinc-500">Unpaid(Non-DD) and Direct Debit follow-up flow</p>
        </div>

        <div className="flex-1 overflow-auto p-8 space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={`kpi-skeleton-${index}`} className="h-[108px] animate-pulse rounded-2xl border border-[#252525] bg-[#131313]" />
                ))
              : (
                  <>
                    {renderKpiCard('Unpaid (Non-DD)', String(kpi.unpaidCount), `€${kpi.unpaidTotal.toFixed(2)}`)}
                    {renderKpiCard('Paid (This month)', String(kpi.paidCount), `€${kpi.paidTotal.toFixed(2)}`)}
                    {renderKpiCard(
                      'DD Success (This month)',
                      kpi.ddSuccessCount === null ? '—' : String(kpi.ddSuccessCount),
                      kpi.ddSuccessTotal === null ? '—' : `€${kpi.ddSuccessTotal.toFixed(2)}`
                    )}
                    {renderKpiCard(
                      'DD Failed (This month)',
                      kpi.ddFailedCount === null ? '—' : String(kpi.ddFailedCount),
                      kpi.ddFailedTotal === null ? '—' : `€${kpi.ddFailedTotal.toFixed(2)}`
                    )}
                  </>
                )}
          </section>

          {error && !errorDismissed ? (
            <section className="rounded-xl border border-[#7f1d1d] bg-[#450a0a]/40 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[#fecaca]">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRetry}
                    className="rounded-md border border-[#ef4444]/50 px-3 py-1 text-xs font-semibold text-[#fecaca] hover:bg-[#7f1d1d]/30"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => setErrorDismissed(true)}
                    className="rounded-md border border-[#2a2a2a] px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-[#161616]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {message ? (
            <div className="rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#22c55e]">{message}</div>
          ) : null}

          <div className="flex gap-2 border-b border-[#222]">
            <button
              onClick={() => setActiveTab('unpaid')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'unpaid' ? 'border-b-2 border-[#c81d25] text-white' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Unpaid
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'paid' ? 'border-b-2 border-[#c81d25] text-white' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => setActiveTab('dd')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'dd' ? 'border-b-2 border-[#c81d25] text-white' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Direct Debit
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <div className="h-11 animate-pulse rounded-xl bg-[#131313]" />
              <div className="h-11 animate-pulse rounded-xl bg-[#131313]" />
              <div className="h-11 animate-pulse rounded-xl bg-[#131313]" />
            </div>
          ) : null}

          {!loading && activeTab === 'unpaid' ? (
            <section className="rounded-2xl border border-[#222] bg-[#121212] p-6">
              <h2 className="text-xl font-semibold text-white">Unpaid(Non-DD)</h2>
              <p className="mt-1 text-xs text-zinc-500">Members without DD, unpaid this month ({currentMonth}), overdue after day 8.</p>

              {!showOverdueList ? (
                <div className="mt-4 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">
                  Overdue unpaid list becomes active on day 8 of the month.
                </div>
              ) : unpaidRows.length === 0 ? (
                <div className="mt-4 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">
                  No non-DD unpaid members for this month.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#222]">
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Member</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Amount due</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Overdue days</th>
                        <th className="px-4 py-3 text-right font-semibold text-zinc-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidRows.map((member) => (
                        <tr key={member.id} className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition">
                          <td className="px-4 py-3 font-medium text-white">{member.name}</td>
                          <td className="px-4 py-3 text-zinc-300">{member.type}</td>
                          <td className="px-4 py-3 text-white">€{Number(member.amount_due || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-[#ef4444]">{member.overdueDays}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleOpenMarkPaid(member)}
                              className="rounded-lg bg-[#c81d25] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b01720]"
                            >
                              Mark as paid
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {!loading && activeTab === 'paid' ? (
            <section className="rounded-2xl border border-[#222] bg-[#121212] p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Paid</h2>
                  <p className="mt-1 text-xs text-zinc-500">Payments recorded for selected month.</p>
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Month</label>
                  <input
                    type="month"
                    value={paidMonth}
                    onChange={(event) => setPaidMonth(event.target.value)}
                    className="rounded-lg border border-[#222] bg-[#121212] px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              {filteredPaidMonthPayments.length === 0 ? (
                <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">
                  No payments recorded for this month yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#222]">
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Member</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Method</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Paid at</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPaidMonthPayments.map((payment) => (
                        <tr key={payment.id} className="border-b border-[#0f0f0f] hover:bg-[#0f0f0f] transition">
                          <td className="px-4 py-3 font-medium text-white">
                            {payment.member_id ? memberNameMap.get(payment.member_id) || 'Unknown member' : 'Unknown member'}
                          </td>
                          <td className="px-4 py-3 text-white">€{Number(payment.amount || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-zinc-300">{mapMethodLabel(payment.method)}</td>
                          <td className="px-4 py-3 text-zinc-400">{new Date(payment.paid_at).toLocaleString('en-GB')}</td>
                          <td className="px-4 py-3 text-zinc-400">{payment.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {!loading && activeTab === 'dd' ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-[#222] bg-[#121212] p-6">
                <h2 className="mb-2 text-xl font-semibold text-white">Upload DD Result (.xlsx, .xls, or Image)</h2>
                <p className="mb-4 text-xs text-zinc-500">Upload imported direct debit result file (Excel or image) to create DD batch items. Images are processed with AI.</p>
                <input
                  type="file"
                  accept=".xlsx,.xls,image/"
                  onChange={handleDdUpload}
                  disabled={uploading}
                  className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-[#c81d25] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                {latestBatchId ? <p className="mt-2 text-xs text-zinc-500">Latest batch ID: {latestBatchId}</p> : null}
              </section>

              <section className="rounded-2xl border border-[#222] bg-[#121212] p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
                  <span>Success: {ddSummary.successCount}</span>
                  <span>•</span>
                  <span>Failed: {ddSummary.failedCount}</span>
                  <span>•</span>
                  <span>Unmatched: {ddSummary.unmatchedCount}</span>
                </div>

                <h3 className="mb-3 text-lg font-semibold text-white">DD Results</h3>
                {ddItems.length === 0 ? (
                  <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">No DD items yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#222]">
                          <th className="px-4 py-3 text-left font-semibold text-zinc-300">Member</th>
                          <th className="px-4 py-3 text-left font-semibold text-zinc-300">Amount</th>
                          <th className="px-4 py-3 text-left font-semibold text-zinc-300">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-zinc-300">Reason/Note</th>
                          <th className="px-4 py-3 text-left font-semibold text-zinc-300">Match</th>
                          <th className="px-4 py-3 text-right font-semibold text-zinc-300">Ignore</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ddItems.map((item) => {
                          const member = members.find((row) => row.id === item.member_id)
                          const isFailed = item.status === 'failed'
                          return (
                            <tr
                              key={item.id}
                              className={`border-b border-[#0f0f0f] ${isFailed ? 'bg-[#7f1d1d]/20' : 'hover:bg-[#0f0f0f]'} ${item.ignored ? 'opacity-60' : ''}`}
                            >
                              <td className="px-4 py-3 font-medium text-white">{member?.name || 'Unmatched'}</td>
                              <td className="px-4 py-3 text-white">€{Number(item.amount || 0).toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                    isFailed
                                      ? 'border-[#ef4444]/40 bg-[#ef4444]/20 text-[#fecaca]'
                                      : 'border-[#22c55e]/40 bg-[#22c55e]/20 text-[#bbf7d0]'
                                  }`}
                                >
                                  {item.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-zinc-300">{item.reason || '-'}</td>
                              <td className="px-4 py-3 text-zinc-400">{item.match_key || '-'}</td>
                              <td className="px-4 py-3 text-right">
                                {item.ignored ? (
                                  <span className="text-xs text-zinc-500">Ignored</span>
                                ) : (
                                  <button
                                    onClick={() => handleIgnoreItem(item)}
                                    className="rounded-md border border-[#ef4444]/50 px-2 py-1 text-xs font-semibold text-[#fecaca] hover:bg-[#7f1d1d]/30"
                                  >
                                    X
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[#222] bg-[#121212] p-6">
                <h3 className="mb-3 text-lg font-semibold text-white">Unmatched Rows</h3>
                {unmatchedRows.length === 0 ? (
                  <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">No unmatched rows.</div>
                ) : (
                  <div className="space-y-2">
                    {unmatchedRows.map((item) => (
                      <div key={item.id} className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] p-3">
                        <div className="mb-2 text-xs text-zinc-400">{item.reason || 'Unmatched row'}</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={mappingByItemId[item.id] || ''}
                            onChange={(event) =>
                              setMappingByItemId((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            className="min-w-[240px] rounded-lg border border-[#222] bg-[#121212] px-3 py-2 text-sm text-white"
                          >
                            <option value="">Select member</option>
                            {members.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleMapUnmatched(item)}
                            disabled={!mappingByItemId[item.id] || submitting}
                            className="rounded-lg bg-[#c81d25] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Map & apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </main>

      {showMarkPaidModal ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-[#222] bg-[#121212] p-6 shadow-2xl">
            <h2 className="mb-5 text-xl font-bold text-white">Mark as paid</h2>
            <form className="space-y-4" onSubmit={handleMarkPaidSubmit}>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Method</label>
                <select
                  value={markPaidForm.method}
                  onChange={(event) =>
                    setMarkPaidForm((prev) => ({
                      ...prev,
                      method: event.target.value as Exclude<PaymentMethod, 'DD'>,
                    }))
                  }
                  className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white"
                >
                  <option value="TPA_CARD">TPA_CARD</option>
                  <option value="TPA_MBWAY">TPA_MBWAY</option>
                  <option value="CASH">CASH</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={markPaidForm.amount}
                  onChange={(event) =>
                    setMarkPaidForm((prev) => ({
                      ...prev,
                      amount: Number(event.target.value || 0),
                    }))
                  }
                  className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Month</label>
                <select
                  value={markPaidForm.month}
                  onChange={(event) =>
                    setMarkPaidForm((prev) => ({
                      ...prev,
                      month: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white"
                >
                  <option value={addMonths(currentMonth, -1)}>{addMonths(currentMonth, -1)}</option>
                  <option value={currentMonth}>{currentMonth}</option>
                  <option value={addMonths(currentMonth, 1)}>{addMonths(currentMonth, 1)}</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Paid at</label>
                <input
                  type="datetime-local"
                  value={markPaidForm.paidAt}
                  onChange={(event) =>
                    setMarkPaidForm((prev) => ({
                      ...prev,
                      paidAt: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Note</label>
                <textarea
                  rows={2}
                  value={markPaidForm.note}
                  onChange={(event) =>
                    setMarkPaidForm((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white"
                />
              </div>

              <div className="flex gap-3 border-t border-[#222] pt-4">
                <button
                  type="button"
                  onClick={() => setShowMarkPaidModal(false)}
                  className="flex-1 rounded-lg border border-[#222] px-4 py-2.5 font-semibold text-white hover:bg-[#0f0f0f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#c81d25] px-4 py-2.5 font-semibold text-white hover:bg-[#b01720] disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
