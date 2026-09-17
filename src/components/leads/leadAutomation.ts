import { supabase } from '../../../lib/supabase';
import {
  ScheduleSlotRow,
  ensureScheduleSlots,
  getTrialBookingsCount,
  getTrialBookingsCountsForSessions,
  insertReminderLog,
  logLeadStatusChange,
} from '../../../lib/database';
import { officialSchedule, OfficialScheduleClass } from '../student/studentData';
import { DECISION_WAIT_DAYS_DEFAULT, Lead, LeadClassType } from './types';

// toISOString() converts to UTC, which shifts the calendar date backwards for
// timezones ahead of UTC (e.g. WEST) when the Date represents local midnight —
// see the same fix applied in SchedulePage.tsx / StudentSchedulePage.tsx.
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// ─── Age-based class-type suggestion ─────────────────────────────────────────

export function suggestClassTypesForAge(age: number): LeadClassType[] {
  return age < 16 ? ['GBK'] : ['GB1', 'GB2'];
}

export function isKidsProgram(program: LeadClassType): boolean {
  return program === 'GBK';
}

// MC (3-5), PC1 (6-8) and PC2 (9-12) each have a dedicated slot, but PC1 and
// PC2 actually train together at the same time (18:15, every weekday) along
// with Juniors (13-15, no dedicated slot) — so for trial-booking purposes
// ages 6-15 share the same pool of sessions. Returns null for adults (16+),
// who aren't restricted to a specific kids sub-group.
export function suggestKidsSubgroupForAge(age: number): string[] | null {
  if (age >= 3 && age <= 5) return ['MC'];
  if (age >= 6 && age <= 15) return ['PC1', 'PC2'];
  return null;
}

export function getTrialSlotsForAge(age: number): OfficialScheduleClass[] {
  const kidsGroups = suggestKidsSubgroupForAge(age);
  if (kidsGroups) {
    return officialSchedule.filter(
      (slot) => slot.program === 'GBK' && slot.kidsGroup && kidsGroups.includes(slot.kidsGroup)
    );
  }
  return officialSchedule.filter((slot) => slot.program === 'GB1' || slot.program === 'GB2');
}

// ─── Upcoming session dates for a weekly slot ────────────────────────────────

const DAY_KEY_TO_JS_DAY: Record<OfficialScheduleClass['dayOfWeek'], number> = {
  DOM: 0,
  SEG: 1,
  TER: 2,
  QUA: 3,
  QUI: 4,
  SEX: 5,
  SAB: 6,
};

export interface UpcomingSession {
  slot: OfficialScheduleClass;
  dateKey: string;
  dateLabel: string;
}

