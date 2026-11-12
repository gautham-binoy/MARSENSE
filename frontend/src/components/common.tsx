import type { ReactNode } from 'react'
import { AlertTriangle, Database, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Hint } from '@/components/ui/tooltip'
import type { Provenance } from '@/lib/api'
import { cn } from '@/lib/utils'

export const RELIABILITY_META: Record<string, { label: string; variant: 'safe' | 'sci' | 'default' | 'caution' | 'mars' | 'danger' | 'ghost'; desc: string }> = {
  measured: { label: 'Measured', variant: 'safe', desc: 'Instrument measurement from a NASA archive (unit conversion only).' },
  processed_observation: { label: 'Processed obs.', variant: 'sci', desc: 'NASA/USGS product derived from measurements by the data provider (e.g. a stereo DTM or controlled mosaic).' },
  derived: { label: 'Derived', variant: 'default', desc: 'Computed by MARSENSE from a processed observation with a documented algorithm.' },
  inference: { label: 'Inference', variant: 'caution', desc: 'Scientific interpretation (literature or ours), not a direct measurement.' },
  simulation: { label: 'Simulation', variant: 'mars', desc: 'Output of a model driven by user-supplied assumptions.' },
  placeholder: { label: 'Placeholder', variant: 'danger', desc: 'Illustrative only; never used in scoring.' },
  none: { label: 'No data', variant: 'ghost', desc: 'No dataset covers this request.' },
}

export function ReliabilityBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  const m = RELIABILITY_META[value ?? 'none'] ?? RELIABILITY_META.none
  return (
    <Hint label={m.desc}>
      <Badge variant={m.variant} className={className}>{m.label}</Badge>
    </Hint>
  )
}

export function ProvenanceList({ items, className }: { items?: Provenance[] | null; className?: string }) {
  if (!items?.length) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 text-[10.5px] text-fg-dim', className)}>
      <Database className="h-3 w-3" />
      {items.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ReliabilityBadge value={p.reliability} />
          <span className="mono">{p.dataset_id ?? 'none'}</span>
          {p.resolution_m ? <span>@ {p.resolution_m >= 1000 ? `${(p.resolution_m / 1000).toFixed(1)} km` : `${Math.round(p.resolution_m)} m`}</span> : null}
          {p.method ? <span className="text-fg-dim/80">· {p.method}</span> : null}
        </span>
      ))}
    </div>
  )
}

export function Stat({ label, value, unit, hint, tone, className }: { label: string; value: ReactNode; unit?: string; hint?: string; tone?: 'safe' | 'caution' | 'danger' | 'sci' | 'default'; className?: string }) {
  const color = { safe: 'text-safe', caution: 'text-caution', danger: 'text-danger', sci: 'text-sci-2', default: 'text-fg' }[tone ?? 'default']
  const body = (
    <div className={cn('panel-2 px-2.5 py-2 min-w-0', className)}>
      <div className="label truncate flex items-center gap-1">{label}{hint && <Info className="h-2.5 w-2.5 opacity-60" />}</div>
      <div className={cn('mono text-[15px] font-semibold leading-tight mt-0.5 truncate', color)}>
        {value}
        {unit && <span className="text-[10px] text-fg-dim font-normal ml-1">{unit}</span>}
      </div>
    </div>
  )
  return hint ? <Hint label={hint}>{body}</Hint> : body
}

export function Callout({ kind = 'info', children, className }: { kind?: 'info' | 'warn' | 'danger'; children: ReactNode; className?: string }) {
  const style = { info: 'border-sci/30 bg-sci/5 text-sci-2', warn: 'border-caution/30 bg-caution/5 text-caution', danger: 'border-danger/30 bg-danger/5 text-danger' }[kind]
  const Icon = kind === 'info' ? Info : AlertTriangle
  return (
    <div className={cn('flex gap-2 rounded-md border px-2.5 py-2 text-[11.5px] leading-snug', style, className)}>
      <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <div className="text-fg/90">{children}</div>
    </div>
  )
}

export function ScoreRing({ score, size = 72, label, tone }: { score: number; size?: number; label?: string; tone?: string }) {
  const r = (size - 8) / 2
  const c = 2 * Math.PI * r
  const col = tone ?? (score >= 75 ? '#34d399' : score >= 55 ? '#fbbf24' : '#f87171')
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#262c38" strokeWidth={5} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={5} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 600ms ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="mono font-semibold leading-none" style={{ fontSize: size * 0.26, color: col }}>{Math.round(score)}</span>
        {label && <span className="label mt-0.5" style={{ fontSize: Math.max(8, size * 0.11) }}>{label}</span>}
      </div>
    </div>
  )
}

export function Bar({ value, max = 100, color, className }: { value: number; max?: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full rounded-full bg-line overflow-hidden', className)}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color ?? (value >= 70 ? '#34d399' : value >= 45 ? '#fbbf24' : '#f87171') }} />
    </div>
  )
}

export function Legend({ stops, type, units }: { stops: { value: number | string; color: string; label?: string | null }[]; type?: string | null; units?: string | null }) {
  if (type === 'gradient') {
    return (
      <div className="text-[10px] text-fg-dim">
        <div className="h-2 rounded-sm" style={{ background: `linear-gradient(90deg, ${stops.map((s) => s.color).join(',')})` }} />
        <div className="flex justify-between mt-0.5 mono"><span>{stops[0].label}</span><span>{units}</span><span>{stops[stops.length - 1].label}</span></div>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px] text-fg-muted">
      {stops.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.label ?? String(s.value)}</span>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h1 className="text-[16px] font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="text-[11.5px] text-fg-muted mt-0.5 max-w-2xl">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cn('inline-block h-3.5 w-3.5 rounded-full border-2 border-sci/30 border-t-sci animate-spin', className)} />
}

export function classTone(cls: string | null | undefined): 'safe' | 'caution' | 'danger' | 'default' {
  return cls === 'benign' ? 'safe' : cls === 'caution' ? 'caution' : cls === 'hazardous' || cls === 'impassable' ? 'danger' : 'default'
}
