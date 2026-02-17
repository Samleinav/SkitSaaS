'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PrivateBreadcrumb } from '@/components/ui/private-breadcrumb';

export type AdminNavLabels = {
  users: string;
  subscriptions: string;
  payments: string;
  orders: string;
  logs: string;
  appConfig: string;
};

type AdminBreadcrumbProps = {
  title: string;
  labels: AdminNavLabels;
  backToAppConfigLabel: string;
};

export function AdminBreadcrumb({
  title,
  labels,
  backToAppConfigLabel
}: AdminBreadcrumbProps) {
  const pathname = usePathname();
  const isAppConfigRoot =
    pathname === '/admin/app-config' || pathname === '/admin/app-config/';
  const showBackToAppConfig = pathname.startsWith('/admin/app-config/') && !isAppConfigRoot;

  return (
    <div className="mb-4 flex items-center gap-3">
      <PrivateBreadcrumb
        rootHref="/admin"
        rootLabel={title}
        className="flex-1"
        labels={{
          users: labels.users,
          suscriptions: labels.subscriptions,
          subscriptions: labels.subscriptions,
          payments: labels.payments,
          orders: labels.orders,
          logs: labels.logs,
          'app-config': labels.appConfig
        }}
      />

      {showBackToAppConfig ? (
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/app-config">
            <ArrowLeft className="h-4 w-4" />
            {backToAppConfigLabel}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
