import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import type {
  Ticker,
  ChartRange,
  ActiveTrade,
  CompletedTrade,
  DailyGoal,
  DailyJournalNote,
  TradeCatalyst,
} from '../types'
import { fetchStockData, POLL_MS } from '../services/stockService'
import { useTrades } from '../hooks/useTrades'
import { useJournal } from '../hooks/useJournal'

interface DashboardContextValue {
  tickers: Ticker[]
  activeTickerId: string | null
  activeTicker: Ticker | null

  addTicker: (symbol?: string) => string
  removeTicker: (id: string) => void
  setTickerInput: (id: string, value: string) => void
  searchTicker: (id: string, symbolOverride?: string) => Promise<void>
  refreshTicker: (id: string) => Promise<void>
  setTickerRange: (id: string, range: ChartRange) => Promise<void>
  setActiveTicker: (id: string) => void

  activeTrades: ActiveTrade[]
  completedTrades: CompletedTrade[]
  todayCompleted: CompletedTrade[]
  dailyProfit: number
  goal: DailyGoal
  setGoal: (goal: DailyGoal) => void
  addActiveTrade: (
    input: Omit<ActiveTrade, 'id' | 'timestamp'>
  ) => ActiveTrade
  removeActiveTrade: (id: string) => void
  closeTrade: (
    id: string,
    sellPrice: number,
    catalyst?: TradeCatalyst
  ) => CompletedTrade | null
  clearCompletedTrades: () => void
  addCompletedTrade: (input: Omit<CompletedTrade, 'id'>) => CompletedTrade
  updateCompletedTrade: (
    id: string,
    updates: Partial<Omit<CompletedTrade, 'id'>>
  ) => void
  deleteCompletedTrade: (id: string) => void

  journalNotes: Record<string, DailyJournalNote>
  setJournalNote: (dateStr: string, note: string) => void
  removeJournalNote: (dateStr: string) => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) {
    throw new Error('useDashboard must be used within DashboardProvider')
  }
  return ctx
}

