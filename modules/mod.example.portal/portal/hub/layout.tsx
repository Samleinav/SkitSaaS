import Link from 'next/link';
import type { PortalLayoutProps } from '@skitsaas/sdk';

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
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/hub"
            className="text-sm font-semibold tracking-tight text-slate-900 hover:text-slate-600"
          >
            Hub Portal
          </Link>
          <nav className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="/hub" className="hover:text-slate-900">
              Home
            </Link>
            <Link href="/hub/members" className="hover:text-slate-900">
              Members
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>

      <footer className="mt-16 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Hub Portal · {portalCtx.name}
      </footer>
    </div>
  );
}