export function getUpcomingSessionDatesForSlot(
  slot: OfficialScheduleClass,
  count: number,
  fromDate: Date = new Date()
): UpcomingSession[] {
  const targetDay = DAY_KEY_TO_JS_DAY[slot.dayOfWeek];
  const results: UpcomingSession[] = [];
  const cursor = new Date(fromDate);
  cursor.setHours(0, 0, 0, 0);

  for (let i = 0; i < 60 && results.length < count; i += 1) {
    if (cursor.getDay() === targetDay) {
      results.push({
        slot,
        dateKey: toLocalDateKey(cursor),
        dateLabel: cursor.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

export function getUpcomingSessionsForClassTypes(
  classTypes: LeadClassType[],
  perSlotCount: number = 3,
  fromDate: Date = new Date()
): UpcomingSession[] {
  const matchingSlots = officialSchedule.filter((slot) => classTypes.includes(slot.program as LeadClassType));
  const sessions = matchingSlots.flatMap((slot) => getUpcomingSessionDatesForSlot(slot, perSlotCount, fromDate));

  return sessions.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
    return a.slot.startTime.localeCompare(b.slot.startTime);
  });
}

// ─── Trial capacity ───────────────────────────────────────────────────────────

export interface SessionCapacityInfo {
  capacity: number | null; // null = unlimited
  booked: number;
  full: boolean;
}

export async function getSessionCapacityInfo(
  scheduleSlotRow: ScheduleSlotRow,
  dateKey: string,
  program: LeadClassType
): Promise<SessionCapacityInfo> {
  const capacity = isKidsProgram(program)
    ? scheduleSlotRow.trial_capacity_kids ?? null
    : scheduleSlotRow.trial_capacity_adults ?? null;
  const booked = await getTrialBookingsCount(scheduleSlotRow.id, dateKey);
  return { capacity, booked, full: capacity !== null && booked >= capacity };
}

// Batched sibling used by the trial-booking picker, which needs capacity for
// up to a dozen candidate sessions at once — one query instead of one per
// session.
export async function getSessionsCapacityInfo(
  candidates: Array<{ scheduleSlotRow: ScheduleSlotRow; dateKey: string; program: LeadClassType }>
): Promise<SessionCapacityInfo[]> {
  const counts = await getTrialBookingsCountsForSessions(
    candidates.map((c) => ({ scheduleId: c.scheduleSlotRow.id, dateKey: c.dateKey }))
  );

  return candidates.map(({ scheduleSlotRow, dateKey, program }) => {
    const capacity = isKidsProgram(program)
      ? scheduleSlotRow.trial_capacity_kids ?? null
      : scheduleSlotRow.trial_capacity_adults ?? null;
    const booked = counts.get(`${scheduleSlotRow.id}:${dateKey}`) || 0;
    return { capacity, booked, full: capacity !== null && booked >= capacity };
  });
}

export async function resolveScheduleSlotRows(slots: OfficialScheduleClass[]): Promise<Record<string, ScheduleSlotRow>> {
  const rows = await ensureScheduleSlots(
    slots.map((slot) => ({
      code: slot.id,
      day_of_week: slot.dayOfWeek,
      start_time: slot.startTime,
      end_time: slot.endTime,
      program: slot.program,
      kids_group: slot.kidsGroup || null,
      gi_type: slot.giType,
      tags: slot.tags || null,
      default_coach_id: null,
    }))
  );

  const byCode: Record<string, ScheduleSlotRow> = {};
  rows.forEach((row) => {
    byCode[row.code] = row;
  });
  return byCode;
}

// ─── Trial booking ────────────────────────────────────────────────────────────

export async function bookTrialClass(params: {
  lead: Lead;
  scheduleSlotRow: ScheduleSlotRow;
  dateKey: string;
  program: LeadClassType;
  changedBy?: string | null;
}): Promise<Lead> {
  const { lead, scheduleSlotRow, dateKey, program, changedBy } = params;

  const capacityInfo = await getSessionCapacityInfo(scheduleSlotRow, dateKey, program);
  if (capacityInfo.full) {
    throw new Error(`Sessão cheia (${capacityInfo.booked}/${capacityInfo.capacity}). Escolha outra sessão.`);
  }

  const { data, error } = await supabase
    .from('leads')
    .update({
      trial_schedule_id: scheduleSlotRow.id,
      trial_date: dateKey,
      status: 'Aula agendada',
    })
    .eq('id', lead.id)
    .select()
    .single();

  if (error) throw error;

  await logLeadStatusChange(lead.id, 'Aula agendada', changedBy);

  // Routed through an API call (rather than importing lib/googleCalendar.ts
  // directly) because this function runs in the browser — that library
  // depends on `googleapis`, which needs Node builtins unavailable there.
  fetch('/api/internal/sync-calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leadId: lead.id,
      leadName: lead.name,
      scheduleId: scheduleSlotRow.id,
      date: dateKey,
      time: `${scheduleSlotRow.start_time}-${scheduleSlotRow.end_time}`,
    }),
  }).catch((error) => console.error('sync-calendar call failed:', error));

  return data as Lead;
}

// ─── Post-trial feedback ──────────────────────────────────────────────────────

export async function saveTrialFeedback(leadId: string, feedback: string, authorId?: string | null): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({
      trial_feedback: feedback,
      trial_feedback_at: new Date().toISOString(),
      trial_feedback_by: authorId || null,
    })
    .eq('id', leadId);

  if (error) throw error;
}

// ─── Reminders (send stubbed, pipeline is real) ──────────────────────────────

export function buildReminderMessage(lead: Lead, slotTimeLabel: string): string {
  const firstName = lead.name.split(' ')[0] || lead.name;
  return `Olá ${firstName}! A confirmar a tua aula experimental de ${lead.class_type} amanhã ${slotTimeLabel} na Gracie Barra Carnaxide e Queijas. Até já!`;
}

export async function sendReminder(lead: Lead, message: string, scheduledFor: string): Promise<void> {
  // TODO: integrate Twilio / WhatsApp Business API to actually deliver this message.
  console.log('[sendReminder] stub (not yet integrated) — would send to', lead.phone || lead.email || lead.name, ':', message);
  await insertReminderLog({
    lead_id: lead.id,
    scheduled_for: scheduledFor,
    message,
    channel: lead.phone ? 'whatsapp' : 'sms',
  });
}

// ─── Daily automation orchestration ──────────────────────────────────────────

export interface DailyAutomationResult {
  movedToDecision: number;
  remindersCreated: number;
}

