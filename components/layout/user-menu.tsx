'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useSWR, { mutate } from 'swr';
import { ArrowRight, Home, LogOut, Shield, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { type User } from '@/lib/db/schema';
import { useAreaMessages } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { enrichUser } from '@skitsaas/sdk';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getUserInitials(user: Pick<User, 'name' | 'email'>) {
  const source = (user.name || user.email || '').trim();
  if (!source) {
    return 'U';
  }

  const parts = source
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2);

  const initials = parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
  return initials || source[0]?.toUpperCase() || 'U';
}

export function UserMenu({ tone }: { tone: 'public' | 'private' }) {
  const messages = useAreaMessages('global');
  const header = messages.header;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user ? enrichUser(user).isAdmin() : false;
  const activeArea =
    pathname?.startsWith('/admin')
      ? 'admin'
      : pathname?.startsWith('/dashboard')
        ? 'dashboard'
        : null;

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    const redirectPath = pathname.startsWith('/admin') ? '/admin/login' : '/';
    router.push(redirectPath);
  }

  if (!user) {
    if (tone === 'private') {
      return (
        <>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {header.pricing}
          </Link>
          <Button asChild className="rounded-full">
            <Link href="/sign-up">{header.signUp}</Link>
          </Button>
        </>
      );
    }

    return (
      <>
        <Link
          href="/login"
          className="hidden text-xs font-medium tracking-[0.2em] text-zinc-400 uppercase transition-colors hover:text-zinc-100 sm:inline-flex"
        >
          {header.signIn}
        </Link>
        <Button
          asChild
          className="h-10 rounded-sm border border-amber-200/30 bg-amber-300/10 px-4 text-[11px] font-semibold tracking-[0.18em] text-amber-100 uppercase transition-colors hover:bg-amber-200 hover:text-black"
        >
          <Link href="/sign-up" className="inline-flex items-center gap-2">
            {header.signUp}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </>
    );
  }

  const contentClassName =
    tone === 'public'
      ? 'min-w-44 rounded-xl border border-amber-200/20 bg-black/90 p-1.5 text-zinc-100 shadow-lg backdrop-blur'
      : 'min-w-44 rounded-xl border-border/70 bg-popover/95 p-1.5 shadow-lg backdrop-blur';
  const itemClassName =
    tone === 'public'
      ? 'cursor-pointer text-zinc-100 focus:bg-amber-200/10 focus:text-amber-100'
      : 'cursor-pointer';
  const areaItems = [
    {
      key: 'dashboard' as const,
      href: '/dashboard',
      label: header.dashboard,
      icon: Home
    },
    ...(isAdmin
      ? [
          {
            key: 'admin' as const,
            href: '/admin',
            label: header.admin,
            icon: Shield
          }
        ]
      : [])
  ] satisfies Array<{
    key: 'admin' | 'dashboard';
    href: string;
    label: string;
    icon: LucideIcon;
  }>;
  const sortedAreaItems = [...areaItems].sort((left, right) => {
    if (activeArea === left.key) return -1;
    if (activeArea === right.key) return 1;
    return 0;
  });

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2',
            tone === 'public'
              ? 'focus-visible:ring-amber-200/70'
              : 'focus-visible:ring-ring'
          )}
        >
          <Avatar
            className={cn(
              'size-9 shadow-sm',
              tone === 'public'
                ? 'border border-amber-200/25 bg-zinc-900/70'
                : 'border border-border/70 bg-card'
            )}
          >
            <AvatarImage alt={user.name || ''} />
            <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={contentClassName}>
        {sortedAreaItems.map((item) => {
          const Icon = item.icon;

          return (
            <DropdownMenuItem key={item.key} className={itemClassName}>
              <Link href={item.href} prefetch={false} className="flex w-full items-center">
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuItem
          className={cn('w-full flex-1', itemClassName)}
          onSelect={() => {
            void handleSignOut();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{header.signOut}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
