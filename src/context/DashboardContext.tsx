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

  useEffect(() => {
    tickersRef.current = tickers
  }, [tickers])

  const tradesHook = useTrades()
  const journalHook = useJournal()

  const loadTicker = async (
    id: string,
    targetSymbol: string,
    range: ChartRange
  ) => {
    const upper = targetSymbol.trim().toUpperCase()
    if (!upper) return

    setTickers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, loading: true, error: null } : t))
    )

    try {
      const result = await fetchStockData(upper, range)
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
              }
            : t
        )
      )
    } catch (err) {
      setTickers((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                loading: false,
                error: err instanceof Error ? err.message : 'Unknown error',
              }
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

  const refreshTicker = async (id: string) => {
    const ticker = tickersRef.current.find((t) => t.id === id)
    if (!ticker || !ticker.symbol) return

    await loadTicker(id, ticker.symbol, ticker.range)
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

  useEffect(() => {
    const interval = setInterval(() => {
      const current = tickersRef.current

      for (const ticker of current) {
        if (!ticker.symbol || ticker.loading) continue
        refreshTicker(ticker.id)
      }
    }, POLL_MS)

    return () => clearInterval(interval)
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
