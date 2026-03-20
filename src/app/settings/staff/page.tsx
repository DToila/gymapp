'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import TeacherSidebar from '@/components/members/TeacherSidebar'

type AppRole = 'admin' | 'staff' | 'coach'

type StaffProfile = {
  id: string
  email: string | null
  full_name: string | null
  role: AppRole
  created_at: string
}

const roleLabel = (role: AppRole) => {
  if (role === 'admin') return 'Admin'
  if (role === 'staff') return 'Staff'
  return 'Coach'
}

export default function StaffSettingsPage() {
  const [items, setItems] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteRole, setInviteRole] = useState<AppRole>('coach')
  const [invitePassword, setInvitePassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [items]
  )

  const loadProfiles = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/invite-teacher', { method: 'GET', cache: 'no-store' })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to load staff list.')
      }

      setItems(Array.isArray(json?.items) ? json.items : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load staff list.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProfiles()
  }, [])

  const onSubmitInvite = async (e: FormEvent) => {
    e.preventDefault()
    setSuccess(null)
    setError(null)

    if (!inviteEmail.trim()) {
      setError('Please enter a valid email.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/invite-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteFullName,
          role: inviteRole,
          password: invitePassword || undefined,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to send invitation.')
      }

      const mode = String(json?.mode || '')
      if (mode === 'created_with_password') {
        setSuccess(`Account created for ${inviteEmail} with temporary password.`)
      } else if (mode === 'password_updated') {
        setSuccess(`Temporary password updated for ${inviteEmail}.`)
      } else {
        setSuccess(`Invitation sent to ${inviteEmail}.`)
      }
      setInviteEmail('')
      setInviteFullName('')
      setInviteRole('coach')
      setInvitePassword('')
      await loadProfiles()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#0b0b0b]">
      <TeacherSidebar active="settings" role="admin" />

      <main className="ml-[260px] flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#222] pb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Staff Management</h1>
              <p className="mt-1 text-sm text-zinc-500">Invite teachers and manage admin/staff/coach roles.</p>
            </div>
            <Link
              href="/settings"
              className="rounded-lg border border-[#222] px-4 py-2 text-sm font-semibold text-white hover:bg-[#111]"
            >
              Back to Settings
            </Link>
          </div>

          {success ? (
            <div className="rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#22c55e]">{success}</div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-[#c81d25]/40 bg-[#c81d25]/10 px-4 py-3 text-sm text-[#fda4af]">{error}</div>
          ) : null}

          <section className="rounded-2xl border border-[#222] bg-[#121212] p-6">
            <h2 className="mb-4 text-xl font-semibold text-white">Invite Teacher</h2>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-4" onSubmit={onSubmitInvite}>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="coach@example.com"
                  className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Full Name (optional)</label>
                <input
                  type="text"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                  placeholder="Teacher Name"
                  className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AppRole)}
                  className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none"
                >
                  <option value="coach">Coach</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Temporary Password (optional)</label>
                <input
                  type="text"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="min 8 chars"
                  className="w-full rounded-lg border border-[#222] bg-[#0f0f0f] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none"
                />
              </div>

              <div className="md:col-span-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#c81d25] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b01720] disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Invite / Create Account'}
                </button>
                <p className="mt-2 text-xs text-zinc-500">
                  Leave password empty to send email invite. Fill password to create/update access instantly without email.
                </p>
              </div>
            </form>
          </section>

          <section className="relative rounded-2xl border border-[#222] bg-[#121212] p-6">
            <div className="absolute -top-12 right-0">
              <button className="rounded-lg border border-[#c81d25] bg-[#c81d25] px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-[#b01720] transition">
                + Invite Staff
              </button>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Staff & Roles</h2>
              <button
                onClick={loadProfiles}
                className="rounded-lg border border-[#222] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-300 hover:bg-[#111]"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">Loading staff...</div>
            ) : sortedItems.length === 0 ? (
              <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">No staff profiles found.</div>
            ) : (
              <div className="space-y-2">
                {sortedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3">
                    <div>
                      <p className="font-medium text-white">{item.full_name || 'No name'}</p>
                      <p className="text-xs text-zinc-500">{item.email || 'No email'}</p>
                    </div>
                    <span className="inline-block rounded-full border border-[#c81d25]/30 bg-[#c81d25]/20 px-3 py-1 text-xs font-medium text-[#f87171]">
                      {roleLabel(item.role)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
