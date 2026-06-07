import { RefreshCw, X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import type { Ticker, ChartRange } from '../types'
import { useDashboard } from '../context/DashboardContext'
import { formatPrice, formatPercent, formatTime, profitColorClass } from '../utils/format'
import { RANGE_CONFIG, MARKET_OVERLAY_SYMBOL } from '../services/stockService'
import { useVolatilityAlert } from '../hooks/useVolatilityAlert'
import { PriceChart } from './PriceChart'

interface StockTickerPanelProps {
  ticker: Ticker
  removable: boolean
}

const RANGES: ChartRange[] = ['10m', '1h', '3h', '1d', '1w', '1mo', '1y']

/**
 * Derive pre-market high/low. Uses explicit PM data from the quote if available,
 * otherwise falls back to chart extremes during pre-market hours.
 */
function derivePreMarketLevel(ticker: Ticker, kind: 'high' | 'low'): number | undefined {
  const explicit = kind === 'high' ? ticker.quote?.preMarketHigh : ticker.quote?.preMarketLow
  if (explicit !== undefined) return explicit

  if (!isPreMarketHours() || ticker.chart.length === 0) return undefined

  const prices = ticker.chart.map((p) => p.price).filter((p) => Number.isFinite(p))
  if (prices.length === 0) return undefined

  return kind === 'high' ? Math.max(...prices) : Math.min(...prices)
}

/**
 * Check if current time is during pre-market hours (4:00 AM - 9:30 AM ET)
 */
function isPreMarketHours(): boolean {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  let hour = 0
  let minute = 0
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10)
    else if (p.type === 'minute') minute = parseInt(p.value, 10)
  }
  if (hour === 24) hour = 0
  const totalMinutes = hour * 60 + minute
  const preMarketStart = 4 * 60 // 4:00 AM
  const marketOpen = 9 * 60 + 30 // 9:30 AM
  return totalMinutes >= preMarketStart && totalMinutes < marketOpen
}

