import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

export const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <SliderPrimitive.Root ref={ref} className={cn('relative flex w-full touch-none select-none items-center h-4', className)} {...props}>
      <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-line-2">
        <SliderPrimitive.Range className="absolute h-full bg-sci" />
      </SliderPrimitive.Track>
      {(props.value ?? props.defaultValue ?? [0]).map((_, i) => (
        <SliderPrimitive.Thumb key={i} className="block h-3 w-3 rounded-full border border-sci bg-panel shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sci/40 hover:bg-sci/30" />
      ))}
    </SliderPrimitive.Root>
  ),
)
Slider.displayName = 'Slider'
