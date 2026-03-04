import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { docsSource } from '@/lib/docs-source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={docsSource.pageTree}
      nav={{
        title: (
          <span className="flex items-center gap-2">
            S-Kit Docs
            <span className="rounded border px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              v1
            </span>
          </span>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
