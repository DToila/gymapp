export interface GoogleCalendarBooking {
  leadId: string
  leadName: string
  scheduleId: string
  date: string
  time: string
}

export async function syncToGoogleCalendar(leadBooking: GoogleCalendarBooking): Promise<void> {
  // TODO: integrate Google Calendar API — create an event on the academy's shared
  // calendar for this trial class booking once OAuth credentials and a target
  // calendar id are configured. For now this is a no-op placeholder.
  console.log('[googleCalendar] syncToGoogleCalendar stub (not yet integrated):', leadBooking)
}
