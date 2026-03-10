'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  type ThemeArea,
  type ThemeMode
} from '@/lib/theme';
import { THEME_TOKENS_STYLE_ID } from '@/lib/themes/constants';

export type ThemeRuntimeContextValue = {
  area: ThemeArea;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  themeKey: string | null;
  allowUserOverride: boolean;
  isPending: boolean;
  toggleTheme: () => void;
};

const ThemeRuntimeContext = createContext<ThemeRuntimeContextValue | null>(null);

function resolveResolvedMode(mode: ThemeMode, prefersDark: boolean) {
  if (mode === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return mode;
}

function resolveStoredMode(): ThemeMode | null {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (value === 'light' || value === 'dark') {
    return value;
  }

  return null;
}

function applyTheme({
  resolvedMode,
  area,
  themeKey,
  mode
}: {
  resolvedMode: 'light' | 'dark';
  area: ThemeArea;
  themeKey: string | null;
  mode: ThemeMode;
}) {
  const root = document.documentElement;
  root.classList.toggle('dark', resolvedMode === 'dark');
  root.style.colorScheme = resolvedMode;
  root.dataset.themeArea = area;
  root.dataset.themeMode = mode;

  if (themeKey) {
    root.dataset.themeKey = themeKey;
  } else {
    delete root.dataset.themeKey;
  }
}

function applyThemeTokens({
  area,
  themeKey,
  tokensCss
}: {
  area: ThemeArea;
  themeKey: string | null;
  tokensCss: string | null;
}) {
  const existingStyle = document.getElementById(
    THEME_TOKENS_STYLE_ID
  ) as HTMLStyleElement | null;
  const normalizedCss = tokensCss?.trim() ?? '';

  if (!normalizedCss) {
    existingStyle?.remove();
    return null;
  }

  const style = existingStyle ?? document.createElement('style');
  if (!existingStyle) {
    style.id = THEME_TOKENS_STYLE_ID;
    style.dataset.themeRuntimeManaged = 'true';
    document.head.appendChild(style);
  }

  if (style.textContent !== normalizedCss) {
    style.textContent = normalizedCss;
  }

  style.dataset.themePackArea = area;
  if (themeKey) {
    style.dataset.themePackKey = themeKey;
  } else {
    delete style.dataset.themePackKey;
  }

  return style;
}

export function ThemeRuntimeProvider({
  area,
  initialMode,
  initialThemeKey,
  initialTokensCss = null,
  allowUserOverride,
  children
}: {
  area: ThemeArea;
  initialMode: ThemeMode;
  initialThemeKey: string | null;
  initialTokensCss?: string | null;
  allowUserOverride: boolean;
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [themeKey] = useState<string | null>(initialThemeKey);
  // Read the media query synchronously on the client so the first render
  // already has the correct value and applyTheme never briefly removes the
  // dark class that the inline runtime script already set.
  const [prefersDark, setPrefersDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(THEME_MEDIA_QUERY).matches;
  });
  const isPending = false;

  useEffect(() => {
    const media = window.matchMedia(THEME_MEDIA_QUERY);
    const updatePreference = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersDark(event.matches);
    };

    updatePreference(media);

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updatePreference);
      return () => media.removeEventListener('change', updatePreference);
    }

    media.addListener(updatePreference);
    return () => media.removeListener(updatePreference);
  }, []);

  const resolvedMode = resolveResolvedMode(mode, prefersDark);

  useEffect(() => {
    if (!allowUserOverride) {
      return;
    }

    const storedMode = resolveStoredMode();
    if (!storedMode) {
      return;
    }

    setMode(storedMode);
  }, [allowUserOverride]);

  useEffect(() => {
    applyTheme({ resolvedMode, area, themeKey, mode });
  }, [resolvedMode, area, themeKey, mode]);

  useEffect(() => {
    const style = applyThemeTokens({
      area,
      themeKey,
      tokensCss: initialTokensCss
    });

    return () => {
      if (style?.dataset.themeRuntimeManaged === 'true') {
        style.remove();
      }
    };
  }, [area, themeKey, initialTokensCss]);

  function toggleTheme() {
    if (!allowUserOverride) {
      return;
    }

    const nextMode: ThemeMode = resolvedMode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }

  const value = useMemo(
    () => ({
      area,
      mode,
      resolvedMode,
      themeKey,
      allowUserOverride,
      isPending,
      toggleTheme
    }),
    [area, mode, resolvedMode, themeKey, allowUserOverride, isPending]
  );

  return (
    <ThemeRuntimeContext.Provider value={value}>
      {children}
    </ThemeRuntimeContext.Provider>
  );
}

export function useThemeRuntime() {
  return useContext(ThemeRuntimeContext);
}
