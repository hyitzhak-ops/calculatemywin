import { useMemo, useState } from 'react'
import { Calculator, Bookmark, TrendingUp } from 'lucide-react'
import { Panel } from './ui/Panel'
import { Field } from './ui/Field'
import { useDashboard } from '../context/DashboardContext'
import { calcPosition } from '../utils/calculations'
import { formatUSD, formatPercent, profitColorClass } from '../utils/format'

export function PositionCalculator() {
  const { activeTicker, addSimulation } = useDashboard()

  const [sharesInput, setSharesInput] = useState('')
  const [buyInput, setBuyInput] = useState('')
  const [sellInput, setSellInput] = useState('')
  const [savedMessage, setSavedMessage] = useState(false)

  const result = useMemo(() => {
    const shares = parseFloat(sharesInput)
    const buy = parseFloat(buyInput)
    const sell = parseFloat(sellInput)

    return calcPosition(shares, buy, sell)
  }, [sharesInput, buyInput, sellInput])

  const handleUseLivePrice = () => {
    if (activeTicker?.quote) {
      setBuyInput(activeTicker.quote.price.toString())
    }
  }

  const handleLogSimulation = () => {
    if (!result || !activeTicker?.symbol) return

    addSimulation({
      symbol: activeTicker.symbol,
      shares: parseFloat(sharesInput),
      buyPrice: parseFloat(buyInput),
      sellPrice: parseFloat(sellInput),
      expectedProfitUSD: result.profitUSD,
      expectedProfitPercent: result.profitPercent,
    })

    setSavedMessage(true)
    setTimeout(() => setSavedMessage(false), 2000)
  }

  return (
    <Panel
      title={
        activeTicker?.symbol
          ? `Mode B — ${activeTicker.symbol} Position`
          : 'Mode B — Position Calculator'
      }
      subtitle="Calculate profit/loss for a position"
      action={
        <button
          onClick={handleUseLivePrice}
          disabled={!activeTicker?.quote}
          className="text-xs text-emerald-400 hover:text-emerald-300 disabled:text-zinc-600 disabled:cursor-not-allowed transition flex items-center gap-1"
        >
          <TrendingUp className="w-3 h-3" />
          Use live price
        </button>
      }
    >
      <div className="space-y-4">
        <Field
          label="Number of Shares"
          type="number"
          step="1"
          min="0"
          placeholder="0"
          value={sharesInput}
          onChange={(e) => setSharesInput(e.target.value)}
        />
        <Field
          label="Average Buy Price"
          prefix="$"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={buyInput}
          onChange={(e) => setBuyInput(e.target.value)}
        />
        <Field
          label="Target Sell Price"
          prefix="$"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={sellInput}
          onChange={(e) => setSellInput(e.target.value)}
        />

        {result && (
          <div className="pt-4 border-t border-zinc-800 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-zinc-800/50 p-3">
                <div className="text-xs text-zinc-400 mb-1">
                  Total Investment
                </div>
                <div className="text-xl font-mono tabular-nums text-zinc-100">
                  {formatUSD(result.investment)}
                </div>
              </div>
              <div className="rounded-lg bg-zinc-800/50 p-3">
                <div className="text-xs text-zinc-400 mb-1">Profit / Loss</div>
                <div
                  className={`text-xl font-mono tabular-nums ${profitColorClass(
                    result.profitUSD
                  )}`}
                >
                  {formatUSD(result.profitUSD)}
                </div>
                <div
                  className={`text-xs font-mono tabular-nums mt-1 ${profitColorClass(
                    result.profitPercent
                  )}`}
                >
                  {formatPercent(result.profitPercent)}
                </div>
                <div className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-700/50">
                  Total: {formatUSD(result.investment + result.profitUSD)}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogSimulation}
              disabled={!activeTicker?.symbol || savedMessage}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Bookmark className="w-4 h-4" />
              {savedMessage ? 'Saved to log' : 'Log simulation'}
            </button>
          </div>
        )}

        {!result && sharesInput && buyInput && sellInput && (
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Calculator className="w-4 h-4" />
              <span>Enter valid values to calculate</span>
            </div>
          </div>
        )}
      </div>
    </Panel>
  )
}
