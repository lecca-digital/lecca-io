import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs transition-colors cursor-default focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        good: 'border-transparent bg-blue-500/10 text-blue-500',
        error: 'border-transparent bg-red-500/10 text-red-500',
        warning: 'border-transparent bg-orange-400/10 text-orange-400',
        unknown: 'border-transparent bg-gray-500/10 text-gray-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };