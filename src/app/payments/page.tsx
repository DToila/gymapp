'use client'

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import TeacherSidebar from '@/components/members/TeacherSidebar'
import { supabase } from '../../../lib/supabase'
import {
  applyDdSuccessPayment,
  createManualPayment,
  deleteDdBatch,
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
  resetPaidCounterForMonth,
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
  return status === 'pendente' || status === 'pedido' || requestStatus === 'pendente' || requestStatus === 'pedido'
}

const normalizeStatus = (value: unknown): ParsedStatus => {
  const text = normalizeText(value).toLowerCase()
  // If no status field exists (common in DD files), default to 'success' for processing
  if (!text) return 'success'
  if (['success', 'successful', 'ok', 'paid', 'completed', 'approved'].some((token) => text.includes(token))) {
    return 'success'
  }
  return 'failed'
}

const parseAmount = (value: unknown): number => {
  const raw = normalizeText(value)
  if (!raw) return 0
  
  let normalized = raw
  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')
  
  // Handle both European (65,5) and US (65.5) formats intelligently
  if (hasComma && hasDot) {
    // Both present: last separator is the decimal separator
    const lastCommaIndex = normalized.lastIndexOf(',')
    const lastDotIndex = normalized.lastIndexOf('.')
    
    if (lastCommaIndex > lastDotIndex) {
      // European format (1.234,56): comma is decimal, dots are thousands
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      // US format (1,234.56): dot is decimal, commas are thousands
      normalized = normalized.replace(/,/g, '')
    }
  } else if (hasComma) {
    // Only comma: European decimal separator (65,5)
    normalized = normalized.replace(',', '.')
  } else if (hasDot) {
    // Only dot: check if it's thousands separator or decimal
    const dotCount = (normalized.match(/\./g) || []).length
    if (dotCount > 1) {
      // Multiple dots = thousands separators, remove them
      normalized = normalized.replace(/\./g, '')
    }
    // Single dot stays as decimal separator
  }
  
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

const normalizeIban = (value: unknown): string => normalizeText(value).replace(/\s+/g, '').toUpperCase()
const normalizeNif = (value: unknown): string => normalizeText(value).replace(/\s+/g, '').toUpperCase()

const resolveMemberMatch = (
  row: Record<string, unknown>,
  members: MemberPaymentView[]
): { memberId: string | null; matchKey: string | null; reason: string | null } => {
  // Log member inventory once (only on first row where we try NIF/IBAN)
  const memberIbansWithValues = members.filter(m => m.iban).map(m => `${m.name}:${normalizeIban(m.iban)}`)
  const memberNifsWithValues = members.filter(m => m.nif).map(m => `${m.name}:${normalizeNif(m.nif)}`)
  if (memberIbansWithValues.length === 0 && memberNifsWithValues.length === 0) {
    console.warn('⚠️ WARNING: Não members have IBAN or NIF values in database!')
  }
  
  const memberIdRaw = normalizeText(extractRowValue(row, ['member_id', 'memberid', 'id', 'student_id']))
  if (memberIdRaw) {
    const direct = members.find((member) => member.id === memberIdRaw)
    if (direct) return { memberId: direct.id, matchKey: 'member_id', reason: null }
  }

  // Try NIF matching FIRST (most specific to individual, not shared like IBAN)
  const nif = normalizeNif(extractRowValue(row, ['nif', 'contribuinte']))
  if (nif) {
    const nifMatch = members.find((member) => normalizeNif(member.nif) === nif)
    if (nifMatch) {
      console.log(`✓ NIF match found: ${nif} -> ${nifMatch.name}`)
      return { memberId: nifMatch.id, matchKey: 'nif', reason: null }
    }
    const availableNifs = members.filter(m => m.nif).map(m => normalizeNif(m.nif)).filter(Boolean)
    console.log(`✗ NIF "${nif}" not in database (${availableNifs.length} members have NIF values)`)
    if (availableNifs.length > 0 && availableNifs.length <= 5) {
      console.log(`   Available NIFs: ${availableNifs.join(', ')}`)
    }
  } else {
    console.log(`ℹ️ Row has no NIF field`)
  }

  // Try IBAN matching SECOND (can be shared by family members, so less specific than NIF)
  const iban = normalizeIban(extractRowValue(row, ['iban']))
  if (iban) {
    const ibanMatch = members.find((member) => normalizeIban(member.iban) === iban)
    if (ibanMatch) {
      console.log(`✓ IBAN match found: ${iban} -> ${ibanMatch.name}`)
      return { memberId: ibanMatch.id, matchKey: 'iban', reason: null }
    }
    const availableIbans = members.filter(m => m.iban).map(m => normalizeIban(m.iban)).filter(Boolean)
    console.log(`✗ IBAN "${iban}" not in database (${availableIbans.length} members have IBAN values)`)
    if (availableIbans.length > 0 && availableIbans.length <= 5) {
      console.log(`   Available IBANs: ${availableIbans.join(', ')}`)
    }
  } else {
    console.log(`ℹ️ Row has no IBAN field`)
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

  console.log(`✗ Não match found for row:`, row)
  return { memberId: null, matchKey: null, reason: 'Não Correspondido member (missing member_id/iban/nif/phone/email match).' }
}

const sumAmount = (rows: Array<{ amount: number }>): number => rows.reduce((total, row) => total + Number(row.amount || 0), 0)

const mapMethodLabel = (method: PaymentMethod): string => {
  if (method === 'TPA_CARD') return 'TPA'
  if (method === 'TPA_MBWAY') return 'TPA MBWAY'
  if (method === 'CASH') return 'Dinheiro'
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
      setError("Não foi possível carregar pagamentos. Tenta novamente")
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
      setError("Não foi possível carregar pagamentos. Tenta novamente")
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
    // Only show non-DD payments in 'Pago' tab (DD payments show separately in 'DD Sucesso')
    return paidMonthPayments.filter(
      (payment) => payment.member_id && activeMemberIds.has(payment.member_id) && payment.method !== 'DD'
    )
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
      setError("Não foi possível carregar pagamentos. Tenta novamente")
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
      console.log(`🖼️ A processar imagem via API: ${file.name}`)
      const base64Data = await fileToBase64(file)
      console.log(`✓ Image converted to base64 (${base64Data.length} chars)`)

      const response = await fetch('/api/scan-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64Data,
          fileType: 'image',
          mimeType: file.type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.error || `HTTP ${response.status}`
        console.error('❌ Image API error:', errorMsg)
        throw new Error(errorMsg)
      }

      const { data: extractedData } = await response.json()

      if (!Array.isArray(extractedData) || extractedData.length === 0) {
        console.error('❌ Image API returned invalid array')
        throw new Error('Não data rows found in image')
      }

      console.log(`✅ Image extracted ${extractedData.length} rows successfully`)
      console.log('   First row keys:', Object.keys(extractedData[0] || {}))
      console.log('   First row sample:', extractedData[0])

      return extractedData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro processing image'
      console.error(`❌ Image processing failed: ${errorMessage}`)
      throw new Error(errorMessage)
    }
  }

  const scanDdPdf = async (file: File): Promise<Record<string, unknown>[]> => {
    try {
      console.log(`📄 Processing PDF via API: ${file.name}`)
      const base64Data = await fileToBase64(file)
      console.log(`✓ PDF converted to base64 (${base64Data.length} chars)`)

      const response = await fetch('/api/scan-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64Data,
          fileType: 'pdf',
          mimeType: 'application/pdf',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = errorData.error || `HTTP ${response.status}`
        console.error('❌ PDF API error:', errorMsg)
        throw new Error(errorMsg)
      }

      const { data: extractedData } = await response.json()

      if (!Array.isArray(extractedData) || extractedData.length === 0) {
        console.error('❌ PDF API returned invalid array')
        throw new Error('Não data rows found in PDF')
      }

      console.log(`✅ PDF extracted ${extractedData.length} rows successfully`)
      console.log('   First row keys:', Object.keys(extractedData[0] || {}))
      console.log('   First row sample:', extractedData[0])

      return extractedData
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro processing PDF'
      console.error(`❌ PDF processing failed: ${errorMessage}`)
      throw new Error(errorMessage)
    }
  }

  const processDdRows = async (rawRows: Record<string, unknown>[]): Promise<ParsedDdRow[]> => {
    const loggedFirst = new WeakSet<Record<string, unknown>>()
    
    return rawRows.map((rawRow, idx) => {
      // Log first row details to diagnose extraction issues
      if (!loggedFirst.has(rawRow)) {
        loggedFirst.add(rawRow)
        if (idx === 0) {
          console.log(`📊 First extracted row (${rawRows.length} total):`)
          console.log('   Fields present:', Object.keys(rawRow))
          console.log('   Sample data:', rawRow)
          console.log('   NIF value:', rawRow.nif, `(type: ${typeof rawRow.nif})`)
          console.log('   IBAN value:', rawRow.iban, `(type: ${typeof rawRow.iban})`)
          console.log('   Estado value:', rawRow.status, `(type: ${typeof rawRow.status})`)
        }
      }
      
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
      console.log(`\n📤 Starting file upload: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`)
      const authResult = await supabase.auth.getUser()
      const uploadedBy = authResult.data.user?.id || null

      let rawRows: Record<string, unknown>[] = []

      // Check if file is an image, PDF, or Excel
      if (file.type.startsWith('image/')) {
        // Process image with Anthropic API
        console.log('🖼️ Processing as image...')
        rawRows = await scanDdImage(file)
      } else if (file.type === 'application/pdf') {
        // Process PDF with Anthropic API
        console.log('📄 Processing as PDF...')
        rawRows = await scanDdPdf(file)
      } else {
        // Process Excel file
        console.log('📊 Processing as Excel...')
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' })
        console.log(`✓ Excel extracted ${rawRows.length} rows`)
      }

      const parsedRows = await processDdRows(rawRows)
      const matched = parsedRows.filter(r => r.memberId)
      const unmatched = parsedRows.filter(r => !r.memberId)
      
      console.log(`\n✅ Carregar Processing Summary:`)
      console.log(`   Total rows extracted: ${parsedRows.length}`)
      console.log(`   Matched to members: ${matched.length} (${((matched.length / parsedRows.length) * 100).toFixed(1)}%)`)
      console.log(`   Não Correspondido rows: ${unmatched.length}`)
      console.log(`   Sucesso status: ${parsedRows.filter(r => r.status === 'success').length}`)
      console.log(`   Falhado status: ${parsedRows.filter(r => r.status === 'failed').length}`)

      // Debug: Log members and their IBAN/NIF
      const membersWithIbanNif = members.filter(m => m.iban || m.nif)
      console.log(`\n👥 Database Membros:`)
      console.log(`   Total members: ${members.length}`)
      console.log(`   With IBAN/NIF: ${membersWithIbanNif.length}`)
      if (membersWithIbanNif.length === 0) {
        console.warn(`   ⚠️ WARNING: Não members have IBAN or NIF populated!`)
      }
      membersWithIbanNif.slice(0, 5).forEach(m => {
        console.log(`   - ${m.name}: IBAN=${m.iban || '(empty)'}, NIF=${m.nif || '(empty)'}`)
      })

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
      const successMsg = matched.length > 0 
        ? `DD file processed: ${inserted.length} rows imported, ${matched.length} matched to members.` 
        : `DD file processed: ${inserted.length} rows imported, but ${unmatched.length} could not be matched. Check member IBAN/NIF data.`
      setMessage(successMsg)
      await Promise.all([refreshCore(), refreshPaidMonth()])
    } catch (uploadError) {
      const errorMsg = uploadError instanceof Error ? uploadError.message : 'Unknown error processing file'
      console.error('File processing error:', errorMsg, uploadError)
      setError(`Erro: ${errorMsg}. Please try again or use a different file.`)
      setErrorDismissed(false)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const handleClearDdData = async () => {
    if (!latestBatchId) return
    
    try {
      setError(null)
      console.log(`🗑️ Deleting DD batch: ${latestBatchId}`)
      await deleteDdBatch(latestBatchId)
      
      setLatestBatchId(null)
      setDdItems([])
      setMappingByItemId({})
      setMessage('DD batch deleted and payment effects reversed.')
      console.log('✅ Batch deleted, payments voided, and counters refreshed')
      
      // Atualizar core data to update payment counters
      await Promise.all([refreshCore(), refreshPaidMonth()])
    } catch (deleteError) {
      const errorMsg = deleteError instanceof Error ? deleteError.message : 'Unknown error deleting batch'
      console.error('❌ Erro deleting batch:', errorMsg)
      setError(`Erro deleting batch: ${errorMsg}`)
    }
  }

  const handleResetPaidCounter = async () => {
    // Confirmar before resetting
    const confirmed = window.confirm('Tens a certeza you want to reset the paid counter to 0 for this month? This will delete all payments.')
    if (!confirmed) return

    try {
      setError(null)
      console.log(`🔄 Resetting paid counter for month: ${paidMonth}`)
      await resetPaidCounterForMonth(paidMonth)
      
      setMessage('Pago counter reset to 0. Todos payments for this month have been deleted.')
      console.log('✅ Pago counter reset successfully')
      
      // Atualizar data
      await Promise.all([refreshCore(), refreshPaidMonth()])
    } catch (resetError) {
      const errorMsg = resetError instanceof Error ? resetError.message : 'Unknown error resetting counter'
      console.error('❌ Erro resetting counter:', errorMsg)
      setError(`Erro resetting counter: ${errorMsg}`)
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
      setError("Não foi possível carregar pagamentos. Tenta novamente")
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
      setError("Não foi possível carregar pagamentos. Tenta novamente")
      setErrorDismissed(false)
    } finally {
      setSubmitting(false)
    }
  }

  const renderKpiCard = (title: string, count: string, amount: string, accent: 'neutral' | 'warning' | 'danger' | 'success' = 'neutral') => {
    const barColors = { neutral: 'bg-blue-500', warning: 'bg-amber-500', danger: 'bg-red-500', success: 'bg-green-500' };
    const valueColors = { neutral: 'text-white', warning: 'text-[#f59e0b]', danger: 'text-[#ef4444]', success: 'text-[#22c55e]' };
    return (
      <article className="relative overflow-hidden rounded-xl border border-[#1e1e1e] bg-[#161616] p-5">
        <div className={`absolute left-0 top-0 h-full w-[3px] ${barColors[accent]}`} />
        <p className={`text-4xl font-black leading-none ${valueColors[accent]}`}>{count}</p>
        <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wide">{title}</p>
        <p className="mt-1 text-sm text-zinc-400">{amount}</p>
      </article>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0b0b0b]">
      <TeacherSidebar ativo="payments" />

      <main className="flex-1 p-3 sm:p-5 lg:p-7 space-y-5">
        {/* Hero */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium uppercase tracking-widest text-zinc-500 capitalize sm:text-xs">
              {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="text-4xl font-black leading-tight text-white">
              Gestão de <span className="text-[#c81d25]">Pagamentos</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Por Pagar e Débito Direto</p>
          </div>
        </header>

        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={`kpi-skeleton-${index}`} className="h-[108px] animate-pulse rounded-2xl border border-[#252525] bg-[#131313]" />
                ))
              : (
                  <>
                    {renderKpiCard('Por Pagar (Non-DD)', String(kpi.unpaidCount), `€${kpi.unpaidTotal.toFixed(2)}`, 'warning')}
                    {renderKpiCard('Pago (Este mês)', String(kpi.paidCount), `€${kpi.paidTotal.toFixed(2)}`, 'success')}
                    {renderKpiCard(
                      'DD Sucesso (Este mês)',
                      kpi.ddSuccessCount === null ? '—' : String(kpi.ddSuccessCount),
                      kpi.ddSuccessTotal === null ? '—' : `€${kpi.ddSuccessTotal.toFixed(2)}`,
                      'neutral'
                    )}
                    {renderKpiCard(
                      'DD Falhado (Este mês)',
                      kpi.ddFailedCount === null ? '—' : String(kpi.ddFailedCount),
                      kpi.ddFailedTotal === null ? '—' : `€${kpi.ddFailedTotal.toFixed(2)}`,
                      'danger'
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
                    Tentar novamente
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
              Por Pagar
            </button>
            <button
              onClick={() => setActiveTab('paid')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'paid' ? 'border-b-2 border-[#c81d25] text-white' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Pago
            </button>
            <button
              onClick={() => setActiveTab('dd')}
              className={`px-4 py-3 font-medium transition ${
                activeTab === 'dd' ? 'border-b-2 border-[#c81d25] text-white' : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Débito Direto
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
              <h2 className="text-xl font-semibold text-white">Por Pagar(Non-DD)</h2>
              <p className="mt-1 text-xs text-zinc-500">Membros without DD, unpaid this month ({currentMonth}), overdue after day 8.</p>

              {!showOverdueList ? (
                <div className="mt-4 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">
                  Vencido unpaid list becomes ativo on day 8 of the month.
                </div>
              ) : unpaidRows.length === 0 ? (
                <div className="mt-4 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">
                  Não non-DD unpaid members for this month.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#222]">
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Membro</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Type</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Valor due</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Vencido days</th>
                        <th className="px-4 py-3 text-right font-semibold text-zinc-300">Ações</th>
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
                  <h2 className="text-xl font-semibold text-white">Pago</h2>
                  <p className="mt-1 text-xs text-zinc-500">Pagamentos recorded for selected month.</p>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Month</label>
                    <input
                      type="month"
                      value={paidMonth}
                      onChange={(event) => setPaidMonth(event.target.value)}
                      className="rounded-lg border border-[#222] bg-[#121212] px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <button
                    onClick={handleResetPaidCounter}
                    disabled={uploading}
                    className="rounded-lg border border-[#7f1d1d] bg-[#1a0202] px-4 py-2 text-sm font-medium text-[#fecaca] hover:bg-[#7f1d1d]/30 disabled:opacity-50"
                  >
                    🔄 Reset to 0
                  </button>
                </div>
              </div>

              {filteredPaidMonthPayments.length === 0 ? (
                <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">
                  Não payments recorded for this month yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#222]">
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Membro</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Valor</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Método</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Pago at</th>
                        <th className="px-4 py-3 text-left font-semibold text-zinc-300">Notas</th>
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
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="mb-2 text-xl font-semibold text-white">Carregar DD Result (.xlsx, .xls, .pdf, or Image)</h2>
                    <p className="mb-4 text-xs text-zinc-500">Carregar imported direct debit result file (Excel, PDF, or image) to create DD batch items. Files are processed with AI.</p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.pdf,image/"
                      onChange={handleDdUpload}
                      disabled={uploading}
                      className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2 text-sm text-zinc-200 file:mr-3 file:rounded-md file:border-0 file:bg-[#c81d25] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                    />
                    {latestBatchId ? <p className="mt-2 text-xs text-zinc-500">Latest batch ID: {latestBatchId}</p> : null}
                  </div>
                  {ddItems.length > 0 ? (
                    <button
                      onClick={handleClearDdData}
                      disabled={uploading}
                      className="rounded-lg border border-[#ef4444]/50 px-3 py-2 text-xs font-semibold text-[#fecaca] hover:bg-[#7f1d1d]/30 transition disabled:opacity-60 whitespace-nowrap"
                      title="Clear all uploaded data"
                    >
                      Limpar ficheiro ✕
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-[#222] bg-[#121212] p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
                  <span>Sucesso: {ddSummary.successCount}</span>
                  <span>•</span>
                  <span>Falhado: {ddSummary.failedCount}</span>
                  <span>•</span>
                  <span>Não Correspondido: {ddSummary.unmatchedCount}</span>
                </div>

                <h3 className="mb-3 text-lg font-semibold text-white">DD Results</h3>
                {ddItems.length === 0 ? (
                  <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">Não DD items yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#222] bg-[#121212]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#222]">
                          <th className="px-4 py-3 text-left font-semibold text-zinc-300">Membro</th>
                          <th className="px-4 py-3 text-left font-semibold text-zinc-300">Valor</th>
                          <th className="px-4 py-3 text-left font-semibold text-zinc-300">Estado</th>
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
                              <td className="px-4 py-3 font-medium text-white">{member?.name || 'Não Correspondido'}</td>
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
                <h3 className="mb-3 text-lg font-semibold text-white">Não Correspondido Rows</h3>
                {unmatchedRows.length === 0 ? (
                  <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">Não unmatched rows.</div>
                ) : (
                  <div className="space-y-2">
                    {unmatchedRows.map((item) => (
                      <div key={item.id} className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] p-3">
                        <div className="mb-2 text-xs text-zinc-400">{item.reason || 'Não Correspondido row'}</div>
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
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Método</label>
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
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Valor</label>
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
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Pago at</label>
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
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#c81d25] px-4 py-2.5 font-semibold text-white hover:bg-[#b01720] disabled:opacity-60"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