function createEmptyTicker(inputSymbol = ''): Ticker {
  return {
    id: crypto.randomUUID(),
    inputSymbol,
    symbol: '',
    range: '1h',
    quote: null,
    chart: [],
    source: null,
    loading: false,
    error: null,
    lastUpdated: null,
    overlay: [],
  }
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [tickers, setTickers] = useState<Ticker[]>([createEmptyTicker('AAPL')])
  const [activeTickerId, setActiveTickerId] = useState<string | null>(
    () => tickers[0]?.id ?? null
  )

  const tickersRef = useRef(tickers)
  const didInitRef = useRef(false)
  // Per-ticker in-flight guard so the 30s interval can't fire a second poll
  // while the previous one is still running. ticker.loading only flips on
  // initial fetch (we suppress it during polling), so we need a separate ref.
  const pollingInFlightRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    tickersRef.current = tickers
  }, [tickers])

  const tradesHook = useTrades()
  const journalHook = useJournal()

  const loadTicker = async (
    id: string,
    targetSymbol: string,
    range: ChartRange,
    isPolling = false
  ) => {
    const upper = targetSymbol.trim().toUpperCase()
    if (!upper) return

    // Only show loading spinner on initial fetch, not during polling
    if (!isPolling) {
      setTickers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, loading: true, error: null } : t))
      )
    }

    // Outer safety timeout. fetchStockData has its own per-request timeouts,
    // but if anything below that ever hangs we still want the UI to recover
    // instead of leaving the refresh button stuck spinning. Worst-case real
    // total inside fetchStockData is ~10-11s, so 25s is comfortable margin.
    const SAFETY_TIMEOUT_MS = 25_000
    const safetyTimeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('SAFETY_TIMEOUT')),
        SAFETY_TIMEOUT_MS
      )
    )

    try {
      const result = await Promise.race([
        fetchStockData(upper, range, isPolling),
        safetyTimeout,
      ])
      setTickers((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                symbol: upper,
                quote: result.quote,
                chart: result.chart,
                source: result.source,
                overlay: result.overlay,
                loading: false,
                lastUpdated: Date.now(),
                // Clear any previous errors on successful fetch
                error: null,
              }
            : t
        )
      )
    } catch (err) {
      const isSafetyTimeout =
        err instanceof Error && err.message === 'SAFETY_TIMEOUT'

      // During polling, never surface errors to the UI
      if (isPolling) {
        console.warn(`[Poll] Silent error for ticker ${id}:`, err)
        return
      }

      // For manual refresh: if the existing ticker already has data, don't
      // blank it out with an error message. Just clear the spinner and let
      // the user keep the previous snapshot — same intent as the
      // stale-while-revalidate pattern in stockService.
      const existing = tickersRef.current.find((t) => t.id === id)
      const hasExistingData = !!existing?.quote && existing.chart.length > 0

      if (isSafetyTimeout && hasExistingData) {
        console.warn(
          `[Refresh] Safety timeout for ${upper}, keeping previous data`
        )
        setTickers((prev) =>
          prev.map((t) => (t.id === id ? { ...t, loading: false } : t))
        )
        return
      }

      const friendlyMessage = isSafetyTimeout
        ? 'Network is slow — showing the most recent data we have. Try again in a moment.'
        : err instanceof Error
          ? err.message
          : 'Unknown error'

      setTickers((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, loading: false, error: friendlyMessage }
            : t
        )
      )
    }
  }

  const addTicker = (symbol = ''): string => {
    const newTicker = createEmptyTicker(symbol)
    setTickers((prev) => [...prev, newTicker])
    setActiveTickerId(newTicker.id)
    return newTicker.id
  }

  const removeTicker = (id: string) => {
    setTickers((prev) => {
      const filtered = prev.filter((t) => t.id !== id)
      if (filtered.length === 0) {
        const fresh = createEmptyTicker()
        setActiveTickerId(fresh.id)
        return [fresh]
      }

      if (activeTickerId === id) {
        setActiveTickerId(filtered[0].id)
      }

      return filtered
    })
  }

  const setTickerInput = (id: string, value: string) => {
    setTickers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, inputSymbol: value } : t))
    )
  }

  const searchTicker = async (id: string, symbolOverride?: string) => {
    const ticker = tickersRef.current.find((t) => t.id === id)
    if (!ticker) return

    const targetSymbol = symbolOverride ?? ticker.inputSymbol
    await loadTicker(id, targetSymbol, ticker.range)
  }

  const refreshTicker = async (id: string, isPolling = false) => {
    const ticker = tickersRef.current.find((t) => t.id === id)
    if (!ticker || !ticker.symbol) return

    await loadTicker(id, ticker.symbol, ticker.range, isPolling)
  }

  const setTickerRange = async (id: string, range: ChartRange) => {
    const ticker = tickersRef.current.find((t) => t.id === id)
    if (!ticker) return

    setTickers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, range } : t))
    )

    if (ticker.symbol) {
      await loadTicker(id, ticker.symbol, range)
    }
  }

  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true

    const firstTicker = tickersRef.current[0]
    if (firstTicker && firstTicker.inputSymbol) {
      searchTicker(firstTicker.id)
    }
  }, [])

  // 30-second polling loop. Each cycle refreshes the live quote, the chart
  // (so the timeline advances), and the SPY overlay. Pre-market boundaries
  // and gap values are cached and reused.
  useEffect(() => {
    const inFlight = pollingInFlightRef.current

    const pollOnce = () => {
      for (const ticker of tickersRef.current) {
        if (!ticker.symbol) continue
        if (ticker.loading) continue           // initial fetch in progress
        if (inFlight.has(ticker.id)) continue  // previous poll still running

        inFlight.add(ticker.id)
        refreshTicker(ticker.id, true).finally(() => {
          inFlight.delete(ticker.id)
        })
      }
    }

    const interval = setInterval(pollOnce, POLL_MS)

    // Visibility-aware: if the tab was hidden and just became visible again,
    // poll immediately so the user doesn't see a stale chart on tab return.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pollOnce()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const activeTicker =
    tickers.find((t) => t.id === activeTickerId) ?? null

  const value: DashboardContextValue = {
    tickers,
    activeTickerId,
    activeTicker,
    addTicker,
    removeTicker,
    setTickerInput,
    searchTicker,
    refreshTicker,
    setTickerRange,
    setActiveTicker: setActiveTickerId,
    ...tradesHook,
    ...journalHook,
  }

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}
