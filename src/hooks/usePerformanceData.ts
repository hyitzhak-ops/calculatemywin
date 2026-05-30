import { useMemo } from 'react'
import type { CompletedTrade } from '../types'
import { toLocalDateStr } from '../utils/format'

export interface EquityPoint {
  /** YYYY-MM-DD (local) */
  dateStr: string
  /** Short axis label, e.g. "Oct 12" */
  label: string
  /** Cumulative net profit at end of this day, starting at 0 before period */
  cumulative: number
  /** Net P/L for this single day */
  daily: number
  /** Trades closed on this day */
  trades: number
  /** Cumulative ÷ basis × 100. Basis = total $ invested in trades closed during the range. */
  growthPercent: number
}

export interface PerformanceSummary {
  startCumulative: number
  endCumulative: number
  netChange: number
  basis: number
  growthPercent: number
  peak: number
  peakDateStr: string | null
  maxDrawdown: number
  maxDrawdownDateStr: string | null
  maxDailyWin: number
  maxDailyWinDateStr: string | null
  maxDailyLoss: number
  maxDailyLossDateStr: string | null
  daysCovered: number
  activeDays: number
  totalTrades: number
}

interface PerformanceData {
  points: EquityPoint[]
  summary: PerformanceSummary
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function shortLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(y, (m || 1) - 1, d || 1))
}

interface DailyBucket {
  daily: number
  trades: number
  basis: number
}

export function usePerformanceData(
  trades: CompletedTrade[],
  rangeStart: Date,
  rangeEnd: Date
): PerformanceData {
  return useMemo(() => {
    const startMs = rangeStart.getTime()
    const endMs = rangeEnd.getTime()
    const buckets = new Map<string, DailyBucket>()

    for (const t of trades) {
      if (t.timestamp < startMs || t.timestamp > endMs) continue
      const key = toLocalDateStr(t.timestamp)
      const cur = buckets.get(key) ?? { daily: 0, trades: 0, basis: 0 }
      cur.daily += t.profitUSD
      cur.trades += 1
      cur.basis += t.buyPrice * t.shares
      buckets.set(key, cur)
    }

    const points: EquityPoint[] = []
    let cumulative = 0
    let cumulativeBasis = 0
    let peak = 0
    let peakDateStr: string | null = null
    let maxDrawdown = 0
    let maxDrawdownDateStr: string | null = null
    let maxDailyWin = 0
    let maxDailyWinDateStr: string | null = null
    let maxDailyLoss = 0
    let maxDailyLossDateStr: string | null = null
    let activeDays = 0
    let totalTrades = 0

    const cursor = startOfDay(new Date(rangeStart))
    const finalDay = startOfDay(new Date(rangeEnd))
    let safety = 0

    while (cursor.getTime() <= finalDay.getTime() && safety < 5000) {
      safety += 1
      const dateStr = toLocalDateStr(cursor)
      const b = buckets.get(dateStr)
      if (b) {
        cumulative += b.daily
        cumulativeBasis += b.basis
        activeDays += 1
        totalTrades += b.trades
        if (b.daily > maxDailyWin) {
          maxDailyWin = b.daily
          maxDailyWinDateStr = dateStr
        }
        if (b.daily < maxDailyLoss) {
          maxDailyLoss = b.daily
          maxDailyLossDateStr = dateStr
        }
      }
      if (cumulative > peak) {
        peak = cumulative
        peakDateStr = dateStr
      }
      const drawdown = peak - cumulative
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
        maxDrawdownDateStr = dateStr
      }
      const growthPercent =
        cumulativeBasis > 0 ? (cumulative / cumulativeBasis) * 100 : 0

      points.push({
        dateStr,
        label: shortLabel(dateStr),
        cumulative,
        daily: b?.daily ?? 0,
        trades: b?.trades ?? 0,
        growthPercent,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    const summary: PerformanceSummary = {
      startCumulative: 0,
      endCumulative: cumulative,
      netChange: cumulative,
      basis: cumulativeBasis,
      growthPercent:
        cumulativeBasis > 0 ? (cumulative / cumulativeBasis) * 100 : 0,
      peak,
      peakDateStr,
      maxDrawdown,
      maxDrawdownDateStr,
      maxDailyWin,
      maxDailyWinDateStr,
      maxDailyLoss,
      maxDailyLossDateStr,
      daysCovered: points.length,
      activeDays,
      totalTrades,
    }

    return { points, summary }
  }, [trades, rangeStart, rangeEnd])
}
