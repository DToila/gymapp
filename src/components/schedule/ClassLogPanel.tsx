"use client";

import { X } from 'lucide-react';
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
  onClose?: () => void;
}

type ContentSection = {
  title: string;
  details: string[];
};

const badgeBase = 'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide';

const splitAttendees = (value?: string[] | null): string[] => (value || []).map((item) => item.trim()).filter(Boolean);

const toReadableText = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const letters = trimmed.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  const isMostlyUppercase = letters.length > 4 && letters === letters.toUpperCase();
  if (!isMostlyUppercase) return trimmed;

  return trimmed
    .toLowerCase()
    .replace(/\b(gb1|gb2|gbk|mc|pc1|pc2|gi|no-gi|nogi)\b/gi, (match) => match.toUpperCase())
    .replace(/(^|[.!?]\s+)([a-zà-öø-ÿ])/g, (match) => match.toUpperCase());
};

const parseContentSections = (value: string): ContentSection[] => {
  const normalized = value.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  return normalized
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .flatMap((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.length === 0) return [];

      if (lines.length === 1) {
        const [maybeTitle, ...rest] = lines[0].split(/:\s+/);
        if (rest.length > 0) {
          return [{ title: toReadableText(maybeTitle), details: [toReadableText(rest.join(': '))] }];
        }
        return [{ title: toReadableText(lines[0]), details: [] }];
      }

      return [{
        title: toReadableText(lines[0].replace(/:$/, '')),
        details: lines.slice(1).map(toReadableText),
      }];
    });
};

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
  onClose,
}: ClassLogPanelProps) {
  const teacherName =
    coaches.find((coach) => coach.id === (mode === 'edit' ? teacherId : log?.teacher_id || ''))?.full_name ||
    log?.teacher_name ||
    (mode === 'edit' ? 'No teacher selected' : 'No teacher logged');

  const attendees = splitAttendees(mode === 'edit' ? attendeesText.split(',') : log?.attendees || []);
  const canSave = Boolean((content.trim() || topic.trim()) && !isSaving);
  const contentSections = parseContentSections(log?.content || '');
  const statusLabel = log?.content ? 'Registado' : 'Sem registo';
  const closePanel = onClose || onCancel;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={closePanel}
        aria-label="Fechar"
        title="Fechar"
        className="sticky right-0 top-0 z-30 ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#343434] bg-[#171717] text-zinc-300 shadow-[0_10px_24px_rgba(0,0,0,0.35)] transition hover:border-[#4a4a4a] hover:text-white"
      >
        <X size={18} />
      </button>

      <div className="sticky top-0 z-20 -mx-5 -mt-10 border-b border-[#242424] bg-[#121212]/95 px-5 pb-5 pt-5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="pr-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#c81d25]">{title}</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-white">{mode === 'edit' ? topic || 'Novo log de aula' : log?.topic || 'Aula sem tópico'}</h2>
          <p className="mt-2 text-sm leading-5 text-zinc-400">{subtitle}</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`${badgeBase} border-[#5b1f24] bg-[rgba(200,29,37,0.14)] text-rose-200`}>{teacherName}</span>
          <span className={`${badgeBase} ${log?.content ? 'border-[#1f4d33] bg-[#112117] text-green-300' : 'border-[#3a3a3a] bg-[#161616] text-zinc-400'}`}>
            {statusLabel}
          </span>
          {log?.updated_at ? (
            <span className={`${badgeBase} border-[#2a2a2a] bg-[#151515] text-zinc-400`}>
              Atualizado {new Date(log.updated_at).toLocaleDateString('pt-PT')}
            </span>
          ) : null}
        </div>
      </div>

      {mode === 'view' ? (
        <div className="space-y-4 pt-5">
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">Conteúdo da aula</p>
            {contentSections.length > 0 ? (
              <div className="space-y-3">
                {contentSections.map((section, index) => (
                  <article key={`${section.title}-${index}`} className="rounded-xl border border-[#242424] bg-[#151515] p-4">
                    <h3 className="text-sm font-bold leading-5 text-zinc-100">{section.title}</h3>
                    {section.details.length > 0 ? (
                      <ul className="mt-3 space-y-2 border-l border-[#333] pl-4 text-sm leading-6 text-zinc-300">
                        {section.details.map((detail, detailIndex) => (
                          <li key={`${detail}-${detailIndex}`}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#232323] bg-[#151515] p-4 text-sm leading-6 text-zinc-400">
                Sem conteúdo registado para esta aula.
              </div>
            )}
          </section>

          {showAttendees ? (
            <details className="rounded-xl border border-[#242424] bg-[#101010] p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                <span>Presenças</span>
                <span className="rounded-full border border-[#2a2a2a] bg-[#151515] px-2 py-0.5 text-[11px] normal-case tracking-normal text-zinc-300">
                  {attendees.length}
                </span>
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {attendees.length > 0 ? (
                  attendees.map((attendee) => (
                    <span key={attendee} className="rounded-full border border-[#2a2a2a] bg-[#151515] px-3 py-1 text-xs text-zinc-200">
                      {attendee}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-zinc-500">Sem presenças registadas.</span>
                )}
              </div>
            </details>
          ) : null}

          {canEdit ? (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-xl border border-[#2b2b2b] bg-[#151515] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-[#3a3a3a] hover:text-white"
              >
                Editar
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4 pt-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Tópico</label>
            <input
              value={topic}
              onChange={(event) => onChangeTopic(event.target.value)}
              placeholder="Foco da semana"
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#c81d25]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">Conteúdo da aula</label>
            <textarea
              value={content}
              onChange={(event) => onChangeContent(event.target.value)}
              placeholder="O que foi trabalhado nesta aula"
              rows={8}
              className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#c81d25]"
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">Instrutor</label>
              <select
                value={teacherId}
                onChange={(event) => onChangeTeacher(event.target.value)}
                className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#c81d25]"
              >
                <option value="">No teacher selected</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.full_name || 'Unnamed Instrutor'}
                  </option>
                ))}
              </select>
            </div>

            {showAttendees ? (
              <details className="rounded-xl border border-[#242424] bg-[#101010] p-4">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Presenças
                </summary>
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-zinc-400">Alunos presentes</label>
                  <textarea
                    value={attendeesText}
                    onChange={(event) => onChangeAttendees(event.target.value)}
                    placeholder="Nomes ou IDs separados por vírgulas"
                    rows={3}
                    className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#c81d25]"
                  />
                </div>
              </details>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-[#2b2b2b] bg-[#151515] px-3 py-2 text-sm text-zinc-300 transition hover:border-[#3a3a3a] hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="rounded-xl border border-[#c81d25] bg-[#c81d25] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a8141c] disabled:opacity-50"
            >
              {isSaving ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
