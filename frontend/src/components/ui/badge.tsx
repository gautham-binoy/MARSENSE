import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider leading-normal select-none shadow-sm',
  {
    variants: {
      variant: {
        default: 'border-line-2 text-slate-300 bg-panel-3/90',
        sci: 'border-sci/40 text-sci-2 bg-sci/10 shadow-[0_0_8px_rgba(6,182,212,0.15)]',
        safe: 'border-safe/40 text-safe bg-safe/10 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
        caution: 'border-caution/40 text-caution bg-caution/10 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
        danger: 'border-danger/40 text-danger bg-danger/10 shadow-[0_0_8px_rgba(239,68,68,0.15)]',
        mars: 'border-ember/40 text-ember-2 bg-mars/20 shadow-[0_0_8px_rgba(234,88,12,0.15)]',
        ghost: 'border-transparent text-fg-dim bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
