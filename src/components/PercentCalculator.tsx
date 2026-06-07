import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PriceTier {
  percentage: number
  targetPrice: number
}

export function PercentCalculator() {
  const [basePrice, setBasePrice] = useState<string>('100')

  const tiers = useMemo((): { profit: PriceTier[]; loss: PriceTier[] } => {
    const base = parseFloat(basePrice)

    if (isNaN(base) || base <= 0) {
      return { profit: [], loss: [] }
    }

    const percentages = Array.from({ length: 20 }, (_, i) => (i + 1) * 5)

    return {
      profit: percentages.map(pct => ({
        percentage: pct,
        targetPrice: base * (1 + pct / 100),
      })),
      loss: percentages.map(pct => ({
        percentage: pct,
        targetPrice: base * (1 - pct / 100),
      })),
    }
  }, [basePrice])

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setBasePrice(value)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-6">
        <h2 className="text-xl font-bold text-zinc-100 mb-2">
          Percent Gap Calculator
        </h2>
        <p className="text-sm text-zinc-400">
          Pure mathematical sandbox to visualize price ranges and targets in 5% intervals
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 sm:p-6">
        <label className="block text-sm font-medium text-zinc-300 mb-3">
          Base Price (Entry)
        </label>
        <input
          type="text"
          value={basePrice}
          onChange={handleBasePriceChange}
          placeholder="Enter base price"
          className="w-full px-4 sm:px-6 py-3 sm:py-4 text-2xl sm:text-3xl font-bold text-zinc-100 bg-zinc-950 border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-zinc-600 tabular-nums"
        />
      </div>

      {/* Results Grid */}
      {tiers.profit.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit Targets Column */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden">
            <div className="bg-green-950/20 border-b border-green-900/30 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 sm:w-5 h-4 sm:h-5 text-green-400" />
                <h3 className="text-base sm:text-lg font-bold text-green-400">
                  Profit Targets
                </h3>
              </div>
            </div>
            <div className="divide-y divide-zinc-800/50 max-h-[500px] overflow-y-auto">
              {tiers.profit.map((tier) => (
                <div
                  key={tier.percentage}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between hover:bg-green-950/10 transition"
                >
                  <span className="text-xs sm:text-sm font-semibold text-green-400">
                    +{tier.percentage}%
                  </span>
                  <span className="text-base sm:text-lg font-bold text-zinc-100 tabular-nums">
                    ${tier.targetPrice.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Loss Thresholds Column */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl overflow-hidden">
            <div className="bg-red-950/20 border-b border-red-900/30 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 sm:w-5 h-4 sm:h-5 text-red-400" />
                <h3 className="text-base sm:text-lg font-bold text-red-400">
                  Loss Thresholds
                </h3>
              </div>
            </div>
            <div className="divide-y divide-zinc-800/50 max-h-[500px] overflow-y-auto">
              {tiers.loss.map((tier) => (
                <div
                  key={tier.percentage}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between hover:bg-red-950/10 transition"
                >
                  <span className="text-xs sm:text-sm font-semibold text-red-400">
                    -{tier.percentage}%
                  </span>
                  <span className="text-base sm:text-lg font-bold text-zinc-100 tabular-nums">
                    ${tier.targetPrice.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {tiers.profit.length === 0 && (
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">
            Enter a valid base price above to calculate profit and loss targets
          </p>
        </div>
      )}
    </div>
  )
}
