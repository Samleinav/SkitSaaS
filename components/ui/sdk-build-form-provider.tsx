'use client';

import {
  BuildFormUiAdapterProvider,
  type BuildFormUiAdapter,
  type SdkBuildFormProps,
} from '@skitsaas/sdk';
import type { ReactNode } from 'react';
import { BuildForm as HostBuildForm } from '@/components/ui/build-form';

type HostBuildFormArea = 'admin' | 'dashboard' | 'frontend' | 'global';

function normalizeArea(value: string | null | undefined): HostBuildFormArea {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'public') {
    return 'frontend';
  }

  if (
    normalized === 'admin' ||
    normalized === 'dashboard' ||
    normalized === 'frontend' ||
    normalized === 'global'
  ) {
    return normalized;
  }

  return 'frontend';
}

const buildFormUiAdapter: BuildFormUiAdapter = {
  renderBuildForm: ({
    definition,
    area,
    className,
    themeId = null,
    slot,
    templateId = null,
    templateSource = null,
    templateComponentId = 'ui.form',
    templatePayload,
  }: SdkBuildFormProps) => (
    <HostBuildForm
      definition={definition}
      area={normalizeArea(area)}
      themeId={themeId}
      slot={slot}
      className={className}
      templateId={templateId}
      templateSource={templateSource}
      templateComponentId={templateComponentId}
      templatePayload={templatePayload}
    />
  ),
};

export function SdkBuildFormProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <BuildFormUiAdapterProvider adapter={buildFormUiAdapter}>
      {children}
    </BuildFormUiAdapterProvider>
  );
}
