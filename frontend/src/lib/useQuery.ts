/* Minimal cached async hook (shared cache across components, stale-while-revalidate). */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

interface Entry<T> { data?: T; error?: Error; loading: boolean; ts: number; promise?: Promise<void> }
const cache = new Map<string, Entry<unknown>>()
const listeners = new Map<string, Set<() => void>>()

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l())
}

export function invalidate(key: string) {
  cache.delete(key)
  notify(key)
}

export function useQuery<T>(key: string, fn: () => Promise<T>, opts: { enabled?: boolean; staleMs?: number; retry?: boolean } = {}) {
  const { enabled = true, staleMs = 5 * 60_000 } = opts
  const fnRef = useRef(fn)
  fnRef.current = fn
  const subscribe = useCallback((cb: () => void) => {
    if (!listeners.has(key)) listeners.set(key, new Set())
    listeners.get(key)!.add(cb)
    return () => { listeners.get(key)?.delete(cb) }
  }, [key])
  const entry = useSyncExternalStore(subscribe, () => cache.get(key) as Entry<T> | undefined, () => cache.get(key) as Entry<T> | undefined)

  const run = useCallback(() => {
    const cur = cache.get(key)
    if (cur?.promise) return cur.promise
    const next: Entry<unknown> = { ...(cur ?? { ts: 0 }), loading: true }
    const p = fnRef.current().then(
      (data) => { cache.set(key, { data, loading: false, ts: Date.now() }); notify(key) },
      (error: Error) => { cache.set(key, { ...(cache.get(key) ?? { ts: 0 }), error, loading: false, promise: undefined }); notify(key) },
    )
    next.promise = p
    cache.set(key, next)
    notify(key)
    return p
  }, [key])

  useEffect(() => {
    if (!enabled) return
    const cur = cache.get(key)
    if (!cur || (!cur.loading && !cur.error && Date.now() - cur.ts > staleMs) || (!cur.loading && cur.data === undefined && !cur.error)) void run()
  }, [key, enabled, staleMs, run])

  return { data: entry?.data, error: entry?.error, loading: entry?.loading ?? enabled, refetch: run }
}

export function useAsync<A extends unknown[], T>(fn: (...args: A) => Promise<T>) {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: false })
  const execute = useCallback(async (...args: A) => {
    set((s) => ({ ...s, loading: true, error: undefined }))
    try {
      const data = await fn(...args)
      set({ data, loading: false })
      return data
    } catch (e) {
      set((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }))
      return undefined
    }
  }, [fn])
  return { ...state, execute, reset: () => set({ loading: false }) }
}
