'use client';

import type { ReactNode } from 'react';

type UiAlertDialogTemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function UiAlertDialogTemplate({
  className,
  children
}: UiAlertDialogTemplateProps) {
  return <div className={className}>{children}</div>;
}