export function StockTickerPanel({ ticker, removable }: StockTickerPanelProps) {
  const {
    setTickerInput,
    searchTicker,
    refreshTicker,
    removeTicker,
    setTickerRange,
    setActiveTicker,
    activeTickerId,
  } = useDashboard()

  const isActive = ticker.id === activeTickerId

  const handleLoad = (e: React.FormEvent) => {
    e.preventDefault()
    searchTicker(ticker.id)
  }

  const handleRangeChange = (range: ChartRange) => {
    setTickerRange(ticker.id, range)
  }

  const config = RANGE_CONFIG[ticker.range]
  const subtitle = ticker.symbol
    ? `${config.subtitle} · ${
        ticker.lastUpdated ? 'updated ' + formatTime(new Date(ticker.lastUpdated)) : ''
      }`
    : 'Enter a symbol above and press Load'

  const positive = (ticker.quote?.change ?? 0) >= 0

  const volatility = useVolatilityAlert(
    ticker.symbol || null,
    ticker.quote?.price
  )

  return (
    <div
      className={`
        rounded-lg border bg-zinc-900/60 overflow-hidden
        ${isActive ? 'border-emerald-500/30 ring-1 ring-emerald-500/30' : 'border-zinc-800/80'}
      `}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-zinc-800/80">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {ticker.symbol || 'New Ticker'}
          </h3>
          <p className="text-[10px] sm:text-xs text-zinc-500 truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveTicker(ticker.id)}
            className={`
              text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-full font-medium transition touch-manipulation
              ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }
            `}
          >
            {isActive ? 'Active' : 'Set active'}
          </button>
          <button
            onClick={() => refreshTicker(ticker.id)}
            disabled={ticker.loading || !ticker.symbol}
            className="p-2 sm:p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition touch-manipulation"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${ticker.loading ? 'animate-spin' : ''}`}
            />
          </button>
          {removable && (
            <button
              onClick={() => removeTicker(ticker.id)}
              className="p-2 sm:p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition touch-manipulation"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Search form */}
        <form onSubmit={handleLoad} className="flex gap-2">
          <input
            type="text"
            value={ticker.inputSymbol}
            onChange={(e) =>
              setTickerInput(ticker.id, e.target.value.toUpperCase())
            }
            onFocus={() => setActiveTicker(ticker.id)}
            placeholder="Symbol (e.g., AAPL)"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2.5 sm:py-2 text-sm text-zinc-100 uppercase placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 touch-manipulation"
          />
          <button
            type="submit"
            disabled={ticker.loading || !ticker.inputSymbol.trim()}
            className="px-4 sm:px-4 py-2.5 sm:py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition touch-manipulation"
          >
            Load
          </button>
        </form>

        {ticker.error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {ticker.error}
          </div>
        )}

        {ticker.quote && (
          <>
            {/* Quote display */}
            <div>
              <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
                <span className="text-2xl sm:text-3xl font-mono tabular-nums text-zinc-100">
                  {formatPrice(ticker.quote.price)}
                </span>
                <div className={`flex items-center gap-1 font-mono text-xs sm:text-sm ${profitColorClass(ticker.quote.change)}`}>
                  {positive ? (
                    <TrendingUp className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  ) : (
                    <TrendingDown className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  )}
                  <span className="tabular-nums">
                    {formatPrice(Math.abs(ticker.quote.change))} ({formatPercent(ticker.quote.changePercent)})
                  </span>
                </div>
                {/* Pre-Market Current Price Indicator */}
                {isPreMarketHours() && ticker.quote.previousClose && (() => {
                  // Only show a "live" pre-market price when it's clearly
                  // distinct from yesterday's close. If the two are within
                  // 0.05% of each other, the data feed is almost certainly
                  // returning the previous regular-session close (free-tier
                  // feeds don't include real-time pre-market prints), so
                  // showing it labeled "Pre-Market" would be misleading.
                  const cur = ticker.quote.price
                  const prev = ticker.quote.previousClose
                  const distinct =
                    prev > 0 && Math.abs(cur - prev) / prev > 0.0005
                  if (!distinct) {
                    return (
                      <div
                        className="flex items-center gap-2 text-xs bg-zinc-800/60 border border-zinc-700 rounded px-2.5 py-1"
                        title="Real-time pre-market quotes are not available on the current data plan. Showing yesterday's regular-session close."
                      >
                        <span className="inline-flex items-center gap-1 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                          Pre-Market
                        </span>
                        <span className="text-zinc-500">N/A</span>
                        <span className="text-zinc-600">|</span>
                        <span className="text-zinc-400 text-[10px] uppercase tracking-wider">
                          Close
                        </span>
                        <span className="font-mono tabular-nums text-zinc-300">
                          {formatPrice(prev)}
                        </span>
                      </div>
                    )
                  }
                  return (
                    <div className="flex items-center gap-2 text-xs bg-blue-500/15 border border-blue-500/40 rounded px-2.5 py-1 shadow-sm">
                      <span className="inline-flex items-center gap-1 text-blue-300 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        Pre-Market
                      </span>
                      <span className="font-mono tabular-nums text-blue-100 font-bold">
                        {formatPrice(cur)}
                      </span>
                      <span className="text-zinc-500">|</span>
                      <span className="text-zinc-400 text-[10px] uppercase tracking-wider">
                        Close
                      </span>
                      <span className="font-mono tabular-nums text-zinc-300">
                        {formatPrice(prev)}
                      </span>
                    </div>
                  )
                })()}
              </div>
              <div className="mt-2">
                <span
                  className={`
                    inline-block text-xs px-2 py-0.5 rounded-full font-medium
                    ${
                      ticker.quote.isMock
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-green-500/20 text-green-400'
                    }
                  `}
                  title={
                    ticker.quote.isMock
                      ? 'All live sources failed, showing demo data'
                      : undefined
                  }
                >
                  {ticker.quote.isMock
                    ? 'Demo'
                    : ticker.source === 'massive'
                      ? '⚡ Live · Massive'
                      : ticker.source === 'finnhub'
                        ? '🟢 Live · Finnhub'
                        : `Live · ${ticker.source || 'unknown'}`}
                </span>
              </div>
            </div>

            {/* Advanced metrics row (Gap + Pre-Market range) */}
            <AdvancedMetricsRow ticker={ticker} />

            {/* OHLC stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-zinc-500 mb-0.5">Open</div>
                <div className="font-mono tabular-nums text-zinc-100">
                  {formatPrice(ticker.quote.open)}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">High</div>
                <div className="font-mono tabular-nums text-zinc-100">
                  {formatPrice(ticker.quote.high)}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">Low</div>
                <div className="font-mono tabular-nums text-zinc-100">
                  {formatPrice(ticker.quote.low)}
                </div>
              </div>
              <div>
                <div className="text-zinc-500 mb-0.5">Prev Close</div>
                <div className="font-mono tabular-nums text-zinc-100">
                  {formatPrice(ticker.quote.previousClose)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Range selector */}
        <div className="border border-zinc-700/50 rounded-md p-1 flex gap-1 overflow-x-auto no-scrollbar">
          {RANGES.map((range) => (
            <button
              key={range}
              onClick={() => handleRangeChange(range)}
              disabled={ticker.loading}
              className={`
                flex-1 min-w-[44px] text-xs font-mono py-1.5 sm:py-1 rounded transition whitespace-nowrap
                ${
                  ticker.range === range
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-zinc-500 hover:bg-zinc-800'
                }
                disabled:opacity-40 disabled:cursor-not-allowed
              `}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Price chart with optional volatility flash */}
        <div
          className={`relative rounded-md transition-all ${
            volatility.active
              ? 'ring-2 ring-amber-400/70 animate-volatility-pulse'
              : ''
          }`}
        >
          {volatility.active && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-400/60 text-amber-200 text-[10px] font-semibold tracking-wide uppercase shadow-lg">
              <AlertTriangle className="w-3 h-3" />
              <span>
                High Volatility · {volatility.pctChange >= 0 ? '+' : ''}
                {volatility.pctChange.toFixed(2)}% in{' '}
                {Math.round(volatility.windowMs / 1000)}s
              </span>
            </div>
          )}
          <PriceChart
            data={ticker.chart}
            positive={positive}
            overlay={ticker.overlay}
            overlaySymbol={MARKET_OVERLAY_SYMBOL}
            preMarketHigh={derivePreMarketLevel(ticker, 'high')}
            preMarketLow={derivePreMarketLevel(ticker, 'low')}
            previousClose={ticker.quote?.previousClose}
            currentPrice={ticker.quote?.price}
            isPreMarket={isPreMarketHours()}
          />
          {ticker.overlay.length > 1 && (
            <div className="px-1 mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
              <span className="inline-block w-3 h-px bg-zinc-400 opacity-60" />
              <span className="font-mono">
                {MARKET_OVERLAY_SYMBOL} · % since open (relative strength)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface AdvancedMetricsRowProps {
  ticker: Ticker
}

function AdvancedMetricsRow({ ticker }: AdvancedMetricsRowProps) {
  const q = ticker.quote
  if (!q) return null

  const hasGap =
    q.gapDollar !== undefined &&
    q.gapPercent !== undefined &&
    Number.isFinite(q.gapDollar) &&
    Number.isFinite(q.gapPercent)

  // Use explicit PM data if available, otherwise derive from chart data
  // during pre-market hours
  let pmHigh = q.preMarketHigh
  let pmLow = q.preMarketLow

  if ((pmHigh === undefined || pmLow === undefined) && isPreMarketHours() && ticker.chart.length > 0) {
    // Derive from current chart data as a best-effort fallback
    const prices = ticker.chart.map((p) => p.price).filter((p) => Number.isFinite(p))
    if (prices.length > 0) {
      pmHigh = pmHigh ?? Math.max(...prices)
      pmLow = pmLow ?? Math.min(...prices)
    }
  }

  const hasPreMarket = pmHigh !== undefined && pmLow !== undefined

  if (!hasGap && !hasPreMarket) return null

  const gapPositive = (q.gapPercent ?? 0) >= 0

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-[11px]">
      {hasGap && (
        <div
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-md border font-mono tabular-nums ${
            gapPositive
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
          title="Gap = today's open vs. yesterday's close"
        >
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-70 font-sans font-semibold">
            Gap
          </span>
          <span>
            {gapPositive ? '+' : ''}
            {(q.gapPercent ?? 0).toFixed(2)}%
          </span>
          <span className="opacity-70 hidden sm:inline">
            ({gapPositive ? '+' : ''}
            {formatPrice(q.gapDollar ?? 0)})
          </span>
        </div>
      )}
      {hasPreMarket && (
        <div
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded-md border border-zinc-700 bg-zinc-900/60 text-zinc-300 font-mono tabular-nums"
          title="Pre-market high/low (4:00–9:30 ET)"
        >
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-70 font-sans font-semibold">
            Pre-Mkt
          </span>
          <span className="text-emerald-300 text-[9px] sm:text-[10px]">
            H {formatPrice(pmHigh!)}
          </span>
          <span className="opacity-50">·</span>
          <span className="text-red-300 text-[9px] sm:text-[10px]">
            L {formatPrice(pmLow!)}
          </span>
        </div>
      )}
    </div>
  )
}
