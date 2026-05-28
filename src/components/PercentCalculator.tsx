import { useMemo, useState } from 'react'
import { Panel } from './ui/Panel'
import { Field } from './ui/Field'
import { calcPercentGain, parsePositiveNumber } from '../utils/calculations'
import { formatPercent, profitColorClass } from '../utils/format'
import { Percent } from 'lucide-react'

export function PercentCalculator() {
  const [buyInput, setBuyInput] = useState('')
  const [sellInput, setSellInput] = useState('')

  const result = useMemo(() => {
    const buy = parsePositiveNumber(buyInput)
    const sell = parsePositiveNumber(sellInput)

    if (buy === null && sell === null) {
      return { display: '—', valid: false }
    }

    if (buy === null || buy <= 0) {
      return { display: 'Enter valid buy price > 0', valid: false }
    }

    if (sell === null) {
      return { display: '—', valid: false }
    }

    const gain = calcPercentGain(buy, sell)
    if (gain === null) {
      return { display: 'Invalid', valid: false }
    }

    return {
      display: formatPercent(gain),
      valid: true,
      value: gain,
    }
  }, [buyInput, sellInput])

  return (
    <Panel
      title="Mode A — Percentage Calculator"
      subtitle="Calculate expected return percentage"
    >
      <div className="space-y-4">
        <Field
          label="Buy Price"
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

        <div className="pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-400">
              Expected Return
            </span>
          </div>
          <div
            className={`
              text-3xl font-mono tabular-nums font-semibold
              ${result.valid && result.value !== undefined ? profitColorClass(result.value) : 'text-zinc-400'}
            `}
          >
            {result.display}
          </div>
        </div>
      </div>
    </Panel>
  )
}
