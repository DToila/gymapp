"use client";

import { useCallback, useEffect, useState } from 'react';
import { getStudentMemberById } from '../../../lib/database';
import { Member, getAgeFromDateOfBirth } from '../../../lib/types';
import { readStudentSessionId } from './studentSession';

// Every student page wraps itself in <StudentShell>, and several pages also
// call this hook directly on top of that — that used to mean up to 2
// identical getMemberById round trips per page load, repeated from scratch
// on every sidebar navigation (no caching at all). Cached at module level
// per student id, same pattern as useStaffProfile on the admin side: the
// first caller does the real fetch, everyone else (including later
// navigations in the same session) reuses it.
let cachedId: string | null = null;
let cachedPromise: Promise<Member | null> | null = null;

const fetchMember = (id: string): Promise<Member | null> =>
  getStudentMemberById(id).catch((error) => {
    console.error('Error loading student member:', error);
    return null;
  });

export function useStudentMember() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  // Forces a fresh fetch, bypassing the cache — used after editing the
  // profile, where the cached (now-stale) record must not be served again.
  const refresh = useCallback(async (currentId?: string | null) => {
    const id = currentId ?? readStudentSessionId();
    if (!id) {
      cachedId = null;
      cachedPromise = null;
      setStudentId(null);
      setMember(null);
      setLoading(false);
      return;
    }

    setStudentId(id);
    setLoading(true);
    cachedId = id;
    cachedPromise = fetchMember(id);
    const data = await cachedPromise;
    setMember(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const id = readStudentSessionId();

    if (!id) {
      setStudentId(null);
      setMember(null);
      setLoading(false);
      return;
    }

    setStudentId(id);
    if (cachedId !== id || !cachedPromise) {
      cachedId = id;
      cachedPromise = fetchMember(id);
    }

    cachedPromise.then((data) => {
      if (!cancelled) {
        setMember(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const age = getAgeFromDateOfBirth(member?.date_of_birth);
  const isKid = age !== null && age < 16;

  return {
    studentId,
    member,
    loading,
    age,
    isKid,
    refresh,
  };
}
