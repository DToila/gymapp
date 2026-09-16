import { google } from 'googleapis'

export interface GoogleCalendarBooking {
  leadId: string
  leadName: string
  scheduleId: string
  date: string // YYYY-MM-DD
  time: string // "HH:MM-HH:MM"
}

const TIMEZONE = 'Europe/Lisbon'

// Reuses the same Google Cloud service account already set up for the DD
// file scanner (GOOGLE_CLOUD_VISION_CREDENTIALS) unless a dedicated one is
// provided — one GCP project/service account key can serve multiple Google
// APIs, it just needs each API enabled on the project and, for Calendar,
// the target calendar shared with the service account's email as an editor.
const getCredentials = (): Record<string, unknown> | null => {
  const raw = process.env.GOOGLE_CALENDAR_CREDENTIALS || process.env.GOOGLE_CLOUD_VISION_CREDENTIALS
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error('[googleCalendar] Failed to parse service account credentials JSON:', error)
    return null
  }
}

const parseTimeRange = (time: string): { start: string; end: string } => {
  const [start, end] = time.split('-').map((part) => part.trim())
  return { start: start || '00:00', end: end || start || '00:00' }
}

export async function syncToGoogleCalendar(booking: GoogleCalendarBooking): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  const credentials = getCredentials()

  if (!calendarId || !credentials) {
    console.log(
      '[googleCalendar] Not configured yet (missing GOOGLE_CALENDAR_ID or service account credentials) — skipping sync for',
      booking.leadName
    )
    return
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    })

    const calendar = google.calendar({ version: 'v3', auth })
    const { start, end } = parseTimeRange(booking.time)

    await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `Aula Experimental — ${booking.leadName}`,
        description: `Lead ID: ${booking.leadId}\nSchedule slot: ${booking.scheduleId}`,
        start: { dateTime: `${booking.date}T${start}:00`, timeZone: TIMEZONE },
        end: { dateTime: `${booking.date}T${end}:00`, timeZone: TIMEZONE },
      },
    })

    console.log('[googleCalendar] Event created for', booking.leadName, 'on', booking.date, booking.time)
  } catch (error) {
    // Never let a calendar sync failure block the booking itself — the lead
    // is already saved in Supabase regardless of what happens here.
    console.error('[googleCalendar] Failed to create event:', error)
  }
}
