import { createContext, type ReactNode } from 'react';

export type ThemeCodeRuntimeContextValue = {
  themeId: string | null;
};

export const ThemeCodeRuntimeContext =
  createContext<ThemeCodeRuntimeContextValue>({
    themeId: null
  });

export function ThemeCodeRuntimeProvider({
  themeId,
  children
}: {
  themeId: string | null;
  children: ReactNode;
}) {
  return (
    <ThemeCodeRuntimeContext.Provider value={{ themeId }}>
      {children}
    </ThemeCodeRuntimeContext.Provider>
  );
}
