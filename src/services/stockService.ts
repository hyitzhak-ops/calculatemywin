import type {
  ChartPoint,
  ChartRange,
  DataSource,
  OverlayPoint,
  StockQuote,
} from '../types'

export const POLL_MS = 15_000

export const MARKET_OVERLAY_SYMBOL = 'SPY'

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
  overlay: OverlayPoint[]
}

const NY_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

interface NyClock {
  hour: number
  minute: number
  totalMinutes: number
}

function nyClockFor(timestamp: number): NyClock {
  const parts = NY_TIME_FORMATTER.formatToParts(new Date(timestamp))
  let hour = 0
  let minute = 0
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10)
    else if (p.type === 'minute') minute = parseInt(p.value, 10)
  }
  // Intl quirk: midnight may render as "24"
  if (hour === 24) hour = 0
  return { hour, minute, totalMinutes: hour * 60 + minute }
}

const PRE_MARKET_START_MIN = 4 * 60        // 04:00 ET
const REGULAR_OPEN_MIN = 9 * 60 + 30       // 09:30 ET

function isPreMarketTimestamp(ts: number): boolean {
  const { totalMinutes } = nyClockFor(ts)
  return totalMinutes >= PRE_MARKET_START_MIN && totalMinutes < REGULAR_OPEN_MIN
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

  const open = data.o
  const previousClose = data.pc
  const gapDollar =
    Number.isFinite(open) && Number.isFinite(previousClose)
      ? open - previousClose
      : undefined
  const gapPercent =
    gapDollar !== undefined && previousClose
      ? (gapDollar / previousClose) * 100
      : undefined

  return {
    symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open,
    previousClose,
    isMock: false,
    gapDollar,
    gapPercent,
  }
}

async function fetchOverlay(
  symbol: string,
  range: ChartRange,
  windowStart?: number,
  windowEnd?: number
): Promise<OverlayPoint[]> {
  if (symbol === MARKET_OVERLAY_SYMBOL) return [] // don't overlay SPY on itself

  const result = await safeFetch('SPY-overlay', () =>
    fetchYahooData(MARKET_OVERLAY_SYMBOL, range)
  )
  if (!result || result.chart.length === 0) return []

  let series = result.chart
  if (windowStart !== undefined && windowEnd !== undefined) {
    series = series.filter(
      (p) => p.timestamp >= windowStart && p.timestamp <= windowEnd
    )
    if (series.length < 2) series = result.chart
  }

  const baseline = series[0]?.price
  if (!baseline) return []

  return series.map((p) => ({
    timestamp: p.timestamp,
    pctChange: ((p.price - baseline) / baseline) * 100,
  }))
}

const INTRADAY_RANGES: ChartRange[] = ['10m', '1h', '3h', '1d']

async function fetchYahooData(
  symbol: string,
  range: ChartRange
): Promise<{ quote: StockQuote; chart: ChartPoint[] } | null> {
  const config = RANGE_CONFIG[range]
  const includePrepost = INTRADAY_RANGES.includes(range)
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${config.yahooInterval}&range=${config.yahooRange}${
    includePrepost ? '&includePrePost=true' : ''
  }`

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
      const highs: (number | null)[] =
        result.indicators?.quote?.[0]?.high || []
      const lows: (number | null)[] =
        result.indicators?.quote?.[0]?.low || []

      let preMarketHigh: number | undefined
      let preMarketLow: number | undefined

      let chartPoints: ChartPoint[] = []
      for (let i = 0; i < timestamps.length; i++) {
        const closePrice = closes[i]
        if (closePrice === null || closePrice === undefined) continue
        const ts = timestamps[i] * 1000

        if (includePrepost && isPreMarketTimestamp(ts)) {
          const candleHigh = highs[i] ?? closePrice
          const candleLow = lows[i] ?? closePrice
          if (preMarketHigh === undefined || candleHigh > preMarketHigh) {
            preMarketHigh = candleHigh
          }
          if (preMarketLow === undefined || candleLow < preMarketLow) {
            preMarketLow = candleLow
          }
        }

        chartPoints.push({
          time: config.formatTime(new Date(ts)),
          price: closePrice,
          timestamp: ts,
        })
      }

      chartPoints = chartPoints.slice(-config.maxPoints)

      const gapDollar =
        Number.isFinite(open) && Number.isFinite(previousClose)
          ? open - previousClose
          : undefined
      const gapPercent =
        gapDollar !== undefined && previousClose
          ? (gapDollar / previousClose) * 100
          : undefined

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
          preMarketHigh,
          preMarketLow,
          gapDollar,
          gapPercent,
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

  // Pull SPY overlay in parallel only when we actually have a chart to overlay against
  const primaryChart = yahooData?.chart ?? null
  const windowStart = primaryChart?.[0]?.timestamp
  const windowEnd = primaryChart?.[primaryChart.length - 1]?.timestamp

  let overlay: OverlayPoint[] = []
  if (primaryChart && primaryChart.length > 1) {
    overlay = await fetchOverlay(symbol, range, windowStart, windowEnd)
  }

  // Backfill pre-market data from Yahoo onto a Finnhub-primary quote
  const mergedQuote = finnhubQuote
    ? {
        ...finnhubQuote,
        preMarketHigh:
          finnhubQuote.preMarketHigh ?? yahooData?.quote.preMarketHigh,
        preMarketLow:
          finnhubQuote.preMarketLow ?? yahooData?.quote.preMarketLow,
        gapDollar:
          finnhubQuote.gapDollar ?? yahooData?.quote.gapDollar,
        gapPercent:
          finnhubQuote.gapPercent ?? yahooData?.quote.gapPercent,
      }
    : null

  if (mergedQuote && yahooData) {
    console.info(`[Fetch] Using Finnhub quote + Yahoo chart for ${symbol}`)
    return {
      quote: mergedQuote,
      chart: yahooData.chart,
      source: 'finnhub',
      overlay,
    }
  }

  if (mergedQuote) {
    console.info(`[Fetch] Using Finnhub quote + mock chart for ${symbol}`)
    return {
      quote: mergedQuote,
      chart: generateMockChartFromQuote(mergedQuote, range),
      source: 'finnhub',
      overlay: [],
    }
  }

  if (yahooData) {
    console.info(`[Fetch] Using Yahoo quote + chart for ${symbol}`)
    return {
      quote: yahooData.quote,
      chart: yahooData.chart,
      source: 'yahoo',
      overlay,
    }
  }

  console.warn(`[Fetch] All sources failed for ${symbol}, using full mock data`)
  const mockData = generateMockData(symbol, range)
  return {
    quote: mockData.quote,
    chart: mockData.chart,
    source: 'mock',
    overlay: [],
  }
}
