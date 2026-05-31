export type DataSource = 'finnhub' | 'yahoo' | 'mock'
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
}

export interface ActiveTrade {
  id: string
  symbol: string
  shares: number
  buyPrice: number
  timestamp: number
}

export interface CompletedTrade {
  id: string
  symbol: string
  shares: number
  buyPrice: number
  sellPrice: number
  profitUSD: number
  timestamp: number
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
