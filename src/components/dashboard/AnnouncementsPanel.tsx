"use client";

import { useMemo, useState } from 'react';
import AnnouncementsModal from './AnnouncementsModal';
import { AnnouncementAudience, AnnouncementItem, AppRole } from './types';
import { useAnnouncements } from '@/lib/useAnnouncements';

const tagChipClass: Record<AnnouncementItem['tag'], string> = {
  URGENT: 'border-[#7f1d1d] bg-[rgba(127,29,29,0.28)] text-[#fda4af]',
  INFO: 'border-[#3f3f46] bg-[rgba(63,63,70,0.28)] text-zinc-300',
  EVENT: 'border-[#581c87] bg-[rgba(88,28,135,0.26)] text-violet-300',
  PAYMENTS: 'border-[#7c2d12] bg-[rgba(124,45,18,0.3)] text-orange-300',
};

const audienceLabel: Record<AnnouncementAudience, string> = {
  ALL: 'All',
  ADULTS: 'Adults',
  KIDS: 'Kids',
  STAFF: 'Staff',
};

const formatDateLabel = (dateValue: string): string => {
  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function AnnouncementsPanel({
  maxVisible = 3,
  canCreate = true,
  currentUserRole = 'admin',
  currentUserName = 'Professor',
  currentUserId = 'local-user',
}: {
  maxVisible?: number;
  canCreate?: boolean;
  currentUserRole?: AppRole;
  currentUserName?: string;
  currentUserId?: string;
}) {
  const {
    announcements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
    approveAnnouncement,
    rejectAnnouncement,
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

  const pendingApprovals = useMemo(
    () => sortedAnnouncements.filter((item) => item.approvalStatus === 'pending'),
    [sortedAnnouncements]
  );

  const visible = publishedActiveAnnouncements.slice(0, maxVisible);

  const canApprove = currentUserRole === 'staff' || currentUserRole === 'admin';

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
      const isCoach = currentUserRole === 'coach';
      await createAnnouncement({
        ...announcement,
        approvalStatus: isCoach ? 'pending' : 'approved',
        createdBy: currentUserName,
        createdById: currentUserId,
        approvedBy: isCoach ? null : currentUserName,
        approvedById: isCoach ? null : currentUserId,
        approvedAt: isCoach ? null : new Date().toISOString(),
        rejectionReason: null,
      });
    } catch (error) {
      console.error('Failed to create announcement:', error);
    }
  };

  const handleUpdate = async (id: string, announcement: Omit<AnnouncementItem, 'id' | 'createdAt'>) => {
    try {
      await updateAnnouncement(id, announcement);
    } catch (error) {
      console.error('Failed to update announcement:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  const handleTogglePin = async (id: string) => {
    try {
      await togglePin(id);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveAnnouncement(id, currentUserName);
    } catch (error) {
      console.error('Failed to approve announcement:', error);
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    try {
      await rejectAnnouncement(id, reason ?? null, currentUserName);
    } catch (error) {
      console.error('Failed to reject announcement:', error);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-[#252525] bg-[#121212] shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between border-b border-[#202020] px-5 py-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <span className="text-[#c81d25]">📣</span>
            <h3>Announcements</h3>
            {canApprove && pendingApprovals.length > 0 ? (
              <span className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#c81d25] px-1.5 text-[10px] font-bold text-white">
                {pendingApprovals.length}
              </span>
            ) : null}
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
              View all
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="min-h-[220px]">
            {visible.length === 0 ? (
              <p className="py-4 text-sm text-zinc-500">No announcements right now.</p>
            ) : (
              <ul className="space-y-2">
                {visible.map((item) => (
                  <li key={item.id} className="rounded-lg border border-[#222] bg-[#101010] px-3 py-2.5">
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tagChipClass[item.tag]}`}>
                        {item.tag}
                      </span>
                      {item.pinned ? <span className="text-xs text-zinc-300" title="Pinned">📌</span> : null}
                    </div>

                    <p className="truncate text-sm font-medium text-zinc-100">{item.title}</p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Audience: {audienceLabel[item.audience]} <span className="mx-1.5">•</span> Expires: {formatDateLabel(item.expiresAt)}
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
        onApprove={handleApprove}
        onReject={handleReject}
        canApprove={canApprove}
        currentUserRole={currentUserRole}
      />
    </>
  );
}
