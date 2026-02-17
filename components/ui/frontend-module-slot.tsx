import type { ReactNode } from 'react';
import { resolveFrontendModuleSlot } from '@/lib/modules/runtime';

export type FrontendModuleSlotProps = {
  slotId: string;
  moduleId?: string | null;
  route?: string | null;
  payload?: unknown;
  fallback?: ReactNode;
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function FrontendModuleSlot({
  slotId,
  moduleId,
  route,
  payload,
  fallback = null,
  searchParams
}: FrontendModuleSlotProps) {
  const content = await resolveFrontendModuleSlot({
    slotId,
    moduleId,
    route,
    payload,
    searchParams
  });

  return content ?? fallback;
}
