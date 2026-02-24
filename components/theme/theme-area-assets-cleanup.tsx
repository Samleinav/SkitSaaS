'use client';

import { useEffect } from 'react';
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
  useEffect(() => {
    synchronizeThemeCssAssets({
      area,
      cssHrefs,
      scriptHrefs
    });
  }, [area, cssHrefs, scriptHrefs]);

  return null;
}
