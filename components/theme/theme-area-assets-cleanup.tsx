'use client';

import { useEffect } from 'react';
import type { ThemeArea } from '@/lib/theme';

type ThemeAreaAssetsCleanupProps = {
  area: ThemeArea;
  cssHrefs: string[];
  scriptHrefs: string[];
};

type ThemeAssetNode = HTMLLinkElement | HTMLScriptElement;

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

function removeStaleAssetNodes({
  area,
  cssHrefs,
  scriptHrefs
}: ThemeAreaAssetsCleanupProps) {
  const expectedCssRefs = collectExpectedRefs(cssHrefs);
  const expectedScriptRefs = collectExpectedRefs(scriptHrefs);
  const assetNodes = document.querySelectorAll<ThemeAssetNode>(
    'link[data-theme-asset-kind],script[data-theme-asset-kind]'
  );

  for (const node of assetNodes) {
    const assetKind = node.dataset.themeAssetKind;
    const assetArea = node.dataset.themeAssetArea;
    const refAttr = assetKind === 'css' ? 'href' : 'src';
    const assetRef = normalizeAssetRef(node.getAttribute(refAttr));

    if (!assetKind || !assetArea || !assetRef) {
      continue;
    }

    if (assetArea !== area) {
      node.remove();
      continue;
    }

    if (assetKind === 'css' && !expectedCssRefs.has(assetRef)) {
      node.remove();
      continue;
    }

    if (assetKind === 'js' && !expectedScriptRefs.has(assetRef)) {
      node.remove();
    }
  }
}

export function ThemeAreaAssetsCleanup({
  area,
  cssHrefs,
  scriptHrefs
}: ThemeAreaAssetsCleanupProps) {
  useEffect(() => {
    removeStaleAssetNodes({
      area,
      cssHrefs,
      scriptHrefs
    });
  }, [area, cssHrefs, scriptHrefs]);

  return null;
}

