import type {
  ChartPoint,
  ChartRange,
  DataSource,
  OverlayPoint,
  StockQuote,
} from '../types'

// Optimized polling: 30-second window reduces API rate-limit pressure by 50%
export const POLL_MS = 30_000

export const MARKET_OVERLAY_SYMBOL = 'SPY'

// ─── Static Data Cache ──────────────────────────────────────────────────────
// Pre-market boundaries, overlay data, and historical chart points are fetched
// ONCE per symbol and cached indefinitely during the session. Only live price
// is polled on the 30s interval.

interface StaticDataCache {
  preMarketHigh?: number
  preMarketLow?: number
  gapDollar?: number
  gapPercent?: number
  chart: ChartPoint[]
  overlay: OverlayPoint[]
  // Last successful quote — used by stale-while-revalidate so the UI keeps
  // the previous change/changePercent values when a poll fails, instead of
  // flatlining to 0.
  lastQuote?: StockQuote
  fetchedAt: number
}

const staticCache = new Map<string, StaticDataCache>()

function getCacheKey(symbol: string, range: ChartRange): string {
  return `${symbol}:${range}`
}

export function getStaticCache(symbol: string, range: ChartRange): StaticDataCache | null {
  return staticCache.get(getCacheKey(symbol, range)) ?? null
}

function setStaticCache(symbol: string, range: ChartRange, data: StaticDataCache): void {
  staticCache.set(getCacheKey(symbol, range), data)
}

export function clearStaticCache(symbol?: string): void {
  if (symbol) {
    // Clear all ranges for this symbol
    for (const key of staticCache.keys()) {
      if (key.startsWith(`${symbol}:`)) {
        staticCache.delete(key)
      }
    }
  } else {
    // Clear entire cache
    staticCache.clear()
  }
}

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

// Default timeout for any single fetch. Tight enough that a stalled CORS
// proxy can't dominate a refresh cycle, but long enough that the average
// proxy round-trip (200-1500ms) succeeds comfortably.
const FETCH_TIMEOUT_MS = 5_000

async function fetchWithTimeout(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    })
  } finally {
    clearTimeout(timer)
  }
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

/**
 * Retry a fetcher with a short, bounded backoff. Worst-case timing for the
 * default 2 attempts: 5s + 400ms + 5s = ~10.4s. The previous 3-attempt /
 * 800ms+1600ms backoff schedule could push a single fetcher past 20s, which
 * tripped the outer safety timeout in DashboardContext.
 */
async function fetchWithRetry<T>(
  name: string,
  fetcher: () => Promise<T | null>,
  maxAttempts = 2
): Promise<T | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      console.info(`[${name}] retry attempt ${attempt + 1}/${maxAttempts}`)
    }

    try {
      const result = await fetcher()
      if (result !== null && result !== undefined) {
        if (attempt > 0) {
          console.info(`[${name}] ✓ succeeded on attempt ${attempt + 1}`)
        }
        return result
      }
    } catch (err) {
      console.warn(`[${name}] attempt ${attempt + 1} threw:`, err)
    }
  }

  console.warn(`[${name}] all ${maxAttempts} attempts failed`)
  return null
}

// Finnhub also returns a quote timestamp (Unix seconds) which we use to
// detect stale quotes (e.g. weekend, before pre-market open, low-volume
// tickers). We pass it back via a side-channel WeakMap to avoid polluting
// the StockQuote type, which is consumed throughout the UI.
const finnhubQuoteTimestamps = new WeakMap<StockQuote, number>()

