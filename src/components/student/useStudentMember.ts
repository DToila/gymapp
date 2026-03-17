"use client";

import { useCallback, useEffect, useState } from 'react';
import { getMemberById } from '../../../lib/database';
import { Member, getAgeFromDateOfBirth } from '../../../lib/types';
import { readStudentSessionId } from './studentSession';

export function useStudentMember() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (currentId?: string | null) => {
    const id = currentId ?? readStudentSessionId();
    if (!id) {
      setStudentId(null);
      setMember(null);
      setLoading(false);
      return;
    }

    setStudentId(id);
    setLoading(true);
    try {
      const data = await getMemberById(id);
      setMember(data);
    } catch (error) {
      console.error('Error loading student member:', error);
      setMember(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
