"use client";

import { useRouter } from 'next/navigation';
import TeacherDashboard from '@/components/TeacherDashboard';

export default function DashboardPage() {
  const router = useRouter();

  return <TeacherDashboard onLogout={() => router.push('/')} />;
}
