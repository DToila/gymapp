import { NextResponse } from 'next/server'
import { syncToGoogleCalendar } from '../../../../../lib/googleCalendar'
import { requireRole } from '../../../../../lib/apiAuth'

// Thin server-only proxy. syncToGoogleCalendar depends on the `googleapis`
// package, which uses Node built-ins (fs, child_process) that can't be
// bundled into client code. leadAutomation.ts's bookTrialClass() runs in the
// browser (staff manually booking a trial from the Leads page), so it calls
// this route instead of importing lib/googleCalendar.ts directly.
export async function POST(request: Request) {
  const access = await requireRole(['admin', 'staff'])
  if ('error' in access) return access.error

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { leadId, leadName, scheduleId, date, time } = body as Record<string, unknown>
  if (!leadId || !leadName || !scheduleId || !date || !time) {
    return NextResponse.json({ error: 'Missing booking fields.' }, { status: 400 })
  }

  await syncToGoogleCalendar({
    leadId: String(leadId),
    leadName: String(leadName),
    scheduleId: String(scheduleId),
    date: String(date),
    time: String(time),
  })

  return NextResponse.json({ success: true })
}
