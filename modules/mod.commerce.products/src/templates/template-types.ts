import type { ReactNode } from 'react';

export type CommerceProductsModuleTemplateProps = {
  data?: Record<string, unknown>;
  className?: string;
  themeId?: string;
  children?: ReactNode;
};

export type CommerceProductsModuleTemplateRenderer = (
  props: CommerceProductsModuleTemplateProps
) => ReactNode;
