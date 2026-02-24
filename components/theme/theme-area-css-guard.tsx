'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  resolveThemeCssAreaFromHref,
  resolveThemeCssAreaFromPath,
  type ThemeCssArea
} from '@/lib/themes/area-css';

type ThemeCssLinkNode = HTMLLinkElement;

function enableCssLink(node: ThemeCssLinkNode) {
  const previousMedia = node.dataset.themeCssPrevMedia;
  if (previousMedia !== undefined) {
    node.media = previousMedia;
    delete node.dataset.themeCssPrevMedia;
  } else if (node.media === 'not all') {
    node.media = '';
  }

  node.disabled = false;
}

function disableCssLink(node: ThemeCssLinkNode) {
  if (node.dataset.themeCssPrevMedia === undefined) {
    node.dataset.themeCssPrevMedia = node.media || '';
  }

  node.disabled = true;
  node.media = 'not all';
}

function readAssetArea(node: ThemeCssLinkNode): ThemeCssArea | null {
  const datasetArea = node.dataset.themeAssetArea;
  if (
    datasetArea === 'admin' ||
    datasetArea === 'dashboard' ||
    datasetArea === 'frontend'
  ) {
    return datasetArea;
  }

  return resolveThemeCssAreaFromHref(node.getAttribute('href'));
}

function synchronizeThemeCssAssets(activeArea: ThemeCssArea) {
  const cssNodes = document.querySelectorAll<ThemeCssLinkNode>('link[rel="stylesheet"][href]');

  for (const node of cssNodes) {
    const assetArea = readAssetArea(node);
    if (!assetArea) {
      continue;
    }

    if (assetArea === activeArea) {
      enableCssLink(node);
    } else {
      disableCssLink(node);
    }
  }
}

export function ThemeAreaCssGuard() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const activeArea = resolveThemeCssAreaFromPath(pathname);
    const synchronize = () => {
      synchronizeThemeCssAssets(activeArea);
    };

    synchronize();
    const observer = new MutationObserver(() => {
      synchronize();
    });

    observer.observe(document.head, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
