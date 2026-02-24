'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { ThemeArea } from '@/lib/theme';

type ThemeAreaAssetsCleanupProps = {
  area: ThemeArea;
  cssHrefs: string[];
  scriptHrefs: string[];
};

type ThemeCssAssetNode = HTMLLinkElement;

function normalizeAssetRef(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

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

function collectExpectedRefs(entries: string[]) {
  const refs = new Set<string>();
  for (const entry of entries) {
    const normalized = normalizeAssetRef(entry);
    if (!normalized) {
      continue;
    }

    refs.add(normalized);
  }

  return refs;
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

function synchronizeThemeCssAssets({
  area,
  cssHrefs
}: ThemeAreaAssetsCleanupProps) {
  const expectedCssRefs = collectExpectedRefs(cssHrefs);
  const cssNodes = document.querySelectorAll<ThemeCssAssetNode>(
    'link[rel="stylesheet"][data-theme-asset-kind="css"]'
  );

  for (const node of cssNodes) {
    const assetArea = node.dataset.themeAssetArea;
    const assetRef = normalizeAssetRef(node.getAttribute('href'));

    if (!assetArea || !assetRef) {
      continue;
    }

    if (assetArea !== area) {
      disableCssLink(node);
      continue;
    }

    if (!expectedCssRefs.has(assetRef)) {
      disableCssLink(node);
      continue;
    }

    enableCssLink(node);
  }
}

export function ThemeAreaAssetsCleanup({
  area,
  cssHrefs,
  scriptHrefs
}: ThemeAreaAssetsCleanupProps) {
  const pathname = usePathname();

  useEffect(() => {
    const expectedArea = normalizeThemeArea(area);
    const routeArea = resolveAreaFromPath(pathname);
    if (expectedArea !== routeArea) {
      return;
    }

    const synchronize = () =>
      synchronizeThemeCssAssets({
        area: expectedArea,
        cssHrefs,
        scriptHrefs
      });

    synchronize();
    const observer = new MutationObserver(() => {
      synchronize();
    });
    observer.observe(document.head, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['href', 'rel', 'media', 'disabled', 'data-theme-asset-kind', 'data-theme-asset-area']
    });

    return () => {
      observer.disconnect();
    };
  }, [area, cssHrefs, pathname, scriptHrefs]);

  return null;
}
