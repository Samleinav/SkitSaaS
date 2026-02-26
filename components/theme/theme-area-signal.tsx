import type { ThemeCssArea } from '@/lib/themes/area-css';

/**
 * Signals the current route group's CSS area to ThemeAreaCssGuard.
 * Rendered server-side so it's committed to the DOM before any
 * useLayoutEffect fires in the guard. The guard queries for the
 * deepest signal in the tree (most-specific layout wins).
 *
 * Place this in each area's layout file.
 */
export function ThemeAreaSignal({ area }: { area: ThemeCssArea }) {
  return (
    <span
      aria-hidden="true"
      data-theme-area-signal={area}
      style={{ display: 'none' }}
    />
  );
}
