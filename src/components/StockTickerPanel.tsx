import { RefreshCw, X, TrendingUp, TrendingDown } from 'lucide-react'
import type { Ticker, ChartRange } from '../types'
import { useDashboard } from '../context/DashboardContext'
import { formatPrice, formatPercent, formatTime, profitColorClass } from '../utils/format'
import { RANGE_CONFIG } from '../services/stockService'
import { PriceChart } from './PriceChart'

interface StockTickerPanelProps {
  ticker: Ticker
  removable: boolean
}

const RANGES: ChartRange[] = ['10m', '1h', '3h', '1d', '1w', '1mo', '1y']

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

  return (
    <div
      className={`
        rounded-lg border bg-zinc-900/60 overflow-hidden
        ${isActive ? 'border-emerald-500/30 ring-1 ring-emerald-500/30' : 'border-zinc-800/80'}
      `}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800/80">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {ticker.symbol || 'New Ticker'}
          </h3>
          <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTicker(ticker.id)}
            className={`
              text-xs px-2.5 py-1 rounded-full font-medium transition
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
            className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${ticker.loading ? 'animate-spin' : ''}`}
            />
          </button>
          {removable && (
            <button
              onClick={() => removeTicker(ticker.id)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
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
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 uppercase placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
          />
          <button
            type="submit"
            disabled={ticker.loading || !ticker.inputSymbol.trim()}
            className="px-4 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-mono tabular-nums text-zinc-100">
                  {formatPrice(ticker.quote.price)}
                </span>
                <div className={`flex items-center gap-1 font-mono text-sm ${profitColorClass(ticker.quote.change)}`}>
                  {positive ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="tabular-nums">
                    {formatPrice(Math.abs(ticker.quote.change))} ({formatPercent(ticker.quote.changePercent)})
                  </span>
                </div>
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
                    : `Live · ${ticker.source || 'unknown'}`}
                </span>
              </div>
            </div>

            {/* OHLC stats */}
            <div className="grid grid-cols-4 gap-3 text-xs">
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
        <div className="border border-zinc-700/50 rounded-md p-1 flex gap-1">
          {RANGES.map((range) => (
            <button
              key={range}
              onClick={() => handleRangeChange(range)}
              disabled={ticker.loading}
              className={`
                flex-1 text-xs font-mono py-1 rounded transition
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

        {/* Price chart */}
        <PriceChart data={ticker.chart} positive={positive} />
      </div>
    </div>
  )
}
