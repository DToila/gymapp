'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { clearStudentSessionId } from '@/components/student/studentSession';

const HIDDEN_AT_KEY = 'gbcq.hiddenAt';
const TIMEOUT_MS = 60 * 1000;

const isPublicPath = (pathname: string) => pathname.startsWith('/login') || pathname.startsWith('/register');

// Web has no "app was closed" event, so this uses the closest real signal:
// how long the tab/PWA stayed hidden (backgrounded, switched away from, or
// actually closed — pagehide fires for all three). The timestamp survives in
// localStorage across a full close+relaunch, which is what lets the mount-time
// check below catch "closed the app for over a minute, then reopened it".
export default function SessionTimeoutGuard() {
  const loggingOutRef = useRef(false);

  useEffect(() => {
    const forceLogout = async () => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      clearStudentSessionId();
      await supabase.auth.signOut().catch(() => {});
      if (!isPublicPath(window.location.pathname)) {
        window.location.href = '/login';
      }
    };

    const checkElapsed = () => {
      const storedAt = window.localStorage.getItem(HIDDEN_AT_KEY);
      if (!storedAt) return;
      window.localStorage.removeItem(HIDDEN_AT_KEY);
      const elapsed = Date.now() - Number(storedAt);
      if (elapsed > TIMEOUT_MS) {
        void forceLogout();
      }
    };

    // Catches "app was fully closed and just reopened" — visibilitychange
    // never fires for that case, only this mount-time check does.
    checkElapsed();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        window.localStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
      } else {
        checkElapsed();
      }
    };

    const handlePageHide = () => {
      window.localStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  return null;
}
