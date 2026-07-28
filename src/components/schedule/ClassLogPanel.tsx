"use client";

import { ClassLogRow, CoachProfile } from '../../../lib/database';

type LogMode = 'view' | 'edit';

interface ClassLogPanelProps {
  title: string;
  subtitle: string;
  log: ClassLogRow | null;
  mode: LogMode;
  canEdit: boolean;
  showAttendees?: boolean;
  coaches: CoachProfile[];
  topic: string;
  content: string;
  teacherId: string;
  attendeesText: string;
  isSaving?: boolean;
  onChangeTopic: (value: string) => void;
  onChangeContent: (value: string) => void;
  onChangeTeacher: (value: string) => void;
  onChangeAttendees: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const badgeBase = 'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide';

const splitAttendees = (value?: string[] | null): string[] => (value || []).map((item) => item.trim()).filter(Boolean);

export default function ClassLogPanel({
  title,
  subtitle,
  log,
  mode,
  canEdit,
  showAttendees = true,
  coaches,
  topic,
  content,
  teacherId,
  attendeesText,
  isSaving = false,
  onChangeTopic,
  onChangeContent,
  onChangeTeacher,
  onChangeAttendees,
  onEdit,
  onSave,
  onCancel,
}: ClassLogPanelProps) {
  const teacherName =
    coaches.find((coach) => coach.id === (mode === 'edit' ? teacherId : log?.teacher_id || ''))?.full_name ||
    log?.teacher_name ||
    (mode === 'edit' ? 'No teacher selected' : 'No teacher logged');

  const attendees = splitAttendees(mode === 'edit' ? attendeesText.split(',') : log?.attendees || []);
  const canSave = Boolean((content.trim() || topic.trim()) && !isSaving);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-semibold text-zinc-100">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
      </div>

      {mode === 'view' ? (
        <div className="space-y-3 rounded-2xl border border-[#242424] bg-[#111111] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap gap-2">
            <span className={`${badgeBase} border-[#3a3a3a] bg-[#161616] text-zinc-300`}>{log?.topic || 'Sem tópico'}</span>
            <span className={`${badgeBase} border-[#5b1f24] bg-[rgba(200,29,37,0.14)] text-rose-200`}>{teacherName}</span>
            {log?.updated_at ? (
              <span className={`${badgeBase} border-[#2a2a2a] bg-[#151515] text-zinc-400`}>
                Atualizado {new Date(log.updated_at).toLocaleDateString('pt-PT')}
              </span>
            ) : null}
          </div>

          <div className="rounded-xl border border-[#232323] bg-[#151515] p-4 text-sm leading-6 text-zinc-200 whitespace-pre-wrap">
            {log?.content || 'Sem conteúdo registado para esta aula.'}
          </div>

          {showAttendees ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Attendees</p>
              <div className="flex flex-wrap gap-2">
                {attendees.length > 0 ? (
                  attendees.map((attendee) => (
                    <span key={attendee} className="rounded-full border border-[#2a2a2a] bg-[#151515] px-3 py-1 text-xs text-zinc-200">
                      {attendee}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-zinc-500">No attendees logged.</span>
                )}
              </div>
            </div>
          ) : null}

          {canEdit ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-xl border border-[#2b2b2b] bg-[#151515] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-[#3a3a3a] hover:text-white"
              >
                Editar
              </button>
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#2b2b2b] bg-[#151515] px-4 py-2 text-sm text-zinc-300"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-[#242424] bg-[#111111] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.28)]">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Tópico</label>
            <input
              value={topic}
              onChange={(event) => onChangeTopic(event.target.value)}
              placeholder="Weekly topic / focus…"
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Conteúdo da aula</label>
            <textarea
              value={content}
              onChange={(event) => onChangeContent(event.target.value)}
              placeholder="What was covered in this class…"
              rows={4}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Teacher (optional)</label>
              <select
                value={teacherId}
                onChange={(event) => onChangeTeacher(event.target.value)}
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
              >
                <option value="">No teacher selected</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.full_name || 'Unnamed Professor'}
                  </option>
                ))}
              </select>
            </div>

            {showAttendees ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-400">Attendees (optional)</label>
                <textarea
                  value={attendeesText}
                  onChange={(event) => onChangeAttendees(event.target.value)}
                  placeholder="Comma-separated names or member IDs"
                  rows={3}
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none"
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#2b2b2b] bg-[#151515] px-3 py-2 text-sm text-zinc-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
