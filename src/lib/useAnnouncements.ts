import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AnnouncementItem } from '@/components/dashboard/types';

export interface AnnouncementRow {
  id: string;
  tag: string;
  title: string;
  details: string | null;
  audience: string;
  kids_group: string | null;
  expires_at: string;
  pinned: boolean;
  ack_required: boolean;
  approval_status: string;
  created_by: string | null;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
}

const rowToItem = (row: AnnouncementRow): AnnouncementItem => ({
  id: row.id,
  tag: row.tag as any,
  title: row.title,
  details: row.details || undefined,
  audience: row.audience as any,
  kidsGroup: (row.kids_group as any) || undefined,
  expiresAt: row.expires_at,
  pinned: row.pinned,
  ackRequired: row.ack_required,
  approvalStatus: row.approval_status as any,
  createdAt: row.created_at,
  createdBy: row.created_by || undefined,
  approvedBy: row.approved_by || undefined,
  approvedAt: row.approved_at || undefined,
  rejectionReason: row.rejection_reason || undefined,
  approvedById: undefined,
  createdById: undefined,
});

const itemToRow = (item: Omit<AnnouncementItem, 'id' | 'createdAt'>) => ({
  tag: item.tag,
  title: item.title,
  details: item.details || null,
  audience: item.audience,
  kids_group: item.kidsGroup || null,
  expires_at: item.expiresAt,
  pinned: item.pinned || false,
  ack_required: item.ackRequired || false,
  approval_status: item.approvalStatus,
  created_by: item.createdBy || null,
  approved_by: item.approvedBy || null,
  approved_at: item.approvedAt || null,
  rejection_reason: item.rejectionReason || null,
});

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const { data, error: err } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;

      const items = (data as AnnouncementRow[]).map(rowToItem);
      setAnnouncements(items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch announcements');
      console.error('Error fetching announcements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create announcement
  const createAnnouncement = async (announcement: Omit<AnnouncementItem, 'id' | 'createdAt'>) => {
    try {
      const row = itemToRow(announcement);
      const { data, error: err } = await supabase
        .from('announcements')
        .insert([row])
        .select()
        .single();

      if (err) throw err;

      const newItem = rowToItem(data as AnnouncementRow);
      setAnnouncements((prev) => [newItem, ...prev]);
      return newItem;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create announcement';
      setError(message);
      throw err;
    }
  };

  // Update announcement
  const updateAnnouncement = async (id: string, announcement: Omit<AnnouncementItem, 'id' | 'createdAt'>) => {
    try {
      const row = itemToRow(announcement);
      const { data, error: err } = await supabase
        .from('announcements')
        .update(row)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;

      const updatedItem = rowToItem(data as AnnouncementRow);
      setAnnouncements((prev) =>
        prev.map((item) => (item.id === id ? updatedItem : item))
      );
      return updatedItem;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update announcement';
      setError(message);
      throw err;
    }
  };

  // Delete announcement
  const deleteAnnouncement = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (err) throw err;

      setAnnouncements((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete announcement';
      setError(message);
      throw err;
    }
  };

  // Toggle pin
  const togglePin = async (id: string) => {
    const current = announcements.find((a) => a.id === id);
    if (!current) return;

    try {
      const { error: err } = await supabase
        .from('announcements')
        .update({ pinned: !current.pinned })
        .eq('id', id);

      if (err) throw err;

      setAnnouncements((prev) =>
        prev.map((item) => (item.id === id ? { ...item, pinned: !item.pinned } : item))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle pin';
      setError(message);
      throw err;
    }
  };

  // Approve announcement
  const approveAnnouncement = async (id: string, approverName: string) => {
    try {
      const { error: err } = await supabase
        .from('announcements')
        .update({
          approval_status: 'approved',
          approved_by: approverName,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', id);

      if (err) throw err;

      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                approvalStatus: 'approved',
                approvedBy: approverName,
                approvedAt: new Date().toISOString(),
                rejectionReason: null,
              }
            : item
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve announcement';
      setError(message);
      throw err;
    }
  };

  // Reject announcement
  const rejectAnnouncement = async (
    id: string,
    rejectionReason: string | null,
    rejecterName: string
  ) => {
    try {
      const { error: err } = await supabase
        .from('announcements')
        .update({
          approval_status: 'rejected',
          approved_by: rejecterName,
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
        })
        .eq('id', id);

      if (err) throw err;

      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                approvalStatus: 'rejected',
                approvedBy: rejecterName,
                approvedAt: new Date().toISOString(),
                rejectionReason: rejectionReason || null,
              }
            : item
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject announcement';
      setError(message);
      throw err;
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  return {
    announcements,
    isLoading,
    error,
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    togglePin,
    approveAnnouncement,
    rejectAnnouncement,
  };
}
