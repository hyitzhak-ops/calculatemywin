import type { ChartPoint, ChartRange, DataSource, StockQuote } from '../types'

export const POLL_MS = 15_000

interface RangeConfig {
  yahooInterval: string
  yahooRange: string
  maxPoints: number
  mockIntervalSec: number
  subtitle: string
  formatTime: (date: Date) => string
}

export const RANGE_CONFIG: Record<ChartRange, RangeConfig> = {
  '10m': {
    yahooInterval: '1m',
    yahooRange: '1d',
    maxPoints: 10,
    mockIntervalSec: 60,
    subtitle: 'last 10 minutes',
    formatTime: (d) =>
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  },
  '1h': {
    yahooInterval: '1m',
    yahooRange: '1d',
    maxPoints: 60,
    mockIntervalSec: 60,
    subtitle: 'last hour',
    formatTime: (d) =>
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  },
  '3h': {
    yahooInterval: '1m',
    yahooRange: '1d',
    maxPoints: 180,
    mockIntervalSec: 60,
    subtitle: 'last 3 hours',
    formatTime: (d) =>
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  },
  '1d': {
    yahooInterval: '5m',
    yahooRange: '1d',
    maxPoints: 80,
    mockIntervalSec: 300,
    subtitle: 'today',
    formatTime: (d) =>
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  },
  '1w': {
    yahooInterval: '30m',
    yahooRange: '5d',
    maxPoints: 70,
    mockIntervalSec: 1800,
    subtitle: 'last 5 trading days',
    formatTime: (d) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  },
  '1mo': {
    yahooInterval: '1d',
    yahooRange: '1mo',
    maxPoints: 24,
    mockIntervalSec: 86400,
    subtitle: 'last month',
    formatTime: (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  },
  '1y': {
    yahooInterval: '1wk',
    yahooRange: '1y',
    maxPoints: 60,
    mockIntervalSec: 604800,
    subtitle: 'last year',
    formatTime: (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  },
}

interface FetchResult {
  quote: StockQuote
  chart: ChartPoint[]
  source: DataSource
}

async function safeFetch<T>(
  name: string,
  fetcher: () => Promise<T>
): Promise<T | null> {
  try {
    return await fetcher()
  } catch (err) {
    console.warn(`[${name}] fetch failed:`, err)
    return null
  }
}

async function fetchFinnhubQuote(symbol: string): Promise<StockQuote | null> {
  let apiKey = import.meta.env.VITE_FINNHUB_API_KEY?.trim() || ''

  // Strip surrounding quotes if user pasted them
  if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
    apiKey = apiKey.slice(1, -1)
  }
  if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
    apiKey = apiKey.slice(1, -1)
  }

  if (!apiKey) {
    console.info('[Finnhub] No API key set in VITE_FINNHUB_API_KEY')
    return null
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
    symbol
  )}&token=${apiKey}`

  const response = await fetch(url)
  if (!response.ok) {
    console.warn(`[Finnhub] HTTP ${response.status}`)
    return null
  }

  const data = await response.json()

  if (!data.c || data.c === 0) {
    console.warn('[Finnhub] Invalid data (price is 0)')
    return null
  }

  console.info(`[Finnhub] ✓ Quote fetched for ${symbol}`)

  return {
    symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    isMock: false,
  }
}

async function fetchYahooData(
  symbol: string,
  range: ChartRange
): Promise<{ quote: StockQuote; chart: ChartPoint[] } | null> {
  const config = RANGE_CONFIG[range]
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${config.yahooInterval}&range=${config.yahooRange}`

  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  ]

  let lastError: unknown = null

  for (const proxyUrl of proxies) {
    try {
      const response = await fetch(proxyUrl)
      if (!response.ok) {
        console.warn(`[Yahoo via proxy] HTTP ${response.status}`)
        continue
      }

      const data = await response.json()
      const result = data?.chart?.result?.[0]

      if (!result) {
        console.warn('[Yahoo] Invalid response shape')
        continue
      }

      const meta = result.meta
      const price = meta.regularMarketPrice
      const previousClose = meta.chartPreviousClose
      const high = meta.regularMarketDayHigh
      const low = meta.regularMarketDayLow
      const open = meta.regularMarketDayOpen

      if (!price || !previousClose) {
        console.warn('[Yahoo] Missing price data')
        continue
      }

      const change = price - previousClose
      const changePercent = (change / previousClose) * 100

      const timestamps: number[] = result.timestamp || []
      const closes: (number | null)[] =
        result.indicators?.quote?.[0]?.close || []

      let chartPoints: ChartPoint[] = []
      for (let i = 0; i < timestamps.length; i++) {
        const closePrice = closes[i]
        if (closePrice !== null && closePrice !== undefined) {
          const ts = timestamps[i] * 1000
          chartPoints.push({
            time: config.formatTime(new Date(ts)),
            price: closePrice,
            timestamp: ts,
          })
        }
      }

      chartPoints = chartPoints.slice(-config.maxPoints)

      console.info(`[Yahoo] ✓ Quote + chart fetched for ${symbol}`)

      return {
        quote: {
          symbol,
          price,
          change,
          changePercent,
          high,
          low,
          open,
          previousClose,
          isMock: false,
        },
        chart: chartPoints,
      }
    } catch (err) {
      lastError = err
      continue
    }
  }

  console.warn('[Yahoo] All proxy attempts failed:', lastError)
  return null
}

