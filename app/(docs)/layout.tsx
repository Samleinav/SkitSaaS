import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import './docs.css';

export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
