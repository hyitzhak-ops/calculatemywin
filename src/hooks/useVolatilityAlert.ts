import { useEffect, useRef, useState } from 'react'

interface PriceSnapshot {
  timestamp: number
  price: number
}

interface VolatilityAlert {
  active: boolean
  pctChange: number       // signed % change over the window
  windowMs: number        // actual elapsed time of the snapshot pair
}

const WINDOW_MS = 3 * 60 * 1000      // 3 minutes
const ALERT_THRESHOLD_PCT = 2          // 2% absolute move
const ALERT_DECAY_MS = 8 * 1000        // alert flash auto-clears after 8s

export function useVolatilityAlert(
  symbol: string | null,
  livePrice: number | null | undefined
): VolatilityAlert {
  const historyRef = useRef<PriceSnapshot[]>([])
  const lastSymbolRef = useRef<string | null>(null)
  const decayTimerRef = useRef<number | null>(null)

  const [alert, setAlert] = useState<VolatilityAlert>({
    active: false,
    pctChange: 0,
    windowMs: 0,
  })

  useEffect(() => {
    if (lastSymbolRef.current !== symbol) {
      historyRef.current = []
      lastSymbolRef.current = symbol
      if (decayTimerRef.current !== null) {
        window.clearTimeout(decayTimerRef.current)
        decayTimerRef.current = null
      }
      setAlert({ active: false, pctChange: 0, windowMs: 0 })
    }
  }, [symbol])

  useEffect(() => {
    if (!symbol || livePrice == null || !Number.isFinite(livePrice)) return

    const now = Date.now()
    const history = historyRef.current
    history.push({ timestamp: now, price: livePrice })

    // Drop snapshots older than 2× window so we keep only what's needed
    const cutoff = now - WINDOW_MS * 2
    while (history.length > 0 && history[0].timestamp < cutoff) {
      history.shift()
    }

    // Find the oldest snapshot inside the alert window
    const inWindow = history.find((s) => now - s.timestamp <= WINDOW_MS)
    if (!inWindow || inWindow.price === 0) return

    const pct = ((livePrice - inWindow.price) / inWindow.price) * 100
    if (Math.abs(pct) >= ALERT_THRESHOLD_PCT) {
      setAlert({
        active: true,
        pctChange: pct,
        windowMs: now - inWindow.timestamp,
      })
      if (decayTimerRef.current !== null) {
        window.clearTimeout(decayTimerRef.current)
      }
      decayTimerRef.current = window.setTimeout(() => {
        setAlert((prev) => ({ ...prev, active: false }))
        decayTimerRef.current = null
      }, ALERT_DECAY_MS)
    }
  }, [symbol, livePrice])

  useEffect(() => {
    return () => {
      if (decayTimerRef.current !== null) {
        window.clearTimeout(decayTimerRef.current)
      }
    }
  }, [])

  return alert
}
