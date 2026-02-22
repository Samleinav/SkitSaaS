import type { ReactNode } from 'react';

export type TemplateData = {
  title?: string;
  description?: string;
  message?: string;
  section?: string;
  scope?: string;
  variant?: string;
  mode?: string;
  heading?: string;
  layoutStyle?: string;
  columns?: number;
} & Record<string, unknown>;

export type TemplateProps<
  TData extends Record<string, unknown> = TemplateData
> = {
  data?: TData;
  className?: string;
  children?: ReactNode;
};
