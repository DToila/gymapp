"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MemberProfile from '@/components/MemberProfile';
import TeacherSidebar from '@/components/members/TeacherSidebar';
import { getMembers, updateMember as updateMemberDb } from '../../../../lib/database';

export default function MemberProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const memberId = useMemo(() => String(params?.id || ''), [params]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const members = await getMembers();
        const found = members.find((m: any) => m.id === memberId);
        if (found) {
          setMember({
            ...found,
            beltLevel: (found as any).belt_level,
            paymentType: (found as any).payment_type,
            monthlyFee: (found as any).fee,
            familyDiscount: (found as any).family_discount
          });
        } else {
          setMember(null);
        }
      } catch (error) {
        console.error('Erro loading member profile by id:', error);
        setMember(null);
      } finally {
        setLoading(false);
      }
    };

    if (memberId) load();
  }, [memberId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', display: 'flex' }}>
        <TeacherSidebar ativo="members" onAddMember={() => router.push('/members?openAddMember=1')} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>A carregar...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', display: 'flex' }}>
        <TeacherSidebar ativo="members" onAddMember={() => router.push('/members?openAddMember=1')} />
        <div style={{ flex: 1, padding: '24px' }}>
          <button onClick={() => router.push('/members')} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#999', padding: '8px 10px', cursor: 'pointer', marginBottom: '20px' }}>← Voltar</button>
          <div>Membro not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f0f0f0', display: 'flex' }}>
      <TeacherSidebar ativo="members" onAddMember={() => router.push('/members?openAddMember=1')} />
      <div style={{ flex: 1 }}>
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
              nif: (updatedMember as any).nif
            };

            const saved = await updateMemberDb((updatedMember as any).id, payload);
            setMember((prev: any) => ({
              ...(prev || {}),
              ...saved,
              beltLevel: (saved as any).belt_level,
              paymentType: (saved as any).payment_type,
              monthlyFee: (saved as any).fee,
              familyDiscount: (saved as any).family_discount
            }));
          }}
        />
      </div>
    </div>
  );
}
