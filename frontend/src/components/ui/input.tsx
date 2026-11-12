import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn('flex h-7 w-full rounded-md border border-line-2 bg-panel-3 px-2 text-[12px] text-fg mono placeholder:text-fg-dim focus:outline-none focus:ring-1 focus:ring-sci/60 disabled:opacity-50', className)}
    {...props}
  />
))
Input.displayName = 'Input'

export function NumberField({ label, value, onChange, step = 1, min, max, unit, hint }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit?: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label flex items-center justify-between">
        <span>{label}</span>
        {unit && <span className="text-fg-dim normal-case tracking-normal">{unit}</span>}
      </span>
      <Input type="number" value={Number.isFinite(value) ? value : ''} step={step} min={min} max={max} onChange={(e) => onChange(parseFloat(e.target.value))} title={hint} />
    </label>
  )
}
