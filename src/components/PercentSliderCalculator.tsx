import { useMemo, useState } from 'react'
import { Percent } from 'lucide-react'

export function PercentSliderCalculator() {
  const [value, setValue] = useState<string>('100')
  const [percent, setPercent] = useState<number>(10)

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    if (next === '' || /^-?\d*\.?\d*$/.test(next)) {
      setValue(next)
    }
  }

  const result = useMemo(() => {
    const base = parseFloat(value)
    if (isNaN(base)) return null
    return base * (1 + percent / 100)
  }, [value, percent])

  const isPositive = percent > 0
  const isNegative = percent < 0
  const percentColor = isPositive
    ? 'text-green-400'
    : isNegative
    ? 'text-red-400'
    : 'text-zinc-400'
  const resultColor =
    result === null ? 'text-zinc-500' : isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-zinc-100'

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Percent className="w-4 h-4 sm:w-5 h-5 text-emerald-400" />
        <h3 className="text-base sm:text-lg font-bold text-zinc-100">Slider Calculator</h3>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Value</label>
        <input
          type="text"
          value={value}
          onChange={handleValueChange}
          placeholder="Enter a value"
          className="w-full px-4 py-3 text-xl sm:text-2xl font-bold text-zinc-100 bg-zinc-950 border-2 border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition placeholder:text-zinc-600 tabular-nums"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-zinc-300">Percent Change</label>
          <span className={`text-sm font-bold tabular-nums ${percentColor}`}>
            {percent > 0 ? '+' : ''}
            {percent}%
          </span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="percent-slider-calc"
          aria-label="Percent change slider"
        />
        <div className="mt-2 flex justify-between text-xs text-zinc-500">
          <span>-100%</span>
          <span>0%</span>
          <span>+100%</span>
        </div>
      </div>

      <div className="rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-4 text-center">
        <p className="text-xs text-zinc-500 mb-1">Result</p>
        <p className={`text-2xl sm:text-3xl font-bold tabular-nums ${resultColor}`}>
          {result === null ? '—' : result.toFixed(2)}
        </p>
      </div>
    </div>
  )
}
