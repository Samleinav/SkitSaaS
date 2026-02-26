import { ThemeAreaSignal } from '@/components/theme/theme-area-signal';

export default function LoginGroupLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ThemeAreaSignal area="dashboard" />
      {children}
    </>
  );
}
