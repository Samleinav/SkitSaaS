import Link from 'next/link';
import type { PortalLayoutProps } from '@skitsaas/sdk';
import { HUB_PORTAL_STYLES } from './portal-shell';

/**
 * Hub portal layout.
 *
 * Receives `portalCtx` from the dispatcher:
 *   { name: 'hub', area: undefined, context: undefined, userTheme: false }
 *
 * The layout owns the full visual structure — no ThemeCodeTemplate slots,
 * no nav items injected by the core. Build freely.
 */
export default function HubLayout({ children, portalCtx }: PortalLayoutProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc,#ffffff)] text-slate-900">
      <style>{HUB_PORTAL_STYLES}</style>
      <header className="hub-header">
        <div className="hub-header__inner">
          <Link href="/hub" className="hub-logo">
            <span className="hub-logo__mark">Hub</span>
            <span>Portal from mod.example.portal</span>
          </Link>
          <nav className="hub-nav">
            <Link href="/hub" className="hub-nav__link">
              Home
            </Link>
            <Link href="/hub/register" className="hub-nav__link">
              Register
            </Link>
            <Link href="/hub/members" className="hub-nav__link">
              Members
            </Link>
          </nav>
        </div>
      </header>

      <main className="hub-main">{children}</main>

      <footer className="hub-footer">
        Hub Portal · {portalCtx.name}
      </footer>
    </div>
  );
}
