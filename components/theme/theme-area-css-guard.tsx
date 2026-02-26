'use client';

import { useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  resolveThemeCssAreaFromHref,
  resolveThemeCssAreaFromPath,
  type ThemeCssArea
} from '@/lib/themes/area-css';

type ThemeCssLinkNode = HTMLLinkElement;

function areaRequiresCssGate(area: ThemeCssArea) {
  return area === 'admin' || area === 'dashboard';
}

function setCssPendingState(activeArea: ThemeCssArea, pending: boolean) {
  const root = document.documentElement;
  root.dataset.themeCssArea = activeArea;

  if (pending) {
    root.dataset.themeCssPending = '1';
  } else {
    delete root.dataset.themeCssPending;
  }
}

function isCssLinkLoaded(node: ThemeCssLinkNode) {
  if (node.dataset.themeCssLoaded === 'true') {
    return true;
  }

  if (node.sheet) {
    node.dataset.themeCssLoaded = 'true';
    return true;
  }

  return false;
}

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

function trackCssLinkLoad(node: ThemeCssLinkNode, onSettled: () => void) {
  if (node.dataset.themeCssTracked === 'true') {
    return;
  }

  node.dataset.themeCssTracked = 'true';
  const markAsLoaded = () => {
    node.dataset.themeCssLoaded = 'true';
    onSettled();
  };

  if (isCssLinkLoaded(node)) {
    return;
  }

  node.addEventListener('load', markAsLoaded, { once: true });
  node.addEventListener('error', markAsLoaded, { once: true });
}

function synchronizeThemeCssAssets(activeArea: ThemeCssArea, onSettled: () => void) {
  const cssNodes = document.querySelectorAll<ThemeCssLinkNode>('link[rel="stylesheet"][href]');
  const activeNodes: ThemeCssLinkNode[] = [];

  for (const node of cssNodes) {
    const assetArea = readAssetArea(node);
    if (!assetArea) {
      continue;
    }

    trackCssLinkLoad(node, onSettled);
    if (assetArea === activeArea) {
      activeNodes.push(node);
    }
  }

  const hasActiveAreaAssets = activeNodes.length > 0;
  const activeAreaLoaded =
    hasActiveAreaAssets && activeNodes.every((node) => isCssLinkLoaded(node));
  const requiresCssGate = areaRequiresCssGate(activeArea);
  const canCommitAreaSwitch = hasActiveAreaAssets
    ? activeAreaLoaded
    : !requiresCssGate;

  setCssPendingState(activeArea, !canCommitAreaSwitch);

  // Keep previous area CSS active until target area stylesheets are ready,
  // avoiding a brief unstyled paint during route transitions.
  if (!canCommitAreaSwitch) {
    for (const node of cssNodes) {
      const assetArea = readAssetArea(node);
      if (!assetArea) {
        continue;
      }

      enableCssLink(node);
    }
    return;
  }

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

function resolveActiveArea(pathname: string): ThemeCssArea {
  const path = String(pathname ?? '').trim().toLowerCase();

  // High-confidence prefix patterns: /admin/* and /dashboard/* are always certain.
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  if (path === '/dashboard' || path.startsWith('/dashboard/')) return 'dashboard';

  // For all other paths (login group, frontend, custom module paths),
  // prefer the layout signal rendered by ThemeAreaSignal.
  // The guard's useLayoutEffect fires after the DOM commit, so server-rendered
  // signal elements are already in the DOM at this point.
  // Multiple signals can exist (nested layouts); the deepest one wins.
  const signals = document.querySelectorAll<HTMLElement>('[data-theme-area-signal]');
  if (signals.length > 0) {
    const signal = signals[signals.length - 1].dataset.themeAreaSignal;
    if (signal === 'admin' || signal === 'dashboard' || signal === 'frontend') {
      return signal;
    }
  }

  return resolveThemeCssAreaFromPath(pathname);
}

export function ThemeAreaCssGuard() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const activeArea = resolveActiveArea(pathname);
    setCssPendingState(activeArea, areaRequiresCssGate(activeArea));
    let frameHandle: number | null = null;
    const requestSynchronize = () => {
      if (frameHandle !== null) {
        return;
      }

      frameHandle = window.requestAnimationFrame(() => {
        frameHandle = null;
        synchronizeThemeCssAssets(activeArea, requestSynchronize);
      });
    };

    requestSynchronize();
    const observer = new MutationObserver(() => {
      requestSynchronize();
    });

    observer.observe(document.head, {
      childList: true,
      subtree: true
    });

    return () => {
      if (frameHandle !== null) {
        window.cancelAnimationFrame(frameHandle);
      }

      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