export async function runDailyLeadAutomation(): Promise<DailyAutomationResult> {
  const today = toLocalDateKey(new Date());
  const tomorrow = toLocalDateKey(addDays(new Date(), 1));

  // 1. Trials that already happened (status still "Aula realizada" from the day
  // it took place) move forward to "Aguarda decisao" the day after, so staff
  // know it's time to follow up on a decision.
  const { data: passedTrials, error: passedError } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'Aula realizada')
    .lt('trial_date', today);

  if (passedError) throw passedError;

  let movedToDecision = 0;
  for (const row of passedTrials || []) {
    const { error: updateError } = await supabase
      .from('leads')
      .update({ status: 'Aguarda decisao' })
      .eq('id', row.id);

    if (updateError) {
      console.error('Erro moving lead to Aguarda decisao', row.id, updateError);
      continue;
    }

    await logLeadStatusChange(row.id, 'Aguarda decisao', null);
    movedToDecision += 1;
  }

  // 2. Day-before reminders for leads with a trial scheduled for tomorrow.
  const { data: tomorrowTrials, error: tomorrowError } = await supabase
    .from('leads')
    .select('*')
    .eq('trial_date', tomorrow);

  if (tomorrowError) throw tomorrowError;

  let remindersCreated = 0;
  for (const row of tomorrowTrials || []) {
    const lead = row as Lead;
    let slotTimeLabel = 'amanhã';

    if (lead.trial_schedule_id) {
      const { data: slotRow } = await supabase
        .from('schedule_slots')
        .select('start_time, end_time')
        .eq('id', lead.trial_schedule_id)
        .maybeSingle();
      if (slotRow?.start_time) {
        slotTimeLabel = `às ${String(slotRow.start_time).slice(0, 5)}`;
      }
    }

    const message = buildReminderMessage(lead, slotTimeLabel);
    await sendReminder(lead, message, tomorrow);
    remindersCreated += 1;
  }

  return { movedToDecision, remindersCreated };
}

// ─── "Leads to contact today" safety net ─────────────────────────────────────

export interface LeadAwaitingDecision extends Lead {
  daysInDecisionStage: number | null;
}

export async function getLeadsToContactToday(
  waitDays: number = DECISION_WAIT_DAYS_DEFAULT
): Promise<LeadAwaitingDecision[]> {
  const { data: waitingRows, error } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'Aguarda decisao');

  if (error) throw error;

  const leads = (waitingRows || []) as Lead[];
  if (leads.length === 0) return [];

  const { data: historyRows, error: historyError } = await supabase
    .from('lead_status_history')
    .select('lead_id, changed_at')
    .eq('status', 'Aguarda decisao')
    .in('lead_id', leads.map((lead) => lead.id))
    .order('changed_at', { ascending: false });

  if (historyError) throw historyError;

  const latestEntryByLead = new Map<string, string>();
  (historyRows || []).forEach((row) => {
    if (!latestEntryByLead.has(row.lead_id)) latestEntryByLead.set(row.lead_id, row.changed_at);
  });

  const msPerDay = 24 * 60 * 60 * 1000;

  return leads
    .map((lead) => {
      const enteredAt = latestEntryByLead.get(lead.id);
      const daysInDecisionStage = enteredAt ? Math.floor((Date.now() - new Date(enteredAt).getTime()) / msPerDay) : null;
      return { ...lead, daysInDecisionStage };
    })
    .filter((lead) => {
      // No history recorded for this transition (e.g. moved before this
      // feature existed) — surface it defensively rather than silently hide it.
      if (lead.daysInDecisionStage === null) return true;
      return lead.daysInDecisionStage >= waitDays;
    })
    .sort((a, b) => (b.daysInDecisionStage ?? 0) - (a.daysInDecisionStage ?? 0));
}

// ─── Conversion funnel metrics ────────────────────────────────────────────────

export interface FunnelMetrics {
  received: number;
  trialScheduled: number;
  trialCompleted: number;
  enrolled: number;
}

export async function getFunnelMetrics(fromDateKey: string, toDateKey: string): Promise<FunnelMetrics> {
  const { count: received, error: receivedError } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${fromDateKey}T00:00:00`)
    .lte('created_at', `${toDateKey}T23:59:59`);

  if (receivedError) throw receivedError;

  const countStageHistory = async (status: string): Promise<number> => {
    const { data, error } = await supabase
      .from('lead_status_history')
      .select('lead_id')
      .eq('status', status)
      .gte('changed_at', `${fromDateKey}T00:00:00`)
      .lte('changed_at', `${toDateKey}T23:59:59`);

    if (error) throw error;
    return new Set((data || []).map((row) => row.lead_id)).size;
  };

  const [trialScheduled, trialCompleted, enrolled] = await Promise.all([
    countStageHistory('Aula agendada'),
    countStageHistory('Aula realizada'),
    countStageHistory('Inscrito'),
  ]);

  return { received: received || 0, trialScheduled, trialCompleted, enrolled };
}
