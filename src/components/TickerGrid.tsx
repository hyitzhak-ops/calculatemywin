import { Plus } from 'lucide-react'
import { useDashboard } from '../context/DashboardContext'
import { StockTickerPanel } from './StockTickerPanel'

export function TickerGrid() {
  const { tickers, addTicker } = useDashboard()

  const removable = tickers.length > 1

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Watchlist</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {tickers.length} tracked · refreshing every 60s
          </p>
        </div>
        <button
          onClick={() => addTicker()}
          className="flex items-center justify-center gap-2 px-4 py-2 sm:px-3 sm:py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          <span>Add stock</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {tickers.map((ticker) => (
          <StockTickerPanel
            key={ticker.id}
            ticker={ticker}
            removable={removable}
          />
        ))}

        {/* Ghost "+" card */}
        <button
          onClick={() => addTicker()}
          className="rounded-lg border-2 border-dashed border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition flex items-center justify-center min-h-[180px] sm:min-h-[200px] text-zinc-500 hover:text-zinc-400 group touch-manipulation"
        >
          <div className="text-center">
            <Plus className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 group-hover:text-emerald-500 transition" />
            <p className="text-sm font-medium">Track another stock</p>
          </div>
        </button>
      </div>
    </section>
  )
}
