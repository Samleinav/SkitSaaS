import { cn } from "../../lib/utils"

type SkeletonProps = React.ComponentProps<"div"> & {
  variant?: 'default' | 'gradient';
};

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  const variantStyles = {
    default: 'bg-accent',
    gradient: 'bg-gradient-to-r from-accent/50 via-accent to-accent/50 bg-[length:200%_100%] animate-skeleton-shimmer'
  };

  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
