'use client'

import Link from 'next/link'
import TeacherSidebar from '@/components/members/TeacherSidebar'
import RoleManagementSection from '@/components/settings/RoleManagementSection'

export default function StaffSettingsPage() {
  return (
    <div className="flex min-h-screen bg-[#0b0b0b]">
      <TeacherSidebar ativo="settings" role="admin" />

      <main className="ml-[260px] flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#222] pb-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Gestão de Acessos</h1>
              <p className="mt-1 text-sm text-zinc-500">Adicione pessoas reais, atribua roles e remova acessos quando necessário.</p>
            </div>
            <Link
              href="/settings"
              className="rounded-lg border border-[#222] px-4 py-2 text-sm font-semibold text-white hover:bg-[#111]"
            >
              Voltar às Definições
            </Link>
          </div>

          <section className="rounded-2xl border border-[#222] bg-[#121212] p-6">
            <RoleManagementSection />
          </section>
        </div>
      </main>
    </div>
  )
}
