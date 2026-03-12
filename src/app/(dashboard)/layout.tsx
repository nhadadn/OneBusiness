import { DashboardProviders } from '@/app/(dashboard)/providers';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardProviders>{children}</DashboardProviders>;
}
