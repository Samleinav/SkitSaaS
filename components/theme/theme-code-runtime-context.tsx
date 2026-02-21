import type { ReactNode } from 'react';

export type ThemeCodeRuntimeContextValue = {
  themeId: string | null;
};

export function ThemeCodeRuntimeProvider(props: {
  themeId: string | null;
  children: ReactNode;
}) {
  return <>{props.children}</>;
}
