import { Zap, Activity, Info } from 'lucide-react'
import { getActiveProvider } from '../services/stockService'
import { useState, useEffect } from 'react'

export function ProviderStatusBadge() {
  const [provider, setProvider] = useState<'massive' | 'finnhub'>('finnhub')
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    // Determine active provider once on mount
    const activeProvider = getActiveProvider()
    setProvider(activeProvider)
    console.log('[ProviderStatusBadge] Active provider:', activeProvider)
  }, [])

  if (provider === 'massive') {
    return (
      <div className="relative">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 border-2 border-blue-500/40 shadow-lg shadow-blue-500/20 cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-sm font-bold text-blue-200">
            Massive.com Active
          </span>
          <Info className="w-3.5 h-3.5 text-blue-400" />
        </div>
        {showTooltip && (
          <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-zinc-900 border border-blue-500/30 rounded-lg shadow-xl z-50 text-xs">
            <div className="font-semibold text-blue-300 mb-1">⚡ Massive.com (Polygon.io)</div>
            <div className="text-zinc-400">
              Using daily aggregates from Massive. Real-time quotes via Finnhub. Pre-market via Yahoo.
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Activity className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-bold text-emerald-200">
          Finnhub Active
        </span>
        <Info className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      {showTooltip && (
        <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-zinc-900 border border-emerald-500/30 rounded-lg shadow-xl z-50 text-xs">
          <div className="font-semibold text-emerald-300 mb-1">🟢 Finnhub.io</div>
          <div className="text-zinc-400">
            Using Finnhub for real-time quotes. Pre-market and charts via Yahoo Finance.
          </div>
        </div>
      )}
    </div>
  )
}
