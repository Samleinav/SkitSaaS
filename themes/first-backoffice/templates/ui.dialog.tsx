'use client';

import type { ReactNode } from 'react';

type UiDialogTemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function UiDialogTemplate({
  className,
  children
}: UiDialogTemplateProps) {
  return <div className={className}>{children}</div>;
}