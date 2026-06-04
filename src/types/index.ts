export type DataSource = 'massive' | 'finnhub' | 'yahoo' | 'mock'
export type ChartRange = '10m' | '1h' | '3h' | '1d' | '1w' | '1mo' | '1y'

export interface ChartPoint {
  time: string         // pre-formatted x-axis label
  price: number
  timestamp: number    // unix ms
}

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  isMock: boolean
  preMarketHigh?: number
  preMarketLow?: number
  gapDollar?: number
  gapPercent?: number
}

export interface OverlayPoint {
  timestamp: number
  pctChange: number  // % change vs first point in series
}

export interface Ticker {
  id: string                // crypto.randomUUID()
  inputSymbol: string       // current value of search input
  symbol: string            // last successfully loaded symbol ('' = not loaded)
  range: ChartRange
  quote: StockQuote | null
  chart: ChartPoint[]
  source: DataSource | null
  loading: boolean
  error: string | null
  lastUpdated: number | null
  overlay: OverlayPoint[]   // SPY (or QQQ) %-change series, aligned to chart timeframe
}

export interface ActiveTrade {
  id: string
  symbol: string
  shares: number
  buyPrice: number
  timestamp: number
  stopLoss?: number       // planned stop-loss price (long position: stopLoss < buyPrice)
  riskBudget?: number     // dollar amount the trader was willing to lose at entry
}

export const TRADE_CATALYSTS = [
  'Pre-market Gainer',
  'Earnings Report',
  'Support Bounce',
  'FOMO / Emotional',
  'Other',
] as const

export type TradeCatalyst = (typeof TRADE_CATALYSTS)[number]

export interface CompletedTrade {
  id: string
  symbol: string
  shares: number
  buyPrice: number
  sellPrice: number
  profitUSD: number
  timestamp: number
  catalyst?: TradeCatalyst
}

export interface DailyGoal {
  min: number
  max: number
}

export interface DailyJournalNote {
  dateStr: string // YYYY-MM-DD (local time)
  note: string
  updatedAt: number
}
