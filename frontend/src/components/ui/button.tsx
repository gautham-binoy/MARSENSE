import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[12px] font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 outline-none focus-visible:ring-1 focus-visible:ring-sci/60 [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-mars text-white hover:bg-mars-glow shadow-[0_0_0_1px_rgba(234,88,12,0.3)] hover:shadow-glow-mars',
        secondary: 'bg-panel-3 text-fg border border-line-2 hover:border-sci/50 hover:text-sci-2',
        ghost: 'text-fg-muted hover:text-fg hover:bg-panel-3',
        outline: 'border border-line-2 text-fg hover:bg-panel-3',
        sci: 'bg-sci/10 text-sci-2 border border-sci/30 hover:bg-sci/20 hover:shadow-glow-sci',
        danger: 'bg-danger-2/15 text-danger border border-danger/30 hover:bg-danger-2/25',
        link: 'text-sci underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2.5 text-[11.5px]',
        xs: 'h-6 px-2 text-[11px] [&_svg]:size-3',
        lg: 'h-9 px-4',
        icon: 'h-8 w-8',
        'icon-sm': 'h-7 w-7',
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
