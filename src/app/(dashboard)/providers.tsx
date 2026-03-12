'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = React.useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="container mx-auto flex items-center justify-between gap-3 py-3">
            <Link href="/dashboard" className="text-sm font-semibold text-[#1e3a5f]">
              OneBusiness
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-600">
                  {user.nombre} ({user.rol})
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Cerrar sesión
                </Button>
              </div>
            ) : null}
          </div>
        </header>

        <main>{children}</main>
      </div>
    </QueryClientProvider>
  );
}
