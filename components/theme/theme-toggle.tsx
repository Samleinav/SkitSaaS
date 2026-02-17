'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type AppTheme, THEME_MEDIA_QUERY, THEME_STORAGE_KEY } from '@/lib/theme';
import { useThemeRuntime } from '@/components/theme/theme-runtime-provider';

function resolveTheme(value: string | null): AppTheme | null {
  if (value === 'light' || value === 'dark') {
    return value;
  }

  return null;
}

function getSystemTheme(): AppTheme {
  return window.matchMedia(THEME_MEDIA_QUERY).matches ? 'dark' : 'light';
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

type ThemeToggleProps = {
  className?: string;
  size?: 'sm' | 'default';
  showLabel?: boolean;
};

export function ThemeToggle({
  className,
  size = 'sm',
  showLabel = true
}: ThemeToggleProps) {
  const themeRuntime = useThemeRuntime();
  const [theme, setTheme] = useState<AppTheme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (themeRuntime) {
      setMounted(true);
      return;
    }

    const storedTheme = resolveTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
    const initialTheme = storedTheme ?? getSystemTheme();

    applyTheme(initialTheme);
    setTheme(initialTheme);
    setMounted(true);
  }, [themeRuntime]);

  function toggleTheme() {
    if (themeRuntime) {
      themeRuntime.toggleTheme();
      return;
    }

    if (!mounted) {
      return;
    }

    const nextTheme: AppTheme = theme === 'dark' ? 'light' : 'dark';

    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  const isDark = themeRuntime
    ? themeRuntime.resolvedMode === 'dark'
    : theme === 'dark';
  const title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const isDisabled = themeRuntime
    ? !themeRuntime.allowUserOverride || themeRuntime.isPending
    : !mounted;

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={toggleTheme}
      disabled={isDisabled}
      className={cn(
        'group gap-2 rounded-full border-border/70 bg-background/90 pr-2 pl-3 backdrop-blur-sm transition-colors hover:bg-accent/70',
        className
      )}
      aria-label={title}
      title={title}
    >
      <span className="relative flex h-5 w-10 items-center rounded-full border border-border/70 bg-muted/80 px-[3px]">
        <Sun
          className={cn(
            'h-3.5 w-3.5 text-amber-500 transition-opacity',
            isDark ? 'opacity-45' : 'opacity-100'
          )}
        />
        <Moon
          className={cn(
            'ml-auto h-3.5 w-3.5 text-slate-500 transition-opacity dark:text-slate-300',
            isDark ? 'opacity-100' : 'opacity-45'
          )}
        />
        <span
          className={cn(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform',
            isDark ? 'translate-x-[20px]' : 'translate-x-0'
          )}
        />
      </span>
      {showLabel ? (
        <span className="text-xs font-medium sm:text-sm">
          {isDark ? 'Dark' : 'Light'}
        </span>
      ) : null}
    </Button>
  );
}
