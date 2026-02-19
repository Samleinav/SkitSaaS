'use client';

import type { ReactNode } from 'react';

type UiLanguageSwitcherTemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function UiLanguageSwitcherTemplate({
  className,
  children
}: UiLanguageSwitcherTemplateProps) {
  return <div className={className}>{children}</div>;
}