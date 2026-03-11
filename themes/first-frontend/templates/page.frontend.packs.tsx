'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type TemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function PageFrontendPacksTemplate({
  className
}: TemplateProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pricing');
  }, [router]);

  return (
    <main
      className={
        className || 'relative mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8'
      }
      data-theme-template="page.frontend.packs"
    />
  );
}
