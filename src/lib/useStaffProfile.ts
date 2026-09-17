'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export type AppRole = 'admin' | 'staff' | 'coach';

export interface StaffProfile {
  role: AppRole;
  name: string;
  email: string | null;
}

const isRole = (value: string): value is AppRole => value === 'admin' || value === 'staff' || value === 'coach';

const roleFromMetadata = (metadata: unknown): AppRole | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const roleValue = (metadata as { role?: unknown }).role;
  return typeof roleValue === 'string' && isRole(roleValue) ? roleValue : null;
};

const fullNameFromMetadata = (metadata: unknown): string | null => {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as { full_name?: unknown }).full_name;
  return typeof value === 'string' && value.trim() ? value : null;
};

const DEFAULT_PROFILE: StaffProfile = { role: 'coach', name: 'Instrutor', email: null };

// Every page with a sidebar was independently calling auth.getUser() + a
// profiles select on its own mount — up to 3 identical round trips per page
// load, none of them shared. This module-level cache means the first caller
// on a given page (or across client-side navigations in the same session)
// does the real fetch and every other caller just awaits the same promise or
// reads the already-resolved value.
let cachedPromise: Promise<StaffProfile> | null = null;

const fetchStaffProfile = async (): Promise<StaffProfile> => {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) return DEFAULT_PROFILE;

  const { data } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();

  const role =
    (data?.role && isRole(data.role) ? data.role : null) ||
    roleFromMetadata(user.user_metadata) ||
    roleFromMetadata(user.app_metadata) ||
    'coach';

  const name = data?.full_name || fullNameFromMetadata(user.user_metadata) || fullNameFromMetadata(user.app_metadata) || 'Instrutor';

  return { role, name, email: user.email || null };
};

// Invalidate on sign-in/sign-out so switching accounts (or logging back in
// after SessionTimeoutGuard's forced logout) doesn't keep serving a stale
// cached profile from the previous session.
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
      cachedPromise = null;
    }
  });
}

export function useStaffProfile(): StaffProfile & { loading: boolean } {
  const [profile, setProfile] = useState<StaffProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!cachedPromise) cachedPromise = fetchStaffProfile();

    cachedPromise
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch((error) => {
        console.error('useStaffProfile: failed to load profile', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { ...profile, loading };
}
