'use client';

import type { ReactNode } from 'react';

type UiAsyncSubmitButtonTemplateProps = {
  className?: string;
  children?: ReactNode;
};

export default function UiAsyncSubmitButtonTemplate({
  className,
  children
}: UiAsyncSubmitButtonTemplateProps) {
  return <div className={className}>{children}</div>;
}