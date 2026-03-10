'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { NexusPrivateNotificationCenter } from '../components/private-notification-center';

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
    <div className={cn('flex items-center gap-2', className)}>
      <NexusPrivateNotificationCenter area={area} themeId={themeId} />
      {children}
    </div>
  );
}
