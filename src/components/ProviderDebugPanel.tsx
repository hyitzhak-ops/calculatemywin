import { useState } from 'react'
import { ChevronDown, ChevronUp, Zap, Activity, Database, TestTube } from 'lucide-react'
import { getActiveProvider } from '../services/stockService'

export function ProviderDebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const activeProvider = getActiveProvider()

  const massiveKeySet = import.meta.env.VITE_MASSIVE_API_KEY?.trim() ? true : false
  const finnhubKeySet = import.meta.env.VITE_FINNHUB_API_KEY?.trim() ? true : false

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg hover:bg-zinc-800 transition"
        >
          <TestTube className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-300">Provider Status</span>
          <ChevronUp className="w-4 h-4 text-zinc-400" />
        </button>
      ) : (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TestTube className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-100">Provider Status</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-zinc-800 rounded transition"
            >
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Active Provider */}
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-xs text-zinc-500 mb-1">Active Provider</div>
              <div className="flex items-center gap-2">
                {activeProvider === 'massive' ? (
                  <>
                    <Zap className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-blue-300">⚡ Massive.com</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-300">🟢 Finnhub</span>
                  </>
                )}
              </div>
            </div>

            {/* API Keys Status */}
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-xs text-zinc-500 mb-2">API Keys Configured</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs text-zinc-300">Massive</span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      massiveKeySet ? 'text-green-400' : 'text-zinc-500'
                    }`}
                  >
                    {massiveKeySet ? '✓ Set' : '✗ Not Set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs text-zinc-300">Finnhub</span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      finnhubKeySet ? 'text-green-400' : 'text-zinc-500'
                    }`}
                  >
                    {finnhubKeySet ? '✓ Set' : '✗ Not Set'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs text-zinc-300">Yahoo</span>
                  </div>
                  <span className="text-xs font-medium text-green-400">
                    ✓ Always Available
                  </span>
                </div>
              </div>
            </div>

            {/* Data Sources */}
            <div className="p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-xs text-zinc-500 mb-2">Current Data Flow</div>
              <div className="text-xs text-zinc-300 space-y-1">
                {activeProvider === 'massive' ? (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Quotes: Massive daily + Finnhub live</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Pre-Market: Yahoo Finance</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Charts: Yahoo Finance</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400">•</span>
                      <span>Quotes: Finnhub real-time</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400">•</span>
                      <span>Pre-Market: Yahoo Finance</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400">•</span>
                      <span>Charts: Yahoo Finance</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Plan Info */}
            {massiveKeySet && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-xs text-blue-300 font-medium mb-1">
                  💡 Massive.com Plan Info
                </div>
                <div className="text-xs text-zinc-400">
                  Your current plan includes daily aggregates. For real-time quotes and 1-min pre-market data, upgrade at{' '}
                  <a
                    href="https://massive.com/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    massive.com/pricing
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
