"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnnouncementAudience, AnnouncementItem, AnnouncementTag, AppRole, KidsGroup } from './types';

type ModalMode = 'create' | 'manage';
type TabKey = 'create' | 'manage' | 'pendente';

interface DraftState {
  title: string;
  details: string;
  tag: AnnouncementTag;
  audience: AnnouncementAudience;
  kidsGroup: KidsGroup | '';
  expiresAt: string;
  pinned: boolean;
  ackRequired: boolean;
}

const DEFAULT_TITLE_MAX = 160;
const DEFAULT_DETAILS_MAX = 800;

const emptyDraft: DraftState = {
  title: '',
  details: '',
  tag: 'INFO',
  audience: 'ALL',
  kidsGroup: '',
  expiresAt: '',
  pinned: false,
  ackRequired: false,
};

const tagChipClass: Record<AnnouncementTag, string> = {
  URGENT: 'border-[#7f1d1d] bg-[rgba(127,29,29,0.28)] text-[#fda4af]',
  INFO: 'border-[#3f3f46] bg-[rgba(63,63,70,0.28)] text-zinc-300',
  EVENT: 'border-[#581c87] bg-[rgba(88,28,135,0.26)] text-violet-300',
  PAYMENTS: 'border-[#7c2d12] bg-[rgba(124,45,18,0.3)] text-orange-300',
};

const audienceLabel: Record<AnnouncementAudience, string> = {
  ALL: 'Todos',
  ADULTS: 'Adultos',
  KIDS: 'Crianças',
  STAFF: 'Staff',
};

