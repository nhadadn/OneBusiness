'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { DashboardProviders } from '@/app/(dashboard)/providers';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useAuth } from '@/hooks/use-auth';

function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProviders>
      <DashboardGuard>
        <DashboardShell>{children}</DashboardShell>
      </DashboardGuard>
    </DashboardProviders>
  );
}
