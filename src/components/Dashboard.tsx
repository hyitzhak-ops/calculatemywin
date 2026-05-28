import { BarChart3 } from 'lucide-react'
import { TickerGrid } from './TickerGrid'
import { PercentCalculator } from './PercentCalculator'
import { PositionCalculator } from './PositionCalculator'
import { SimulationLog } from './SimulationLog'

export function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-100">
                  Calculate My Win
                </h1>
                <p className="text-xs text-zinc-500">
                  Day trading dashboard · client-side
                </p>
              </div>
            </div>
            <div className="hidden sm:block text-xs text-zinc-500">
              Calculations update as you type
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <TickerGrid />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PercentCalculator />
          <PositionCalculator />
        </div>

        <SimulationLog />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-center text-xs text-zinc-500">
            Not financial advice. Optional{' '}
            <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
              VITE_FINNHUB_API_KEY
            </code>{' '}
            improves live data; Yahoo Finance and demo fallback used otherwise.
          </p>
        </div>
      </footer>
    </div>
  )
}
