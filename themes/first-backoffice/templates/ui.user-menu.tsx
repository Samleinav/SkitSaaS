'use client';

import type { ReactNode } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';
import { FirstBackofficeNotificationCenter } from '../components/private-notification-center';

type UiUserMenuTemplateProps = {
  data?: {
    area?: 'admin' | 'dashboard' | string | null;
  };
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export default function UiUserMenuTemplate({
  data,
  className,
  themeId,
  children
}: UiUserMenuTemplateProps) {
  const area = data?.area === 'dashboard' ? 'dashboard' : 'admin';

  return (
    <div className={mergeClassNames('flex items-center gap-2.5', className)}>
      <FirstBackofficeNotificationCenter area={area} themeId={themeId} />
      {children}
    </div>
  );
}
