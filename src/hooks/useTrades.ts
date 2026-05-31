import { useEffect, useMemo, useState } from 'react'
import type { ActiveTrade, CompletedTrade, DailyGoal } from '../types'

const ACTIVE_KEY = 'calculatemywin_active_trades'
const COMPLETED_KEY = 'calculatemywin_completed_trades'
const GOAL_KEY = 'calculatemywin_daily_goal'

const DEFAULT_GOAL: DailyGoal = { min: 1000, max: 2000 }

const MAX_COMPLETED = 200

function isSameCalendarDay(timestamp: number, ref = Date.now()): boolean {
  const a = new Date(timestamp)
  const b = new Date(ref)
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed as T
  } catch {
    return fallback
  }
}

function persist<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`Failed to persist ${key}:`, err)
  }
}

export function useTrades() {
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([])
  const [completedTrades, setCompletedTrades] = useState<CompletedTrade[]>([])
  const [goal, setGoalState] = useState<DailyGoal>(DEFAULT_GOAL)

  useEffect(() => {
    const a = loadJSON<ActiveTrade[]>(ACTIVE_KEY, [])
    const c = loadJSON<CompletedTrade[]>(COMPLETED_KEY, [])
    const g = loadJSON<DailyGoal>(GOAL_KEY, DEFAULT_GOAL)
    if (Array.isArray(a)) setActiveTrades(a)
    if (Array.isArray(c)) setCompletedTrades(c)
    if (g && typeof g.min === 'number' && typeof g.max === 'number') {
      setGoalState(g)
    }
  }, [])

  const addActiveTrade = (input: Omit<ActiveTrade, 'id' | 'timestamp'>) => {
    const trade: ActiveTrade = {
      ...input,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }
    setActiveTrades((prev) => {
      const next = [trade, ...prev]
      persist(ACTIVE_KEY, next)
      return next
    })
    return trade
  }

  const removeActiveTrade = (id: string) => {
    setActiveTrades((prev) => {
      const next = prev.filter((t) => t.id !== id)
      persist(ACTIVE_KEY, next)
      return next
    })
  }

  const closeTrade = (id: string, sellPrice: number) => {
    let closed: CompletedTrade | null = null
    setActiveTrades((prev) => {
      const trade = prev.find((t) => t.id === id)
      if (!trade) return prev
      closed = {
        id: trade.id,
        symbol: trade.symbol,
        shares: trade.shares,
        buyPrice: trade.buyPrice,
        sellPrice,
        profitUSD: (sellPrice - trade.buyPrice) * trade.shares,
        timestamp: Date.now(),
      }
      const next = prev.filter((t) => t.id !== id)
      persist(ACTIVE_KEY, next)
      return next
    })
    if (closed) {
      setCompletedTrades((prev) => {
        const next = [closed as CompletedTrade, ...prev].slice(0, MAX_COMPLETED)
        persist(COMPLETED_KEY, next)
        return next
      })
    }
    return closed
  }

  const clearCompletedTrades = () => {
    setCompletedTrades([])
    persist(COMPLETED_KEY, [])
  }

  const addCompletedTrade = (input: Omit<CompletedTrade, 'id'>) => {
    const trade: CompletedTrade = {
      ...input,
      id: crypto.randomUUID(),
    }
    setCompletedTrades((prev) => {
      const next = [trade, ...prev]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_COMPLETED)
      persist(COMPLETED_KEY, next)
      return next
    })
    return trade
  }

  const updateCompletedTrade = (id: string, updates: Partial<Omit<CompletedTrade, 'id'>>) => {
    setCompletedTrades((prev) => {
      const next = prev.map((t) => {
        if (t.id !== id) return t
        const updated = { ...t, ...updates }
        if (
          updates.buyPrice !== undefined ||
          updates.sellPrice !== undefined ||
          updates.shares !== undefined
        ) {
          const buyPrice = updates.buyPrice ?? t.buyPrice
          const sellPrice = updates.sellPrice ?? t.sellPrice
          const shares = updates.shares ?? t.shares
          updated.profitUSD = (sellPrice - buyPrice) * shares
        }
        return updated
      })
      persist(COMPLETED_KEY, next)
      return next
    })
  }

  const deleteCompletedTrade = (id: string) => {
    setCompletedTrades((prev) => {
      const next = prev.filter((t) => t.id !== id)
      persist(COMPLETED_KEY, next)
      return next
    })
  }

  const setGoal = (next: DailyGoal) => {
    setGoalState(next)
    persist(GOAL_KEY, next)
  }

  const todayCompleted = useMemo(
    () => completedTrades.filter((t) => isSameCalendarDay(t.timestamp)),
    [completedTrades]
  )

  const dailyProfit = useMemo(
    () => todayCompleted.reduce((sum, t) => sum + t.profitUSD, 0),
    [todayCompleted]
  )

  return {
    activeTrades,
    completedTrades,
    todayCompleted,
    dailyProfit,
    goal,
    setGoal,
    addActiveTrade,
    removeActiveTrade,
    closeTrade,
    clearCompletedTrades,
    addCompletedTrade,
    updateCompletedTrade,
    deleteCompletedTrade,
  }
}

export type UseTradesReturn = ReturnType<typeof useTrades>
