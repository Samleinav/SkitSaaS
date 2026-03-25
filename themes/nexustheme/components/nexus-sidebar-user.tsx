'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@skitsaas/sdk';

type User = {
  name?: string | null;
  email?: string | null;
};

type NexusSidebarUserProps = {
  area?: 'admin' | 'dashboard';
  themeId?: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '??';
}

export function NexusSidebarUser({
  area = 'admin',
  themeId
}: NexusSidebarUserProps) {
  const t = useI18n({ themeId, area });
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetcher('/api/user')
      .then((data) => setUser(data))
      .catch(() => {});
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleSignOut() {
    try {
      await fetch('/api/auth/sign-out', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  }

  const displayName = user?.name ?? user?.email ?? 'User';
  const displayEmail = user?.email ?? '';
  const initials = getInitials(user?.name, user?.email);
  const accountHref = area === 'dashboard' ? '/dashboard/general' : '/admin/account';

  return (
    <div ref={containerRef} className="relative mt-auto">
      {/* Popup menu — rendered above the trigger */}
      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border border-border/70 bg-popover shadow-lg"
          style={{ zIndex: 70 }}
        >
          {/* User header inside popup */}
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              {initials}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-popover-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
            </div>
          </div>

          <div className="border-t border-border/70" />

          {/* Menu items */}
          <div className="p-1">
            <Link
              href={accountHref}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <BadgeCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              {t('Account')}
            </Link>
            <Link
              href="/dashboard/subscriptions"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
              {t('Billing')}
            </Link>
            <Link
              href="/dashboard/security"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Shield className="h-4 w-4 shrink-0 text-muted-foreground" />
              {t('Security')}
            </Link>
          </div>

          <div className="border-t border-border/70" />

          <div className="p-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-popover-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
              {t('Log out')}
            </button>
          </div>
        </div>
      )}

      {/* Trigger row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/60"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
          {initials}
        </span>
        <div className="min-w-0 flex-1 text-left leading-tight">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">{displayEmail}</p>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
      </button>
    </div>
  );
}
