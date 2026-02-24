'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { ThemeArea } from '@/lib/theme';

type ThemeAreaAssetsCleanupProps = {
  area: ThemeArea;
};

type ThemeCssAssetNode = HTMLLinkElement;

function normalizeThemeArea(area: ThemeArea): 'admin' | 'dashboard' | 'frontend' {
  if (area === 'admin' || area === 'dashboard' || area === 'frontend') {
    return area;
  }

  return 'frontend';
}

function matchesPathPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function resolveAreaFromPath(pathname: string | null): 'admin' | 'dashboard' | 'frontend' {
  const path = String(pathname ?? '').trim().toLowerCase();
  if (matchesPathPrefix(path, '/admin/login')) {
    return 'admin';
  }

  if (
    matchesPathPrefix(path, '/login') ||
    matchesPathPrefix(path, '/sign-up') ||
    matchesPathPrefix(path, '/sign-in')
  ) {
    return 'dashboard';
  }

  if (matchesPathPrefix(path, '/admin')) {
    return 'admin';
  }

  if (matchesPathPrefix(path, '/dashboard')) {
    return 'dashboard';
  }

  return 'frontend';
}

function enableCssLink(node: ThemeCssAssetNode) {
  const previousMedia = node.dataset.themeAssetPrevMedia;
  if (previousMedia !== undefined) {
    node.media = previousMedia;
    delete node.dataset.themeAssetPrevMedia;
  } else if (node.media === 'not all') {
    node.media = '';
  }

  node.disabled = false;
}

function disableCssLink(node: ThemeCssAssetNode) {
  if (node.dataset.themeAssetPrevMedia === undefined) {
    node.dataset.themeAssetPrevMedia = node.media || '';
  }

  node.disabled = true;
  node.media = 'not all';
}

function synchronizeThemeCssAssets(area: 'admin' | 'dashboard' | 'frontend') {
  const cssNodes = document.querySelectorAll<ThemeCssAssetNode>(
    'link[rel="stylesheet"][data-theme-asset-kind="css"]'
  );

  for (const node of cssNodes) {
    const assetArea = node.dataset.themeAssetArea;
    if (!assetArea) {
      continue;
    }

    if (assetArea === area) {
      enableCssLink(node);
      continue;
    }

    disableCssLink(node);
  }
}

export function ThemeAreaAssetsCleanup({ area }: ThemeAreaAssetsCleanupProps) {
  const pathname = usePathname();

  useEffect(() => {
    const expectedArea = normalizeThemeArea(area);
    const routeArea = resolveAreaFromPath(pathname);
    if (expectedArea !== routeArea) {
      return;
    }

    const synchronize = () => {
      synchronizeThemeCssAssets(expectedArea);
    };

    synchronize();
    const observer = new MutationObserver(() => {
      synchronize();
    });

    observer.observe(document.head, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['rel', 'media', 'disabled', 'data-theme-asset-kind', 'data-theme-asset-area']
    });

    return () => {
      observer.disconnect();
    };
  }, [area, pathname]);

  return null;
}