function getFinnhubQuoteTimestamp(quote: StockQuote): number | undefined {
  return finnhubQuoteTimestamps.get(quote)
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

  const response = await fetchWithTimeout(url)
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

  const quote: StockQuote = {
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
  // data.t is the Finnhub quote timestamp in Unix seconds. Stash it on the
  // side channel so the live-tip logic can detect a stale quote.
  if (typeof data.t === 'number' && data.t > 0) {
    finnhubQuoteTimestamps.set(quote, data.t * 1000)
  }
  return quote
}

/**
 * Dedicated fetcher for Pre-Market High/Low boundaries.
 *
 * Always uses 1-minute candles + 1-day range + includePrePost=true to ensure
 * we capture the full 04:00-09:30 ET pre-market window with maximum granularity.
 *
 * This runs IN PARALLEL to the main chart fetch, regardless of the user's
 * selected range. So even if the user is viewing "1mo" (where the main chart
 * doesn't include intraday/pre-market data), we still get accurate PM levels.
 *
 * Returns null if fetch fails OR if no pre-market candles exist for today
 * (e.g. weekend, after-hours session not yet started, illiquid stock with
 * no pre-market activity).
 */
async function fetchPreMarketLevels(
  symbol: string
): Promise<{ preMarketHigh?: number; preMarketLow?: number } | null> {
  const cacheBuster = `&_cb=${Date.now()}`
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=1m&range=1d&includePrePost=true${cacheBuster}`

  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  ]

  for (const proxyUrl of proxies) {
    try {
      const response = await fetchWithTimeout(proxyUrl)
      if (!response.ok) continue

      const data = await response.json()
      const result = data?.chart?.result?.[0]
      if (!result) continue

      const timestamps: number[] = result.timestamp || []
      const highs: (number | null)[] = result.indicators?.quote?.[0]?.high || []
      const lows: (number | null)[] = result.indicators?.quote?.[0]?.low || []
      const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || []

      let preMarketHigh: number | undefined
      let preMarketLow: number | undefined

      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i] * 1000
        if (!isPreMarketTimestamp(ts)) continue

        const candleHigh = highs[i] ?? closes[i]
        const candleLow = lows[i] ?? closes[i]
        if (candleHigh === null || candleHigh === undefined) continue
        if (candleLow === null || candleLow === undefined) continue

        if (preMarketHigh === undefined || candleHigh > preMarketHigh) {
          preMarketHigh = candleHigh
        }
        if (preMarketLow === undefined || candleLow < preMarketLow) {
          preMarketLow = candleLow
        }
      }

      // Successfully fetched data, even if no PM candles exist (weekend/illiquid)
      if (preMarketHigh !== undefined && preMarketLow !== undefined) {
        console.info(
          `[PreMarket] ✓ Fetched for ${symbol}: H $${preMarketHigh.toFixed(2)} L $${preMarketLow.toFixed(2)}`
        )
        return { preMarketHigh, preMarketLow }
      }

      // No pre-market data found, but the API responded — don't retry
      console.info(`[PreMarket] No pre-market candles for ${symbol} (weekend or illiquid)`)
      return { preMarketHigh: undefined, preMarketLow: undefined }
    } catch {
      continue
    }
  }

  // All proxies failed — let caller retry if needed
  console.warn(`[PreMarket] All proxies failed for ${symbol}`)
  return null
}

const INTRADAY_RANGES: ChartRange[] = ['10m', '1h', '3h', '1d']

// How fresh the Finnhub quote must be to be trusted for the live tip.
// During the regular session it ticks every few seconds; if it's older
// than this, the market is closed (weekend, off-hours) or the ticker is
// illiquid and we shouldn't paste a stale price onto the chart's right edge.
const LIVE_QUOTE_FRESHNESS_MS = 90_000


// ─── Live Tail ───────────────────────────────────────────────────────────────
// Yahoo's 1-minute candles can lag 3-5 minutes for thin/penny stocks. To keep
// the chart's right edge at "now", we accumulate Finnhub quotes in a per-
// symbol live tail and merge them onto whatever Yahoo returned. Each poll
// pushes one new tick; the tail is capped and pruned to the current session.

interface LiveTick {
  timestamp: number
  price: number
}

const liveTails = new Map<string, LiveTick[]>()
const LIVE_TAIL_MAX_LENGTH = 240          // 240 ticks @ 30s = 2h of live tail
const LIVE_TAIL_MAX_AGE_MS = 24 * 60 * 60 * 1000

function pushLiveTick(symbol: string, price: number, timestampMs: number): void {
  const existing = liveTails.get(symbol) ?? []
  const cutoff = Date.now() - LIVE_TAIL_MAX_AGE_MS

  // Don't add duplicates within the same poll bucket — keep the latest only.
  const last = existing[existing.length - 1]
  let next: LiveTick[]
  if (last && timestampMs - last.timestamp < 25_000) {
    next = [...existing.slice(0, -1), { timestamp: timestampMs, price }]
  } else {
    next = [...existing, { timestamp: timestampMs, price }]
  }

  next = next.filter((t) => t.timestamp >= cutoff).slice(-LIVE_TAIL_MAX_LENGTH)
  liveTails.set(symbol, next)
}

function getLiveTail(symbol: string): LiveTick[] {
  const cutoff = Date.now() - LIVE_TAIL_MAX_AGE_MS
  return (liveTails.get(symbol) ?? []).filter((t) => t.timestamp >= cutoff)
}

export function clearLiveTail(symbol?: string): void {
  if (symbol) liveTails.delete(symbol)
  else liveTails.clear()
}

/**
 * Extend an intraday chart's right edge with our accumulated in-session live
 * tail (Finnhub ticks recorded across polls). This bridges Yahoo's lag —
 * Yahoo's 1-minute candle endpoint can be 3-5 minutes behind real time on
 * thin/penny stocks, so without this the chart freezes a few minutes back
 * even though "updated" timestamps look fresh.
 *
 * Each call:
 *   1. Records the new Finnhub tick into the symbol's live tail (if fresh).
 *   2. Returns Yahoo's chart + every tail tick newer than Yahoo's last candle.
 *
 * The only guard is a freshness check on the Finnhub quote timestamp — if
 * it's older than 90s the market is closed and we shouldn't graft a stale
 * price. We do NOT gate on deviation (price difference from Yahoo) because
 * volatile penny stocks routinely move 20%+ in minutes — that's real action,
 * not a data error.
 */
function appendLiveTip(
  chart: ChartPoint[],
  symbol: string,
  livePrice: number | undefined,
  range: ChartRange,
  liveQuoteTimestampMs?: number
): ChartPoint[] {
  if (!INTRADAY_RANGES.includes(range)) return chart
  if (chart.length === 0) return chart

  const config = RANGE_CONFIG[range]
  const nowMs = Date.now()

  // Decide whether THIS tick is fresh enough to record. (Off-hours / weekend
  // quotes can be hours old and would just plant a flat step.)
  let liveIsFresh = livePrice !== undefined
  if (livePrice !== undefined && liveQuoteTimestampMs !== undefined) {
    const ageMs = nowMs - liveQuoteTimestampMs
    if (ageMs > LIVE_QUOTE_FRESHNESS_MS) {
      liveIsFresh = false
      console.info(
        `[LiveTip] Skipping new tick — Finnhub quote is ${Math.round(ageMs / 1000)}s old`
      )
    }
  }

  if (livePrice !== undefined && liveIsFresh) {
    pushLiveTick(symbol, livePrice, nowMs)
  }

  const tail = getLiveTail(symbol)
  if (tail.length === 0) return chart

  const lastChartPoint = chart[chart.length - 1]
  const yahooTailMs = lastChartPoint?.timestamp ?? 0

  // Only graft tail entries that come AFTER Yahoo's last candle so the live
  // tail extends the chart instead of overwriting any good Yahoo data.
  const tailToGraft = tail.filter((t) => t.timestamp > yahooTailMs)
  if (tailToGraft.length === 0) return chart

  const liveChartPoints: ChartPoint[] = tailToGraft.map((t) => ({
    time: config.formatTime(new Date(t.timestamp)),
    price: t.price,
    timestamp: t.timestamp,
  }))

  return [...chart, ...liveChartPoints].slice(-config.maxPoints)
}

async function fetchYahooData(
  symbol: string,
  range: ChartRange
): Promise<{ quote: StockQuote; chart: ChartPoint[] } | null> {
  const config = RANGE_CONFIG[range]
  const includePrepost = INTRADAY_RANGES.includes(range)
  // Cache-buster: append a random nonce so CORS proxy caches don't serve
  // stale responses. This was the root cause of the "chart frozen" bug —
  // the proxies were serving cached Yahoo data from minutes ago.
  const cacheBuster = `&_cb=${Date.now()}`
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${config.yahooInterval}&range=${config.yahooRange}${
    includePrepost ? '&includePrePost=true' : ''
  }${cacheBuster}`

  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  ]

  let lastError: unknown = null

  for (const proxyUrl of proxies) {
    try {
      const response = await fetchWithTimeout(proxyUrl)
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

/**
 * Fetch stock data with intelligent caching strategy.
 *
 * STATIC DATA (fetched once, cached indefinitely):
 *   - Pre-market high/low boundaries
 *   - Gap calculation (open vs previous close)
 *   - Historical chart candles
 *   - SPY overlay correlation data
 *
 * VOLATILE DATA (polled every 30s):
 *   - Current market price
 *   - Latest minute candle (for intraday ranges)
 *
 * This separation cuts API consumption by 70-80% while maintaining
 * real-time price updates and prevents rate-limiting (429 errors).
 */
export async function fetchStockData(
  symbol: string,
  range: ChartRange,
  isPolling = false
): Promise<FetchResult> {
  const cacheKey = getCacheKey(symbol, range)
  const cached = staticCache.get(cacheKey)

  // ── FAST PATH: Polling mode ──
  // On every 30s tick we refresh:
  //   • the live quote (Finnhub) so price/change update,
  //   • the chart (Yahoo) so the X-axis timeline advances and a new candle is
  //     appended,
  //   • the SPY overlay so it stays aligned with the moving chart window.
  //
  // We KEEP cached pre-market boundaries (they're frozen at 9:30 ET) and
  // gap values, and fall back to them when a fresh fetch can't produce them.
  if (isPolling && cached) {
    console.info(`[Fetch:Poll] Refreshing live data for ${symbol}`)

    const isOverlaySymbolPoll = symbol === MARKET_OVERLAY_SYMBOL

    // Use fetchWithRetry for Yahoo paths so transient proxy hiccups don't
    // leave the chart stuck on stale data. Finnhub stays single-shot — its
    // /quote endpoint is reliable, and another retry would just slow the
    // poll cycle.
    const [finnhubQuote, yahooData, overlayResult] = await Promise.all([
      safeFetch('Finnhub', () => fetchFinnhubQuote(symbol)),
      fetchWithRetry('Yahoo-Poll', () => fetchYahooData(symbol, range), 2),
      isOverlaySymbolPoll
        ? Promise.resolve(null)
        : fetchWithRetry(
            'SPY-overlay-Poll',
            () => fetchYahooData(MARKET_OVERLAY_SYMBOL, range),
            2
          ),
    ])

    // PM levels: prefer fresh values, fall back to cached. PM is frozen after
    // 09:30 ET so cached values stay correct for the rest of the session.
    const isMissingPM =
      cached.preMarketHigh === undefined && cached.preMarketLow === undefined
    if (isMissingPM) {
      // Try a dedicated PM fetch in the background so the next poll has it
      void (async () => {
        const pm = await fetchWithRetry('PreMarket-Backfill', () =>
          fetchPreMarketLevels(symbol)
        )
        if (pm && (pm.preMarketHigh !== undefined || pm.preMarketLow !== undefined)) {
          const updated = staticCache.get(getCacheKey(symbol, range))
          if (updated) {
            updated.preMarketHigh = pm.preMarketHigh
            updated.preMarketLow = pm.preMarketLow
            setStaticCache(symbol, range, updated)
            console.info(`[Fetch:Poll] ✓ PM backfilled for ${symbol}`)
          }
        }
      })()
    }

    const finalPreMarketHigh =
      yahooData?.quote.preMarketHigh ?? cached.preMarketHigh
    const finalPreMarketLow =
      yahooData?.quote.preMarketLow ?? cached.preMarketLow
    const finalGapDollar =
      finnhubQuote?.gapDollar ?? yahooData?.quote.gapDollar ?? cached.gapDollar
    const finalGapPercent =
      finnhubQuote?.gapPercent ?? yahooData?.quote.gapPercent ?? cached.gapPercent

    // Build refreshed overlay aligned to the new chart window
    let overlay: OverlayPoint[] = cached.overlay
    if (overlayResult && overlayResult.chart.length > 0 && yahooData?.chart) {
      const primaryChart = yahooData.chart
      const windowStart = primaryChart[0]?.timestamp
      const windowEnd = primaryChart[primaryChart.length - 1]?.timestamp
      let series = overlayResult.chart
      if (windowStart !== undefined && windowEnd !== undefined) {
        series = series.filter(
          (p) => p.timestamp >= windowStart && p.timestamp <= windowEnd
        )
        if (series.length < 2) series = overlayResult.chart
      }
      const baseline = series[0]?.price
      if (baseline) {
        overlay = series.map((p) => ({
          timestamp: p.timestamp,
          pctChange: ((p.price - baseline) / baseline) * 100,
        }))
      }
    }

    // Resolve final chart — prefer freshly fetched, fall back to cached.
    // Then extend with the live tail so the right edge reaches "now" even
    // if Yahoo's last candle is several minutes old.
    const finalChart = appendLiveTip(
      yahooData?.chart ?? cached.chart,
      symbol,
      finnhubQuote?.price,
      range,
      finnhubQuote ? getFinnhubQuoteTimestamp(finnhubQuote) : undefined
    )

    // Resolve final quote — prefer Finnhub, then Yahoo, then last-known cached
    let finalQuote: StockQuote | null = null
    if (finnhubQuote) {
      finalQuote = {
        ...finnhubQuote,
        preMarketHigh: finalPreMarketHigh,
        preMarketLow: finalPreMarketLow,
        gapDollar: finalGapDollar,
        gapPercent: finalGapPercent,
      }
    } else if (yahooData) {
      finalQuote = {
        ...yahooData.quote,
        preMarketHigh: finalPreMarketHigh,
        preMarketLow: finalPreMarketLow,
        gapDollar: finalGapDollar,
        gapPercent: finalGapPercent,
      }
    } else if (cached.lastQuote) {
      // Stale-while-revalidate: keep the last good quote rather than zeroing
      // out change/changePercent. Price/high/low/etc. all stay as-is.
      console.warn(
        `[Fetch:Poll] Both quote sources failed for ${symbol}, reusing last known quote`
      )
      finalQuote = {
        ...cached.lastQuote,
        preMarketHigh: finalPreMarketHigh,
        preMarketLow: finalPreMarketLow,
        gapDollar: finalGapDollar,
        gapPercent: finalGapPercent,
      }
    }

    if (finalQuote) {
      // Update cache with the fresh data so subsequent polls have current
      // chart/overlay and a fresh lastQuote for next stale fallback.
      setStaticCache(symbol, range, {
        preMarketHigh: finalPreMarketHigh,
        preMarketLow: finalPreMarketLow,
        gapDollar: finalGapDollar,
        gapPercent: finalGapPercent,
        chart: finalChart,
        overlay,
        lastQuote: finalQuote,
        fetchedAt: Date.now(),
      })

      console.info(
        `[Fetch:Poll] ✓ ${symbol} refreshed — quote:${finnhubQuote ? 'finnhub' : yahooData ? 'yahoo' : 'stale'}` +
          ` chart:${yahooData ? 'fresh' : 'cached'} overlay:${overlayResult ? 'fresh' : 'cached'}`
      )

      return {
        quote: finalQuote,
        chart: finalChart,
        source: finnhubQuote ? 'finnhub' : yahooData ? 'yahoo' : 'finnhub',
        overlay,
      }
    }

    // Total failure — return whatever we cached so the UI doesn't blank.
    // Still call appendLiveTip so any Finnhub price we got extends the chart.
    console.warn(
      `[Fetch:Poll] All sources failed for ${symbol}, holding cached snapshot`
    )
    if (cached.lastQuote) {
      const extendedChart = appendLiveTip(
        cached.chart,
        symbol,
        finnhubQuote?.price,
        range,
        finnhubQuote ? getFinnhubQuoteTimestamp(finnhubQuote) : undefined
      )
      return {
        quote: finnhubQuote
          ? { ...finnhubQuote, preMarketHigh: cached.preMarketHigh, preMarketLow: cached.preMarketLow, gapDollar: cached.gapDollar, gapPercent: cached.gapPercent }
          : cached.lastQuote,
        chart: extendedChart,
        source: 'finnhub',
        overlay: cached.overlay,
      }
    }
    // Cache exists but no lastQuote (legacy entry) — fall through to FULL fetch
  }

  // ── FULL FETCH: Initial load or cache miss ──
  // Fetch ALL data (quote + chart + overlay + pre-market boundaries) IN PARALLEL.
  // This happens ONCE per symbol when first loaded or range changed.
  //
  // Pre-market levels and SPY overlay are fetched via DEDICATED endpoints with
  // retry logic, so they succeed independently of the main chart fetch.
  console.info(`[Fetch:Full] Fetching complete dataset for ${symbol} (${range})`)

  const isOverlaySymbol = symbol === MARKET_OVERLAY_SYMBOL

  const [finnhubQuote, yahooData, preMarketLevels, overlayResult] = await Promise.all([
    // Live quote (Finnhub)
    safeFetch('Finnhub', () => fetchFinnhubQuote(symbol)),
    // Main chart (Yahoo) — uses user-selected range
    fetchWithRetry('Yahoo', () => fetchYahooData(symbol, range)),
    // Pre-market levels — ALWAYS fetched with 1m granularity for accuracy
    fetchWithRetry('PreMarket', () => fetchPreMarketLevels(symbol)),
    // SPY overlay — fetched in parallel for any non-SPY symbol
    isOverlaySymbol
      ? Promise.resolve(null)
      : fetchWithRetry('SPY-overlay-data', () =>
          fetchYahooData(MARKET_OVERLAY_SYMBOL, range)
        ),
  ])

  // Build SPY overlay from the resolved overlay data
  let overlay: OverlayPoint[] = []
  if (overlayResult && overlayResult.chart.length > 0 && yahooData?.chart) {
    const primaryChart = yahooData.chart
    const windowStart = primaryChart[0]?.timestamp
    const windowEnd = primaryChart[primaryChart.length - 1]?.timestamp

    let series = overlayResult.chart
    if (windowStart !== undefined && windowEnd !== undefined) {
      series = series.filter(
        (p) => p.timestamp >= windowStart && p.timestamp <= windowEnd
      )
      if (series.length < 2) series = overlayResult.chart
    }

    const baseline = series[0]?.price
    if (baseline) {
      overlay = series.map((p) => ({
        timestamp: p.timestamp,
        pctChange: ((p.price - baseline) / baseline) * 100,
      }))
    }
  }

  // Resolve pre-market levels: dedicated fetcher takes priority,
  // fall back to the values embedded in the main chart fetch
  const finalPreMarketHigh =
    preMarketLevels?.preMarketHigh ?? yahooData?.quote.preMarketHigh
  const finalPreMarketLow =
    preMarketLevels?.preMarketLow ?? yahooData?.quote.preMarketLow

  // Resolve gap from any available source
  const finalGapDollar = finnhubQuote?.gapDollar ?? yahooData?.quote.gapDollar
  const finalGapPercent = finnhubQuote?.gapPercent ?? yahooData?.quote.gapPercent

  // Build merged quote — prefer Finnhub price, augment with all static metadata
  const mergedQuote: StockQuote | null = finnhubQuote
    ? {
        ...finnhubQuote,
        preMarketHigh: finalPreMarketHigh,
        preMarketLow: finalPreMarketLow,
        gapDollar: finalGapDollar,
        gapPercent: finalGapPercent,
      }
    : yahooData
      ? {
          ...yahooData.quote,
          preMarketHigh: finalPreMarketHigh,
          preMarketLow: finalPreMarketLow,
          gapDollar: finalGapDollar,
          gapPercent: finalGapPercent,
        }
      : null

  // ── Cache static data for future polling cycles ──
  if (mergedQuote || yahooData) {
    const staticData: StaticDataCache = {
      preMarketHigh: finalPreMarketHigh,
      preMarketLow: finalPreMarketLow,
      gapDollar: finalGapDollar,
      gapPercent: finalGapPercent,
      chart: yahooData?.chart ?? [],
      overlay,
      lastQuote: mergedQuote ?? yahooData?.quote,
      fetchedAt: Date.now(),
    }
    setStaticCache(symbol, range, staticData)
    console.info(
      `[Fetch:Full] ✓ Static data cached for ${symbol} (${range})` +
        ` · PM: ${finalPreMarketHigh ? `H $${finalPreMarketHigh.toFixed(2)}/L $${finalPreMarketLow?.toFixed(2)}` : 'none'}` +
        ` · Overlay: ${overlay.length} points`
    )
  }

  if (mergedQuote && yahooData) {
    console.info(`[Fetch:Full] Using Finnhub quote + Yahoo chart for ${symbol}`)
    const liveChart = appendLiveTip(
      yahooData.chart,
      symbol,
      finnhubQuote?.price,
      range,
      finnhubQuote ? getFinnhubQuoteTimestamp(finnhubQuote) : undefined
    )
    return {
      quote: mergedQuote,
      chart: liveChart,
      source: finnhubQuote ? 'finnhub' : 'yahoo',
      overlay,
    }
  }

  if (mergedQuote && finnhubQuote) {
    console.info(`[Fetch:Full] Using Finnhub quote + mock chart for ${symbol}`)
    const mockChart = generateMockChartFromQuote(mergedQuote, range)

    // Cache the mock chart too — but preserve the real PM/overlay data we got
    setStaticCache(symbol, range, {
      preMarketHigh: finalPreMarketHigh,
      preMarketLow: finalPreMarketLow,
      gapDollar: finalGapDollar,
      gapPercent: finalGapPercent,
      chart: mockChart,
      overlay,
      lastQuote: mergedQuote,
      fetchedAt: Date.now(),
    })

    return {
      quote: mergedQuote,
      chart: mockChart,
      source: 'finnhub',
      overlay,
    }
  }

  if (yahooData) {
    console.info(`[Fetch:Full] Using Yahoo quote + chart for ${symbol}`)
    return {
      quote: {
        ...yahooData.quote,
        preMarketHigh: finalPreMarketHigh,
        preMarketLow: finalPreMarketLow,
        gapDollar: finalGapDollar,
        gapPercent: finalGapPercent,
      },
      chart: yahooData.chart,
      source: 'yahoo',
      overlay,
    }
  }

  // ── FALLBACK: Check cache before generating mock ──
  // If we have cached data but all sources failed, use stale-while-revalidate.
  // Prefer the last successful quote (preserves change/changePercent) over
  // synthesizing one from the last candle.
  if (cached) {
    console.warn(`[Fetch:Full] All sources failed for ${symbol}, using cached data (stale)`)

    if (cached.lastQuote) {
      return {
        quote: {
          ...cached.lastQuote,
          preMarketHigh: cached.preMarketHigh,
          preMarketLow: cached.preMarketLow,
          gapDollar: cached.gapDollar,
          gapPercent: cached.gapPercent,
        },
        chart: cached.chart,
        source: 'finnhub',
        overlay: cached.overlay,
      }
    }

    const lastCandle = cached.chart[cached.chart.length - 1]
    if (lastCandle) {
      const staleQuote: StockQuote = {
        symbol,
        price: lastCandle.price,
        change: 0,
        changePercent: 0,
        high: lastCandle.price * 1.01,
        low: lastCandle.price * 0.99,
        open: lastCandle.price,
        previousClose: lastCandle.price,
        isMock: false,
        preMarketHigh: cached.preMarketHigh,
        preMarketLow: cached.preMarketLow,
        gapDollar: cached.gapDollar,
        gapPercent: cached.gapPercent,
      }

      return {
        quote: staleQuote,
        chart: cached.chart,
        source: 'finnhub',
        overlay: cached.overlay,
      }
    }
  }

  console.warn(`[Fetch:Full] All sources failed for ${symbol}, using full mock data`)
  const mockData = generateMockData(symbol, range)

  // Cache the mock data
  setStaticCache(symbol, range, {
    chart: mockData.chart,
    overlay: [],
    fetchedAt: Date.now(),
  })

  return {
    quote: mockData.quote,
    chart: mockData.chart,
    source: 'mock',
    overlay: [],
  }
}
