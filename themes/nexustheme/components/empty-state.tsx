import type { ReactNode } from 'react';
import { mergeClassNames } from '@skitsaas/sdk';

type NexusEmptyStateProps = {
  className?: string;
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'default' | 'subtle' | 'bordered';
};

/**
 * NexusEmptyState - Modern empty state component with icon, title, description and optional action
 *
 * @example
 * ```tsx
 * <NexusEmptyState
 *   icon={<Users className="h-12 w-12" />}
 *   title="No users found"
 *   description="Get started by creating your first user account."
 *   action={<Button>Create User</Button>}
 *   variant="default"
 * />
 * ```
 */
export function NexusEmptyState({
  className,
  icon,
  title,
  description,
  action,
  variant = 'default'
}: NexusEmptyStateProps) {
  const baseStyles = 'flex flex-col items-center justify-center px-6 py-12 text-center';

  const variantStyles = {
    default: 'rounded-2xl border border-dashed border-border/70 bg-muted/20',
    subtle: 'bg-transparent',
    bordered: 'rounded-2xl border border-border/70 bg-card/50'
  };

  return (
    <div
      className={mergeClassNames(baseStyles, variantStyles[variant], className)}
      data-nexus-empty-state={variant}
    >
      {icon && (
        <div className="mb-4 text-muted-foreground/40" data-slot="icon">
          {icon}
        </div>
      )}

      <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h3>

      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-2" data-slot="action">
          {action}
        </div>
      )}
    </div>
  );
}