const formatDateLabel = (dateValue: string): string => {
  if (!dateValue) return '—';
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AnnouncementsModal({
  isOpen,
  mode,
  announcements,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onTogglePin,
  onApprove,
  onReject,
  canApprove,
  currentUserRole,
  titleMaxChars = DEFAULT_TITLE_MAX,
  detailsMaxChars = DEFAULT_DETAILS_MAX,
}: {
  isOpen: boolean;
  mode: ModalMode;
  announcements: AnnouncementItem[];
  onClose: () => void;
  onCreate: (announcement: Omit<AnnouncementItem, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: string, announcement: Omit<AnnouncementItem, 'id' | 'createdAt'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTogglePin: (id: string) => Promise<void>;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason?: string) => Promise<void>;
  canApprove: boolean;
  currentUserRole: AppRole;
  titleMaxChars?: number;
  detailsMaxChars?: number;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [showDetails, setShowDetails] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState<'all' | AnnouncementTag>('all');
  const [filterAudience, setFilterAudience] = useState<'all' | AnnouncementAudience>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'expired'>('all');
  const [filterPinned, setFilterPinned] = useState<'all' | 'pinned' | 'unpinned'>('all');
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setShowDetails(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(mode === 'manage' ? 'manage' : 'create');
    if (mode === 'create') {
      resetDraft();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!editingId) {
          resetDraft();
        }
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [editingId, isOpen, onClose]);

  useEffect(() => {
    if (!titleRef.current) return;
    titleRef.current.style.height = 'auto';
    titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
  }, [draft.title, isOpen]);

  useEffect(() => {
    if (!detailsRef.current) return;
    detailsRef.current.style.height = 'auto';
    detailsRef.current.style.height = `${detailsRef.current.scrollHeight}px`;
  }, [draft.details, isOpen, showDetails]);

  const isPastExpiry = useMemo(() => {
    if (!draft.expiresAt) return false;
    const today = toDateKey(new Date());
    return draft.expiresAt < today;
  }, [draft.expiresAt]);

  const canUseAckToggle = draft.tag === 'URGENT' || draft.audience === 'STAFF';

  const canPublish =
    draft.title.trim().length > 0 &&
    draft.title.length <= titleMaxChars &&
    draft.details.length <= detailsMaxChars &&
    Boolean(draft.tag) &&
    Boolean(draft.audience) &&
    Boolean(draft.expiresAt) &&
    !isPastExpiry;

  const handleQuickExpiry = (days: number) => {
    const next = new Date();
    next.setDate(next.getDate() + days);
    setDraft((prev) => ({ ...prev, expiresAt: toDateKey(next) }));
  };

  const handlePublish = async () => {
    if (!canPublish) return;

    const payload: Omit<AnnouncementItem, 'id' | 'createdAt'> = {
      tag: draft.tag,
      title: draft.title.trim(),
      details: draft.details.trim() || undefined,
      audience: draft.audience,
      kidsGroup: draft.audience === 'KIDS' && draft.kidsGroup ? draft.kidsGroup : null,
      expiresAt: draft.expiresAt,
      pinned: draft.pinned,
      ackRequired: draft.ackRequired,
      createdBy: 'Administrador',
      approvalStatus: currentUserRole === 'coach' ? 'pending' : 'approved',
      approvedBy: currentUserRole === 'coach' ? null : 'Staff',
      approvedById: null,
      approvedAt: currentUserRole === 'coach' ? null : new Date().toISOString(),
      rejectionReason: null,
    };

    try {
      if (editingId) {
        await onUpdate(editingId, payload);
      } else {
        await onCreate(payload);
      }

      resetDraft();
      onClose();
    } catch (error) {
      console.error('Falhado to publish announcement:', error);
    }
  };

  const handleCancel = () => {
    if (!editingId) {
      resetDraft();
    }
    onClose();
  };

  const manageRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return announcements
      .filter((item) => {
        if (!normalizedSearch) return true;
        return `${item.title} ${item.details || ''}`.toLowerCase().includes(normalizedSearch);
      })
      .filter((item) => filterTag === 'all' || item.tag === filterTag)
      .filter((item) => filterAudience === 'all' || item.audience === filterAudience)
      .filter((item) => {
        if (filterPinned === 'all') return true;
        return filterPinned === 'pinned' ? Boolean(item.pinned) : !item.pinned;
      })
      .filter((item) => {
        if (filterStatus === 'all') return true;
        const today = toDateKey(new Date());
        return filterStatus === 'ativo' ? item.expiresAt >= today : item.expiresAt < today;
      });
  }, [announcements, filterAudience, filterPinned, filterStatus, filterTag, search]);

  const pendingRows = useMemo(
    () =>
      announcements
        .filter((item) => item.approvalStatus === 'pending')
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [announcements]
  );

  const loadIntoComposer = (item: AnnouncementItem) => {
    setDraft({
      title: item.title,
      details: item.details || '',
      tag: item.tag,
      audience: item.audience,
      kidsGroup: item.kidsGroup || '',
      expiresAt: item.expiresAt,
      pinned: Boolean(item.pinned),
      ackRequired: Boolean(item.ackRequired),
    });
    setEditingId(item.id);
    setShowDetails(Boolean(item.details));
    setActiveTab('create');
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-[1px] transition-opacity duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          if (!editingId) {
            resetDraft();
          }
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-[#2a2a2a] bg-[#121212] shadow-[0_18px_50px_rgba(0,0,0,0.55)] transition-all duration-200">
        <div className="flex items-center justify-between border-b border-[#202020] px-5 py-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{mode === 'create' ? 'Criar announcement' : 'Manage announcements'}</h3>
            <div className="hidden items-center gap-2 sm:flex">
              <button
                onClick={() => setActiveTab('create')}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${activeTab === 'create' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}
              >
                Criar
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${activeTab === 'manage' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}
              >
                Manage
              </button>
              {canApprove ? (
                <button
                  onClick={() => setActiveTab('pendente')}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${activeTab === 'pendente' ? 'border-[#c81d25] bg-[rgba(200,29,37,0.2)] text-white' : 'border-[#2a2a2a] bg-[#171717] text-zinc-400'}`}
                >
                  Pendente approvals
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-3 py-1.5 text-sm text-zinc-300 hover:border-[#3a3a3a]">
              Cancelar
            </button>
            <button
              onClick={handlePublish}
              disabled={!canPublish || activeTab !== 'create'}
              className="rounded-md border border-[#c81d25] bg-[#c81d25] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#ac1820] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {currentUserRole === 'coach' ? 'Enviar for approval' : 'Publish'}
            </button>
            <button onClick={handleCancel} className="grid h-8 w-8 place-items-center rounded-md border border-[#2a2a2a] bg-[#171717] text-zinc-400 hover:text-white">
              ✕
            </button>
          </div>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-4">
          {activeTab === 'create' ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="space-y-4">
                <div className="rounded-xl border border-[#242424] bg-[#101010] p-3">
                  <textarea
                    ref={titleRef}
                    value={draft.title}
                    onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value.slice(0, titleMaxChars) }))}
                    placeholder="Write an announcement..."
                    rows={2}
                    className="w-full resize-none bg-transparent text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
                  />
                  <div className="mt-2 text-right text-xs text-zinc-500">{draft.title.length}/{titleMaxChars}</div>
                </div>

                <div>
                  <button
                    onClick={() => setShowDetails((prev) => !prev)}
                    className="text-xs font-medium text-[#c81d25] hover:text-[#ef3a43]"
                  >
                    {showDetails ? 'Hide details' : 'Adicionar details (optional)'}
                  </button>
                  {showDetails ? (
                    <div className="mt-2 rounded-xl border border-[#242424] bg-[#101010] p-3">
                      <textarea
                        ref={detailsRef}
                        value={draft.details}
                        onChange={(event) => setDraft((prev) => ({ ...prev, details: event.target.value.slice(0, detailsMaxChars) }))}
                        placeholder="Adicionar more details (optional)..."
                        rows={3}
                        className="w-full resize-none bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 outline-none"
                      />
                      <div className="mt-2 text-right text-xs text-zinc-500">{draft.details.length}/{detailsMaxChars}</div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-[#242424] bg-[#101010] p-3 space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Type</p>
                    <div className="flex flex-wrap gap-2">
                      {(['URGENT', 'INFO', 'EVENT', 'PAYMENTS'] as AnnouncementTag[]).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setDraft((prev) => ({ ...prev, tag }))}
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${tagChipClass[tag]} ${draft.tag === tag ? 'ring-1 ring-[#f0f0f0]/30' : 'opacity-80'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Audience</p>
                      <select
                        value={draft.audience}
                        onChange={(event) => setDraft((prev) => ({ ...prev, audience: event.target.value as AnnouncementAudience, kidsGroup: event.target.value === 'KIDS' ? prev.kidsGroup : '' }))}
                        className="w-full rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-100 outline-none"
                      >
                        <option value="ALL">Todos</option>
                        <option value="ADULTS">Adultos</option>
                        <option value="KIDS">Crianças</option>
                        <option value="STAFF">Staff</option>
                      </select>
                    </div>

                    {draft.audience === 'KIDS' ? (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Crianças group</p>
                        <select
                          value={draft.kidsGroup}
                          onChange={(event) => setDraft((prev) => ({ ...prev, kidsGroup: event.target.value as KidsGroup }))}
                          className="w-full rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-100 outline-none"
                        >
                          <option value="">Todos kids</option>
                          <option value="Crianças 1">Crianças 1</option>
                          <option value="Crianças 2">Crianças 2</option>
                          <option value="Teens">Teens</option>
                        </select>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Expiration</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="date"
                        value={draft.expiresAt}
                        onChange={(event) => setDraft((prev) => ({ ...prev, expiresAt: event.target.value }))}
                        className="rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-100 outline-none"
                      />
                      <button onClick={() => handleQuickExpiry(1)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2.5 py-1.5 text-xs text-zinc-300">1 day</button>
                      <button onClick={() => handleQuickExpiry(3)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2.5 py-1.5 text-xs text-zinc-300">3 days</button>
                      <button onClick={() => handleQuickExpiry(7)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2.5 py-1.5 text-xs text-zinc-300">1 week</button>
                      <button onClick={() => handleQuickExpiry(30)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2.5 py-1.5 text-xs text-zinc-300">1 month</button>
                    </div>
                    {isPastExpiry ? <p className="mt-1 text-xs text-red-400">Expiration cannot be in the past.</p> : null}
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center justify-between rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-200">
                      <span>Pin to top</span>
                      <input
                        type="checkbox"
                        checked={draft.pinned}
                        onChange={(event) => setDraft((prev) => ({ ...prev, pinned: event.target.checked }))}
                        className="h-4 w-4 accent-[#c81d25]"
                      />
                    </label>
                    {draft.pinned ? <p className="text-xs text-zinc-500">Pinned announcements appear first.</p> : null}

                    <label className={`flex items-center justify-between rounded-md border px-2.5 py-2 text-sm ${canUseAckToggle ? 'border-[#2a2a2a] bg-[#151515] text-zinc-200' : 'border-[#232323] bg-[#121212] text-zinc-500'}`}>
                      <span>Require staff acknowledgement</span>
                      <input
                        type="checkbox"
                        checked={draft.ackRequired}
                        disabled={!canUseAckToggle}
                        onChange={(event) => setDraft((prev) => ({ ...prev, ackRequired: event.target.checked }))}
                        className="h-4 w-4 accent-[#c81d25]"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <aside className="rounded-xl border border-[#242424] bg-[#101010] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Live preview</p>
                <div className="rounded-lg border border-[#222] bg-[#0e0e0e] px-3 py-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagChipClass[draft.tag]}`}>
                      {draft.tag}
                    </span>
                    {draft.pinned ? <span className="text-xs text-zinc-300">📌</span> : null}
                  </div>
                  <p className="truncate text-sm font-medium text-zinc-100">{draft.title || 'Announcement title preview'}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Audience: {audienceLabel[draft.audience]} <span className="mx-1.5">•</span> Expires: {formatDateLabel(draft.expiresAt)}
                  </p>
                </div>
              </aside>
            </div>
          ) : activeTab === 'manage' ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar announcements..."
                  className="rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-100 outline-none lg:col-span-2"
                />
                <select value={filterTag} onChange={(event) => setFilterTag(event.target.value as 'all' | AnnouncementTag)} className="rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-100 outline-none">
                  <option value="all">Todos types</option>
                  <option value="URGENT">Urgent</option>
                  <option value="INFO">Info</option>
                  <option value="EVENT">Event</option>
                  <option value="PAYMENTS">Pagamentos</option>
                </select>
                <select value={filterAudience} onChange={(event) => setFilterAudience(event.target.value as 'all' | AnnouncementAudience)} className="rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-100 outline-none">
                  <option value="all">Todos audiences</option>
                  <option value="ALL">Todos</option>
                  <option value="ADULTS">Adultos</option>
                  <option value="KIDS">Crianças</option>
                  <option value="STAFF">Staff</option>
                </select>
                <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as 'all' | 'ativo' | 'expired')} className="rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-100 outline-none">
                  <option value="all">Todos status</option>
                  <option value="ativo">Ativo</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="flex items-center justify-end">
                <select value={filterPinned} onChange={(event) => setFilterPinned(event.target.value as 'all' | 'pinned' | 'unpinned')} className="rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-100 outline-none">
                  <option value="all">Todos pin states</option>
                  <option value="pinned">Pinned</option>
                  <option value="unpinned">Unpinned</option>
                </select>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#242424]">
                {manageRows.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-zinc-500">Não announcements match these filters.</p>
                ) : (
                  <ul>
                    {manageRows.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f1f1f] bg-[#101010] px-3 py-2.5 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagChipClass[item.tag]}`}>
                              {item.tag}
                            </span>
                            {item.pinned ? <span className="text-xs text-zinc-300">📌</span> : null}
                          </div>
                          <p className="truncate text-sm text-zinc-100">{item.title}</p>
                          <p className="text-xs text-zinc-500">Audience: {audienceLabel[item.audience]} • Expires: {formatDateLabel(item.expiresAt)} • Estado: {item.approvalStatus}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button onClick={() => loadIntoComposer(item)} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2.5 py-1 text-xs text-zinc-200">Editar</button>
                          <button onClick={() => { 
                            onTogglePin(item.id).catch(console.error); 
                          }} className="rounded-md border border-[#2a2a2a] bg-[#171717] px-2.5 py-1 text-xs text-zinc-200">
                            {item.pinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button onClick={() => { 
                            onDelete(item.id).catch(console.error); 
                          }} className="rounded-md border border-[#5b1f24] bg-[rgba(91,31,36,0.25)] px-2.5 py-1 text-xs text-rose-300">Eliminar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-[#242424] bg-[#101010] px-3 py-2 text-xs text-zinc-400">
                Pendente announcements are submitted by coaches and require staff/admin approval before publishing.
              </div>

              <div className="overflow-hidden rounded-xl border border-[#242424]">
                {pendingRows.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-zinc-500">Não pendente announcements.</p>
                ) : (
                  <ul>
                    {pendingRows.map((item) => {
                      const isRejectingThis = rejectingId === item.id;
                      return (
                        <li key={item.id} className="border-b border-[#1f1f1f] bg-[#101010] px-3 py-3 last:border-b-0">
                          <div className="mb-2 flex items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagChipClass[item.tag]}`}>
                              {item.tag}
                            </span>
                            <span className="rounded-full border border-[#6b4f12] bg-[rgba(107,79,18,0.35)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-300">
                              Pendente
                            </span>
                          </div>
                          <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Audience: {audienceLabel[item.audience]} • Expires: {formatDateLabel(item.expiresAt)} • Created by: {item.createdBy || 'Unknown'}
                          </p>

                          {isRejectingThis ? (
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                              <input
                                value={rejectReasonById[item.id] || ''}
                                onChange={(event) =>
                                  setRejectReasonById((prev) => ({ ...prev, [item.id]: event.target.value }))
                                }
                                placeholder="Rejection reason (optional)"
                                className="flex-1 rounded-md border border-[#2a2a2a] bg-[#151515] px-2.5 py-2 text-sm text-zinc-100 outline-none"
                              />
                              <button
                                onClick={() => {
                                  onReject(item.id, rejectReasonById[item.id]).catch(console.error);
                                  setRejectingId(null);
                                }}
                                className="rounded-md border border-[#7f1d1d] bg-[rgba(127,29,29,0.28)] px-3 py-2 text-xs font-semibold text-rose-300"
                              >
                                Confirmar reject
                              </button>
                              <button
                                onClick={() => setRejectingId(null)}
                                className="rounded-md border border-[#2a2a2a] bg-[#171717] px-3 py-2 text-xs text-zinc-300"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : null}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { 
                                onApprove(item.id).catch(console.error); 
                              }}
                              className="rounded-md border border-[#14532d] bg-[rgba(20,83,45,0.35)] px-2.5 py-1 text-xs font-semibold text-green-300"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingId(item.id)}
                              className="rounded-md border border-[#7f1d1d] bg-[rgba(127,29,29,0.28)] px-2.5 py-1 text-xs font-semibold text-rose-300"
                            >
                              Reject
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
