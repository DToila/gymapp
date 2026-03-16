"use client";

import { useRouter } from 'next/navigation';
import DashboardView from '@/components/dashboard/DashboardPage';

export default function DashboardPage() {
  const router = useRouter();

  return <DashboardView onLogout={() => router.push('/')} />;
}
