"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MemberProfile from '@/components/MemberProfile';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { getMemberById, updateMember as updateMemberDb } from '../../../../lib/database';

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const memberId = useMemo(() => String(params?.id || ''), [params]);

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    getMemberById(memberId)
      .then((found) => {
        if (found) {
          setMember({
            ...found,
            beltLevel: found.belt_level,
            paymentType: found.payment_type,
            monthlyFee: found.fee,
            familyDiscount: found.family_discount,
          });
        } else {
          setMember(null);
        }
      })
      .catch((err) => {
        console.error('Erro loading member profile:', err);
        setMember(null);
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  return (
    <div className="flex min-h-screen bg-[#0b0b0b] text-zinc-100">
      <TeacherSidebar ativo="members" onAddMember={() => router.push('/members?openAddMember=1')} />

      <main className="flex-1 overflow-y-auto">
        {loading ? (
          /* Skeleton — layout stays, only content pulses */
          <div className="max-w-5xl mx-auto p-6 animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="h-9 w-24 rounded-xl bg-zinc-800" />
              <div className="h-9 w-32 rounded-xl bg-zinc-800" />
            </div>
            <div className="rounded-2xl border border-[#222] bg-[#121212] p-6 mb-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-full bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-6 w-48 rounded bg-zinc-800" />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 rounded-full bg-zinc-800" />
                    <div className="h-5 w-16 rounded-full bg-zinc-800" />
                  </div>
                  <div className="grid grid-cols-3 gap-6 mt-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="space-y-1">
                        <div className="h-3 w-12 rounded bg-zinc-800" />
                        <div className="h-4 w-28 rounded bg-zinc-700" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="h-20 rounded-2xl bg-zinc-800/50 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-64 rounded-2xl bg-zinc-800/50" />
              <div className="h-64 rounded-2xl bg-zinc-800/50" />
            </div>
          </div>
        ) : !member ? (
          <div className="p-6">
            <button
              onClick={() => router.push('/members')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-6"
            >
              ← Voltar
            </button>
            <p className="text-zinc-500">Membro não encontrado.</p>
          </div>
        ) : (
          <MemberProfile
            member={member}
            onBack={() => router.push('/members')}
            onUpdate={async (updatedMember) => {
              const payload: any = {
                name: updatedMember.name,
                email: (updatedMember as any).email,
                phone: (updatedMember as any).phone,
                belt_level: (updatedMember as any).beltLevel || (updatedMember as any).belt_level,
                status: (updatedMember as any).status,
                payment_type: (updatedMember as any).paymentType || (updatedMember as any).payment_type,
                fee: Number((updatedMember as any).monthlyFee ?? (updatedMember as any).fee ?? 0),
                date_of_birth: (updatedMember as any).date_of_birth,
                iban: (updatedMember as any).iban,
                nif: (updatedMember as any).nif,
              };
              const saved = await updateMemberDb((updatedMember as any).id, payload);
              setMember((prev: any) => ({
                ...(prev || {}),
                ...saved,
                beltLevel: (saved as any).belt_level,
                paymentType: (saved as any).payment_type,
                monthlyFee: (saved as any).fee,
                familyDiscount: (saved as any).family_discount,
              }));
            }}
          />
        )}
      </main>
    </div>
  );
}
