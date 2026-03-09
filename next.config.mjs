import { createMDX } from 'fumadocs-mdx/next';

// ---------------------------------------------------------------------------
// Security headers applied to all routes.
//
// CSP notes:
//   - 'unsafe-inline' is required by Next.js for inline <style> and hydration
//     scripts. To harden further, replace with a nonce-based policy.
//   - 'unsafe-eval' can be removed in production if no runtime eval is used.
//   - img-src includes https: for external avatars/images common in SaaS apps.
//     Tighten to specific CDN origins when known.
//   - connect-src includes https: for third-party API calls from the browser
//     (e.g. Stripe.js, analytics). Tighten as needed.
// ---------------------------------------------------------------------------

const isDev = process.env.NODE_ENV === 'development';

const cspDirectives = [
  "default-src 'self'",
  // Next.js requires 'unsafe-inline' for styles and hydration.
  // In production with a strict CSP, adopt nonce injection via middleware.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  // Prevent the site from being embedded in iframes (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-type sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Disable DNS prefetching to reduce information leakage.
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // Control referrer information sent on navigation.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Restrict browser features not used by the app.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS for 2 years (preload-ready). Only effective in production behind TLS.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: cspDirectives },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,

  async headers() {
    return [
      {
        // Apply to all routes.
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
