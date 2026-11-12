import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmt = {
  num: (v: number | null | undefined, d = 1) => (v === null || v === undefined || Number.isNaN(v) ? '—' : v.toFixed(d)),
  int: (v: number | null | undefined) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Math.round(v).toLocaleString()),
  km: (m: number | null | undefined) => (m === null || m === undefined ? '—' : `${(m / 1000).toFixed(2)} km`),
  pct: (f: number | null | undefined, d = 0) => (f === null || f === undefined ? '—' : `${(f * 100).toFixed(d)}%`),
  coord: (lon: number, lat: number) => `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`,
  deg: (v: number | null | undefined, d = 1) => (v === null || v === undefined ? '—' : `${v.toFixed(d)}°`),
}
