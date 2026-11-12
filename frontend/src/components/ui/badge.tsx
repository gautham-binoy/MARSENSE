import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center gap-1 rounded-sm border px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-wider leading-4', {
  variants: {
    variant: {
      default: 'border-line-2 text-fg-muted bg-panel-3',
      sci: 'border-sci/40 text-sci-2 bg-sci/10',
      safe: 'border-safe/40 text-safe bg-safe/10',
      caution: 'border-caution/40 text-caution bg-caution/10',
      danger: 'border-danger/40 text-danger bg-danger/10',
      mars: 'border-ember/40 text-ember-2 bg-mars/15',
      ghost: 'border-transparent text-fg-dim',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
