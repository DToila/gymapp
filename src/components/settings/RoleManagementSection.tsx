'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type AppRole = 'admin' | 'staff' | 'coach';

type RoleAssignment = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
  created_at: string;
};

const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  staff: 'Staff',
  coach: 'Professor',
};

const roleOptions: AppRole[] = ['coach', 'staff', 'admin'];

export default function RoleManagementSection() {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', fullName: '', role: 'coach' as AppRole, password: '' });
  const [showForm, setShowForm] = useState(false);

  const sortedAssignments = useMemo(
    () => [...assignments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [assignments]
  );

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/invite-teacher', { method: 'GET', cache: 'no-store' });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to load role assignments.');
      }

      setAssignments(Array.isArray(json?.items) ? json.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load role assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignments();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({ email: '', fullName: '', role: 'coach', password: '' });
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.email.trim()) {
      setError('Please enter a valid email.');
      return;
    }

    setSubmitting(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch('/api/admin/invite-teacher', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          fullName: form.fullName.trim(),
          role: form.role,
          password: form.password.trim() || undefined,
          id: editingId || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to save role assignment.');
      }

      setSuccess(editingId ? 'Role updated successfully.' : 'Access assigned successfully.');
      resetForm();
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (assignment: RoleAssignment) => {
    setEditingId(assignment.id);
    setForm({
      email: assignment.email || '',
      fullName: assignment.full_name || '',
      role: assignment.role,
      password: '',
    });
    setShowForm(true);
  };

  const handleRemove = async (assignment: RoleAssignment) => {
    if (!window.confirm(`Remove access for ${assignment.email || 'this person'}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/invite-teacher', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: assignment.email || '', id: assignment.id }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to remove access.');
      }

      setSuccess('Access removed successfully.');
      await loadAssignments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove access.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Acesso & Roles</h2>
          <p className="mt-1 text-sm text-zinc-500">Adicione pessoas reais ao sistema e defina o seu acesso.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm((value) => !value);
          }}
          className="rounded-lg bg-[#c81d25] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b01720]"
        >
          {showForm ? 'Fechar' : '+ Adicionar acesso'}
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#c81d25]/40 bg-[#c81d25]/10 px-4 py-3 text-sm text-[#fda4af]">{error}</div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#22c55e]">{success}</div>
      ) : null}

      {showForm ? (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#222] bg-[#0f0f0f] p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none"
                placeholder="pessoa@dominio.com"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Nome</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))}
                className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Função</label>
              <select
                value={form.role}
                onChange={(e) => setForm((current) => ({ ...current, role: e.target.value as AppRole }))}
                className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">Password temporária (opcional)</label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                className="w-full rounded-lg border border-[#222] bg-[#121212] px-3 py-2.5 text-white focus:border-[#c81d25] focus:outline-none"
                placeholder="Deixa em branco para convidar por email"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#c81d25] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b01720] disabled:opacity-60"
            >
              {submitting ? 'A guardar...' : editingId ? 'Guardar alterações' : 'Adicionar acesso'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[#222] px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-[#121212]"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="rounded-2xl border border-[#222] bg-[#121212] p-4">
        {loading ? (
          <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">A carregar acessos...</div>
        ) : sortedAssignments.length === 0 ? (
          <div className="rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3 text-sm text-zinc-400">Ainda não existem acessos atribuídos.</div>
        ) : (
          <div className="space-y-2">
            {sortedAssignments.map((assignment) => (
              <div key={assignment.id} className="flex flex-col gap-3 rounded-lg border border-[#1f1f1f] bg-[#0f0f0f] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-white">{assignment.full_name || assignment.email || 'Pessoa sem nome'}</p>
                  <p className="text-xs text-zinc-500">{assignment.email || 'Sem email'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded-full border border-[#c81d25]/30 bg-[#c81d25]/20 px-3 py-1 text-xs font-medium text-[#f87171]">
                    {roleLabels[assignment.role]}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleEdit(assignment)}
                    className="rounded-lg border border-[#222] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-[#121212]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemove(assignment)}
                    className="rounded-lg border border-[#c81d25]/40 px-3 py-1.5 text-xs font-semibold text-[#fda4af] transition hover:bg-[#1f1214]"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
