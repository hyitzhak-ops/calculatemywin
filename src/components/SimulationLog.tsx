import { History, Trash2, X } from 'lucide-react'
import { useDashboard } from '../context/DashboardContext'
import { Panel } from './ui/Panel'
import { formatUSD, formatPercent, formatDateTime, profitColorClass } from '../utils/format'

export function SimulationLog() {
  const { simulations, removeSimulation, clearAll } = useDashboard()

  if (simulations.length === 0) {
    return (
      <Panel
        title="Recent Simulations"
        subtitle="0 saved · persists in browser"
      >
        <div className="text-center py-8 text-zinc-500">
          <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            No simulations yet. Log one from Mode B.
          </p>
        </div>
      </Panel>
    )
  }

  return (
    <Panel
      title="Recent Simulations"
      subtitle={`${simulations.length} saved · persists in browser`}
      action={
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition"
        >
          <Trash2 className="w-3 h-3" />
          Clear all
        </button>
      }
    >
      <div className="space-y-2">
        {simulations.map((sim) => (
          <div
            key={sim.id}
            className="group flex items-start gap-3 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-zinc-100 mb-1">
                <span className="font-mono">{sim.symbol}</span>
                <span className="text-zinc-500 mx-2">·</span>
                <span className="text-zinc-400 font-mono text-xs tabular-nums">
                  {sim.shares} sh · {formatUSD(sim.buyPrice)} →{' '}
                  {formatUSD(sim.sellPrice)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-zinc-500">Profit: </span>
                  <span
                    className={`font-mono tabular-nums ${profitColorClass(
                      sim.expectedProfitUSD
                    )}`}
                  >
                    {formatUSD(sim.expectedProfitUSD)}
                  </span>
                </div>
                <div>
                  <span
                    className={`font-mono tabular-nums ${profitColorClass(
                      sim.expectedProfitPercent
                    )}`}
                  >
                    {formatPercent(sim.expectedProfitPercent)}
                  </span>
                </div>
                <div className="text-zinc-500">
                  {formatDateTime(sim.timestamp)}
                </div>
              </div>
            </div>
            <button
              onClick={() => removeSimulation(sim.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </Panel>
  )
}
