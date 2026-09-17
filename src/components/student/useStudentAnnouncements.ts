'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { AnnouncementItem } from '../dashboard/types';
import { AnnouncementRow, rowToItem } from '@/lib/useAnnouncements';
import { toDateKey } from '@/lib/attendanceState';

// Read-only, server-filtered sibling of the admin useAnnouncements hook.
// Staff need every announcement ever created (including pending/rejected/
// expired) to manage them, so that hook can't be narrowed without breaking
// the admin "manage" view — left untouched. Students only ever need
// approved, not-yet-expired ones, so this filters server-side instead of
// fetching the whole table and filtering client-side.
const fetchStudentAnnouncements = async (): Promise<AnnouncementItem[]> => {
  const today = toDateKey(new Date());
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('approval_status', 'approved')
    .gte('expires_at', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching student announcements:', error);
    return [];
  }

  return (data as AnnouncementRow[]).map(rowToItem);
};

export function useStudentAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchStudentAnnouncements().then((items) => {
      if (!cancelled) {
        setAnnouncements(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { announcements, loading };
}
