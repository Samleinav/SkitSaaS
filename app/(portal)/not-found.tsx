import Link from 'next/link';

/**
 * 404 handler for the portal route group.
 * Uses inline styles — portal CSS is injected by resolvePortalPage() at render
 * time, which does not run when notFound() is thrown.
 */
export default function PortalNotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        fontFamily: 'system-ui, sans-serif',
        color: '#0f172a',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '4rem', fontWeight: 700, lineHeight: 1, margin: 0 }}>404</p>
      <p style={{ fontSize: '1.125rem', color: '#64748b', margin: 0 }}>
        Page not found.
      </p>
      <Link
        href="/"
        style={{
          marginTop: '0.5rem',
          fontSize: '0.875rem',
          color: '#2563eb',
          textDecoration: 'underline',
        }}
      >
        Go home
      </Link>
    </div>
  );
}
