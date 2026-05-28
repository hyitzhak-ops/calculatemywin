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

export interface StockSimulation {
  id: string
  symbol: string
  shares: number
  buyPrice: number
  sellPrice: number
  expectedProfitUSD: number
  expectedProfitPercent: number
  timestamp: number
}
