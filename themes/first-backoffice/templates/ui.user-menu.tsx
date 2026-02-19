'use client';

import type { ReactNode } from 'react';

type UiUserMenuTemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function UiUserMenuTemplate({
  className,
  children
}: UiUserMenuTemplateProps) {
  return <div className={className}>{children}</div>;
}