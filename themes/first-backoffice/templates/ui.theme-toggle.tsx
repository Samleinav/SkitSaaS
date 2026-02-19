'use client';

import type { ReactNode } from 'react';

type UiThemeToggleTemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function UiThemeToggleTemplate({
  className,
  children
}: UiThemeToggleTemplateProps) {
  return <div className={className}>{children}</div>;
}