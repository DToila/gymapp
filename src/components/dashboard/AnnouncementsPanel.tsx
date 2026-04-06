"use client";

import { useMemo, useState } from 'react';
import AnnouncementsModal from './AnnouncementsModal';
import { AnnouncementItem } from './types';
import { useAnnouncements } from '@/lib/useAnnouncements';

const tagChipClass: Record<AnnouncementItem['tag'], string> = {
  URGENT: 'border-[#7f1d1d] bg-[rgba(127,29,29,0.28)] text-[#fda4af]',
  INFO: 'border-[#3f3f46] bg-[rgba(63,63,70,0.28)] text-zinc-300',
  EVENT: 'border-[#581c87] bg-[rgba(88,28,135,0.26)] text-violet-300',
  PAYMENTS: 'border-[#7c2d12] bg-[rgba(124,45,18,0.3)] text-orange-300',
};


const formatDateLabel = (dateValue: string): string => {
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function AnnouncementsPanel({
  maxVisible = 3,
  canCreate = true,
  currentUserName = 'Professor',
  currentUserId = 'local-user',
}: {
  maxVisible?: number;
  canCreate?: boolean;
  currentUserName?: string;
  currentUserId?: string;
}) {
  const {
    announcements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
  } = useAnnouncements();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'manage'>('create');

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [announcements]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const publishedActiveAnnouncements = useMemo(
    () =>
      sortedAnnouncements.filter(
        (item) => item.approvalStatus === 'approved' && item.expiresAt >= today
      ),
    [sortedAnnouncements, today]
  );

  const visible = publishedActiveAnnouncements.slice(0, maxVisible);

  const openCreate = () => {
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openManage = () => {
    setModalMode('manage');
    setIsModalOpen(true);
  };

  const handleCreate = async (announcement: Omit<AnnouncementItem, 'id' | 'createdAt'>) => {
    try {
      await createAnnouncement({
        ...announcement,
        approvalStatus: 'approved',
        createdBy: currentUserName,
        createdById: currentUserId,
        approvedBy: currentUserName,
        approvedById: currentUserId,
        approvedAt: new Date().toISOString(),
        rejectionReason: null,
      });
    } catch (error) {
      console.error('Falhado to create announcement:', error);
    }
  };

  const handleUpdate = async (id: string, announcement: Omit<AnnouncementItem, 'id' | 'createdAt'>) => {
    try {
      await updateAnnouncement(id, announcement);
    } catch (error) {
      console.error('Falhado to update announcement:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
    } catch (error) {
      console.error('Falhado to delete announcement:', error);
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await togglePin(id);
    } catch (error) {
      console.error('Falhado to toggle pin:', error);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-[#252525] bg-[#121212] shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-[#202020] px-5 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="text-[#c81d25]">📣</span>
            <h3>Anúncios</h3>
          </div>

          <div className="flex items-center gap-3">
            {canCreate ? (
              <button
                onClick={openCreate}
                className="rounded-md border border-[#2d2d2d] bg-[#161616] px-2.5 py-1 text-xs font-semibold text-zinc-200 transition hover:border-[#c81d25] hover:text-white"
              >
                + New
              </button>
            ) : null}
            <button onClick={openManage} className="text-sm font-medium text-[#c81d25] hover:text-[#ef3a43]">
              Ver tudo
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="min-h-[220px]">
            {visible.length === 0 ? (
              <p className="py-4 text-sm text-zinc-500">Não announcements right now.</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((item) => (
                  <li key={item.id} className={`rounded-lg border px-3 py-2.5 ${item.audience === 'STAFF' ? 'border-[#3a2a0a] bg-[#0f0b04]' : 'border-[#222] bg-[#101010]'}`}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagChipClass[item.tag]}`}>
                        {item.tag}
                      </span>
                      {item.audience === 'STAFF' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#78490a] bg-[rgba(120,73,10,0.25)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-300">
                          🔒 Só Staff
                        </span>
                      )}
                      {item.pinned ? <span className="text-xs text-zinc-300" title="Pinned">📌</span> : null}
                    </div>

                    <p className="truncate text-sm font-medium text-zinc-100">{item.title}</p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Expires: {formatDateLabel(item.expiresAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#1f1f1f] pt-3 text-sm">
            <span className="text-zinc-500">Showing {visible.length} of {publishedActiveAnnouncements.length} published</span>
            <button onClick={openManage} className="font-medium text-[#c81d25] hover:text-[#ef3a43]">
              Manage
            </button>
          </div>
        </div>
      </section>

      <AnnouncementsModal
        isOpen={isModalOpen}
        mode={modalMode}
        announcements={sortedAnnouncements}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
      />
    </>
  );
}
