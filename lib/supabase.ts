import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
	'placeholder-key'

// createBrowserClient (not plain supabase-js createClient) so the session is
// persisted via cookies instead of localStorage-only — server-side code
// (middleware.ts, lib/supabaseServer.ts, every /api/admin/* route) reads the
// session from cookies, so a localStorage-only session is invisible to them
// and every server-side auth check fails with "Unauthorized", even though
// the browser itself is clearly logged in.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)