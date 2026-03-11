import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AdminPageShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  metrics?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

type AdminMetricCardProps = {
  label: string;
  value: number;
  hint?: string;
  className?: string;
};

export function AdminPageShell({
  title,
  description,
  actions,
  metrics,
  children,
  className,
  contentClassName
}: AdminPageShellProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <Card className="relative overflow-hidden border-border/70 bg-[radial-gradient(120%_140%_at_100%_0%,hsl(var(--primary)/0.12),transparent_52%),radial-gradient(120%_120%_at_0%_100%,hsl(var(--muted-foreground)/0.08),transparent_48%),linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--muted)/0.22)_100%)] shadow-sm">
        <div className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-44 w-44 rounded-full bg-sky-500/10 blur-3xl" />
        <CardHeader className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl tracking-[-0.02em] sm:text-[2rem]">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="max-w-3xl text-sm leading-6">
                {description}
              </CardDescription>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </CardHeader>
      </Card>

      {metrics}

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardContent className={cn(contentClassName)}>{children}</CardContent>
      </Card>
    </div>
  );
}

export function AdminMetricCard({
  label,
  value,
  hint,
  className
}: AdminMetricCardProps) {
  return (
    <Card className={cn('border-border/70 bg-card/90 shadow-sm', className)}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
