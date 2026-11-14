import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-[12.5px] font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 outline-none focus-visible:ring-2 focus-visible:ring-sci/50 [&_svg]:size-3.5 [&_svg]:shrink-0 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-mars to-mars-glow text-white font-semibold shadow-md shadow-mars/20 hover:brightness-110 active:scale-[0.98] border border-mars-glow/30',
        secondary: 'bg-panel-2 text-fg border border-line-2/80 hover:border-slate-500/80 hover:bg-panel-3 hover:text-white active:scale-[0.98] shadow-sm',
        ghost: 'text-fg-muted hover:text-fg hover:bg-white/[0.06] active:scale-[0.98]',
        outline: 'border border-line-2 text-fg-muted hover:text-fg hover:border-slate-500 hover:bg-panel-2 active:scale-[0.98]',
        sci: 'bg-sci/10 text-sci-2 border border-sci/30 hover:bg-sci/20 hover:border-sci/60 shadow-sm shadow-sci/10 active:scale-[0.98] font-medium',
        danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 hover:border-danger/50 active:scale-[0.98]',
        link: 'text-sci-2 underline-offset-4 hover:underline font-normal',
      },
      size: {
        default: 'h-8 px-3.5',
        sm: 'h-7 px-2.5 text-[11.5px]',
        xs: 'h-6 px-2 text-[11px] [&_svg]:size-3',
        lg: 'h-9 px-4 text-[13px]',
        icon: 'h-8 w-8',
        'icon-sm': 'h-7 w-7 [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = 'Button'
export { buttonVariants }