function generateMockData(
  symbol: string,
  range: ChartRange
): { quote: StockQuote; chart: ChartPoint[] } {
  const config = RANGE_CONFIG[range]

  const knownBases: Record<string, number> = {
    AAPL: 175,
    NVDA: 420,
    TSLA: 180,
    MSFT: 380,
    GOOGL: 140,
    AMZN: 175,
    META: 485,
  }

  let basePrice = knownBases[symbol]
  if (!basePrice) {
    const charSum = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    basePrice = 50 + (charSum % 450)
  }

  const now = Date.now()
  const points: ChartPoint[] = []

  for (let i = 0; i < config.maxPoints; i++) {
    const tsMs = now - (config.maxPoints - i - 1) * config.mockIntervalSec * 1000
    const phase = (i / config.maxPoints) * Math.PI * 2
    const sine = Math.sin(phase) * 0.01
    const drift = (Math.random() - 0.5) * 0.005
    const price = basePrice * (1 + sine + drift)

    points.push({
      time: config.formatTime(new Date(tsMs)),
      price,
      timestamp: tsMs,
    })
  }

  const currentPrice = points[points.length - 1].price
  const previousClose = basePrice
  const change = currentPrice - previousClose
  const changePercent = (change / previousClose) * 100

  console.info(`[Mock] Generated data for ${symbol}`)

  return {
    quote: {
      symbol,
      price: currentPrice,
      change,
      changePercent,
      high: currentPrice * 1.02,
      low: currentPrice * 0.98,
      open: previousClose,
      previousClose,
      isMock: true,
    },
    chart: points,
  }
}

function generateMockChartFromQuote(
  quote: StockQuote,
  range: ChartRange
): ChartPoint[] {
  const config = RANGE_CONFIG[range]
  const now = Date.now()
  const points: ChartPoint[] = []
  const basePrice = quote.price

  for (let i = 0; i < config.maxPoints; i++) {
    const tsMs = now - (config.maxPoints - i - 1) * config.mockIntervalSec * 1000
    const phase = (i / config.maxPoints) * Math.PI * 2
    const sine = Math.sin(phase) * 0.01
    const drift = (Math.random() - 0.5) * 0.005
    const price = basePrice * (1 + sine + drift)

    points.push({
      time: config.formatTime(new Date(tsMs)),
      price,
      timestamp: tsMs,
    })
  }

  console.info(`[Mock] Generated chart anchored to Finnhub price for ${quote.symbol}`)

  return points
}

export async function fetchStockData(
  symbol: string,
  range: ChartRange
): Promise<FetchResult> {
  const [finnhubQuote, yahooData] = await Promise.all([
    safeFetch('Finnhub', () => fetchFinnhubQuote(symbol)),
    safeFetch('Yahoo', () => fetchYahooData(symbol, range)),
  ])

  if (finnhubQuote && yahooData) {
    console.info(`[Fetch] Using Finnhub quote + Yahoo chart for ${symbol}`)
    return {
      quote: finnhubQuote,
      chart: yahooData.chart,
      source: 'finnhub',
    }
  }

  if (finnhubQuote) {
    console.info(`[Fetch] Using Finnhub quote + mock chart for ${symbol}`)
    return {
      quote: finnhubQuote,
      chart: generateMockChartFromQuote(finnhubQuote, range),
      source: 'finnhub',
    }
  }

  if (yahooData) {
    console.info(`[Fetch] Using Yahoo quote + chart for ${symbol}`)
    return {
      quote: yahooData.quote,
      chart: yahooData.chart,
      source: 'yahoo',
    }
  }

  console.warn(`[Fetch] All sources failed for ${symbol}, using full mock data`)
  const mockData = generateMockData(symbol, range)
  return {
    quote: mockData.quote,
    chart: mockData.chart,
    source: 'mock',
  }
}
