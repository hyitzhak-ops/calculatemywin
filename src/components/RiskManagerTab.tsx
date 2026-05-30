import { useMemo, useState } from 'react'
import {
  Target,
  Plus,
  X,
  CheckCircle2,
  DollarSign,
  History,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { Panel } from './ui/Panel'
import { Field } from './ui/Field'
import { useDashboard } from '../context/DashboardContext'
import {
  formatUSD,
  formatPercent,
  profitColorClass,
  formatDateTime,
} from '../utils/format'
import type { ActiveTrade } from '../types'

const TARGET_TIERS = [0.05, 0.1, 0.15, 0.2] as const

export function RiskManagerTab() {
  const {
    activeTrades,
    todayCompleted,
    dailyProfit,
    goal,
    setGoal,
    addActiveTrade,
    removeActiveTrade,
    closeTrade,
    clearCompletedTrades,
  } = useDashboard()

  const goalReached = dailyProfit >= goal.min
  const goalProgress = goal.min > 0 ? Math.min(dailyProfit / goal.min, 2) : 0

  return (
    <div className="space-y-6">
      <DailySummaryCard
        dailyProfit={dailyProfit}
        goal={goal}
        setGoal={setGoal}
        goalReached={goalReached}
        goalProgress={goalProgress}
        completedCount={todayCompleted.length}
      />

      <AddTradeForm onAdd={addActiveTrade} />

      <Panel
        title={`Active Positions (${activeTrades.length})`}
        subtitle="Profit targets & stop-loss thresholds · 5% / 10% / 15% / 20%"
      >
        {activeTrades.length === 0 ? (
          <div className="text-sm text-zinc-500 py-6 text-center">
            No active positions. Add one above to see the target matrix.
          </div>
        ) : (
          <div className="space-y-4">
            {activeTrades.map((t) => (
              <ActiveTradeCard
                key={t.id}
                trade={t}
                onRemove={() => removeActiveTrade(t.id)}
                onClose={(sell) => closeTrade(t.id, sell)}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title={`Today's Closed Trades (${todayCompleted.length})`}
        subtitle="Realized P/L for the current calendar day"
        action={
          todayCompleted.length > 0 ? (
            <button
              onClick={clearCompletedTrades}
              className="text-xs text-zinc-500 hover:text-red-400 transition flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </button>
          ) : undefined
        }
      >
        {todayCompleted.length === 0 ? (
          <div className="text-sm text-zinc-500 py-6 text-center flex flex-col items-center gap-1">
            <History className="w-5 h-5 text-zinc-700" />
            No closed trades yet today.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                  <th className="text-left font-medium px-2 py-2">Symbol</th>
                  <th className="text-right font-medium px-2 py-2">Shares</th>
                  <th className="text-right font-medium px-2 py-2">Buy</th>
                  <th className="text-right font-medium px-2 py-2">Sell</th>
                  <th className="text-right font-medium px-2 py-2">Profit</th>
                  <th className="text-right font-medium px-2 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {todayCompleted.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-zinc-900 last:border-0"
                  >
                    <td className="px-2 py-2 font-medium text-zinc-200">
                      {c.symbol}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-zinc-300">
                      {c.shares}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-zinc-300">
                      {formatUSD(c.buyPrice)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono tabular-nums text-zinc-300">
                      {formatUSD(c.sellPrice)}
                    </td>
                    <td
                      className={`px-2 py-2 text-right font-mono tabular-nums ${profitColorClass(
                        c.profitUSD
                      )}`}
                    >
                      {formatUSD(c.profitUSD)}
                    </td>
                    <td className="px-2 py-2 text-right text-xs text-zinc-500">
                      {formatDateTime(c.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}

interface DailySummaryProps {
  dailyProfit: number
  goal: { min: number; max: number }
  setGoal: (g: { min: number; max: number }) => void
  goalReached: boolean
  goalProgress: number
  completedCount: number
}

function DailySummaryCard({
  dailyProfit,
  goal,
  setGoal,
  goalReached,
  goalProgress,
  completedCount,
}: DailySummaryProps) {
  const [editing, setEditing] = useState(false)
  const [minInput, setMinInput] = useState(goal.min.toString())
  const [maxInput, setMaxInput] = useState(goal.max.toString())

  const cardClass = goalReached
    ? 'rounded-lg border border-emerald-400/60 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-zinc-900 shadow-[0_0_30px_-5px_rgba(16,185,129,0.6)] ring-1 ring-emerald-400/40'
    : 'rounded-lg border border-zinc-800/80 bg-zinc-900/60'

  const handleSave = () => {
    const min = parseFloat(minInput)
    const max = parseFloat(maxInput)
    if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) {
      setGoal({ min, max })
      setEditing(false)
    }
  }

  return (
    <div className={`${cardClass} overflow-hidden transition-all`}>
      <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
              goalReached
                ? 'bg-emerald-500/30 border-emerald-300/60 text-emerald-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
              Today's Realized Profit
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Goal: {formatUSD(goal.min)} – {formatUSD(goal.max)} ·{' '}
              {completedCount} {completedCount === 1 ? 'trade' : 'trades'}{' '}
              closed
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setMinInput(goal.min.toString())
            setMaxInput(goal.max.toString())
            setEditing((v) => !v)
          }}
          className="text-xs text-zinc-400 hover:text-emerald-400 transition"
        >
          {editing ? 'Cancel' : 'Edit goal'}
        </button>
      </div>

      <div className="px-5 py-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className={`text-5xl font-mono tabular-nums font-semibold ${
              goalReached
                ? 'text-emerald-300'
                : profitColorClass(dailyProfit)
            }`}
          >
            {formatUSD(dailyProfit)}
          </span>
          {goal.min > 0 && (
            <span className="text-sm text-zinc-500 font-mono">
              {formatPercent((dailyProfit / goal.min) * 100)} of min
            </span>
          )}
          {goalReached && dailyProfit > goal.min && (
            <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded bg-emerald-400/15 border border-emerald-300/40 text-emerald-200">
              +{formatUSD(dailyProfit - goal.min)} over goal
            </span>
          )}
          {goal.max > 0 && dailyProfit > goal.max && (
            <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded bg-emerald-300/20 border border-emerald-200/50 text-emerald-100 font-semibold">
              well above max ({formatUSD(dailyProfit - goal.max)} over)
            </span>
          )}
        </div>

        <div className="mt-4 h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              goalReached
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-300'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
            }`}
            style={{
              width: `${Math.max(0, Math.min(goalProgress, 1)) * 100}%`,
            }}
          />
        </div>

        {goalReached && (
          <div className="mt-5 rounded-md border border-emerald-300/60 bg-emerald-500/10 px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-widest bg-emerald-400 text-zinc-950 px-2 py-0.5 rounded mb-1.5">
                Goal Achieved
              </div>
              <p className="text-base font-bold text-emerald-100 leading-snug">
                🎯 Goal Achieved! You made your profit for today. Turn off the
                computer, step away, and come back tomorrow. The mission is
                accomplished.
              </p>
              <p className="mt-2 text-xs text-emerald-200/80 leading-relaxed">
                This is a visual milestone, not a lock — every input, button,
                and trade action stays fully available. Your daily total keeps
                updating live with each new closed trade.
              </p>
            </div>
          </div>
        )}

        {!goalReached && dailyProfit < 0 && (
          <div className="mt-5 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">
              You're down today. Consider stepping away to avoid revenge
              trading.
            </p>
          </div>
        )}

        {editing && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
            <Field
              label="Goal Min"
              prefix="$"
              type="number"
              step="50"
              min="0"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
            />
            <Field
              label="Goal Max"
              prefix="$"
              type="number"
              step="50"
              min="0"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
            />
            <button
              onClick={handleSave}
              className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-medium px-4 py-2 transition"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface AddTradeFormProps {
  onAdd: (input: Omit<ActiveTrade, 'id' | 'timestamp'>) => ActiveTrade
}

function AddTradeForm({ onAdd }: AddTradeFormProps) {
  const [open, setOpen] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [shares, setShares] = useState('')
  const [buyPrice, setBuyPrice] = useState('')

  const reset = () => {
    setSymbol('')
    setShares('')
    setBuyPrice('')
  }

  const validShares = parseFloat(shares)
  const validBuy = parseFloat(buyPrice)
  const canSubmit =
    symbol.trim().length > 0 &&
    Number.isFinite(validShares) &&
    validShares > 0 &&
    Number.isFinite(validBuy) &&
    validBuy > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onAdd({
      symbol: symbol.trim().toUpperCase(),
      shares: validShares,
      buyPrice: validBuy,
    })
    reset()
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-zinc-400 hover:text-emerald-300 px-4 py-4 text-sm font-medium transition"
      >
        <Plus className="w-4 h-4" />
        Add Position
      </button>
    )
  }

  return (
    <Panel
      title="New Active Trade"
      subtitle="Open a position you'll track to a target"
      action={
        <button
          onClick={() => {
            reset()
            setOpen(false)
          }}
          className="text-zinc-500 hover:text-zinc-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field
          label="Symbol"
          placeholder="AAPL"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        />
        <Field
          label="Number of Shares"
          type="number"
          step="1"
          min="0"
          placeholder="0"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
        />
        <Field
          label="Buy Price"
          prefix="$"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 text-sm font-medium px-4 py-2 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Open Position
        </button>
      </div>
    </Panel>
  )
}

interface ActiveTradeCardProps {
  trade: ActiveTrade
  onRemove: () => void
  onClose: (sellPrice: number) => unknown
}

function ActiveTradeCard({ trade, onRemove, onClose }: ActiveTradeCardProps) {
  const [closing, setClosing] = useState(false)
  const [sellInput, setSellInput] = useState('')

  const profitTiers = useMemo(
    () =>
      TARGET_TIERS.map((pct) => {
        const targetPrice = trade.buyPrice * (1 + pct)
        const totalValue = trade.shares * targetPrice
        const netProfit = (targetPrice - trade.buyPrice) * trade.shares
        return { pct, targetPrice, totalValue, netProfit }
      }),
    [trade.buyPrice, trade.shares]
  )

  const lossTiers = useMemo(
    () =>
      TARGET_TIERS.map((pct) => {
        const stopPrice = trade.buyPrice * (1 - pct)
        const totalValue = trade.shares * stopPrice
        const netLoss = (trade.buyPrice - stopPrice) * trade.shares
        return { pct, stopPrice, totalValue, netLoss }
      }),
    [trade.buyPrice, trade.shares]
  )

  const cost = trade.buyPrice * trade.shares

  const liveSell = parseFloat(sellInput)
  const livePreview = Number.isFinite(liveSell)
    ? (liveSell - trade.buyPrice) * trade.shares
    : null

  const handleConfirm = () => {
    if (!Number.isFinite(liveSell) || liveSell <= 0) return
    onClose(liveSell)
    setSellInput('')
    setClosing(false)
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-sm font-semibold text-emerald-300">
            {trade.symbol.slice(0, 4)}
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">
              {trade.symbol}
            </div>
            <div className="text-xs text-zinc-500 font-mono">
              {trade.shares} sh @ {formatUSD(trade.buyPrice)} ·{' '}
              {formatUSD(cost)} cost
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!closing && (
            <button
              onClick={() => setClosing(true)}
              className="text-xs rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 font-medium transition flex items-center gap-1"
            >
              <DollarSign className="w-3.5 h-3.5" />
              Report Sale
            </button>
          )}
          <button
            onClick={onRemove}
            title="Discard position (without recording a sale)"
            className="text-zinc-600 hover:text-red-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-md border border-emerald-500/20 bg-emerald-950/10 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                Profit Targets
              </span>
              <span className="text-[10px] text-zinc-500">· Take Profit</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {profitTiers.map((tier) => (
                <div
                  key={tier.pct}
                  className="rounded-md border border-emerald-500/20 bg-emerald-950/20 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      +{(tier.pct * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {formatPercent(tier.pct * 100)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-base font-mono tabular-nums text-emerald-200">
                    {formatUSD(tier.targetPrice)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-500/15 space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Total</span>
                      <span className="font-mono tabular-nums text-zinc-300">
                        {formatUSD(tier.totalValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Profit</span>
                      <span className="font-mono tabular-nums text-emerald-400">
                        +{formatUSD(tier.netProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-red-500/20 bg-red-950/10 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] uppercase tracking-wider text-red-400 font-bold">
                Stop-Loss Thresholds
              </span>
              <span className="text-[10px] text-zinc-500">· Cut Losses</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {lossTiers.map((tier) => (
                <div
                  key={tier.pct}
                  className="rounded-md border border-red-500/20 bg-red-950/20 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                      −{(tier.pct * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-red-400 font-mono">
                      −{formatPercent(tier.pct * 100)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-base font-mono tabular-nums text-red-200">
                    {formatUSD(tier.stopPrice)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-red-500/15 space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Total</span>
                      <span className="font-mono tabular-nums text-zinc-300">
                        {formatUSD(tier.totalValue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Loss</span>
                      <span className="font-mono tabular-nums text-red-400">
                        −{formatUSD(tier.netLoss)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {closing && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
              <Field
                label="Actual Sell Price"
                prefix="$"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={sellInput}
                onChange={(e) => setSellInput(e.target.value)}
                autoFocus
              />
              <button
                onClick={handleConfirm}
                disabled={!Number.isFinite(liveSell) || liveSell <= 0}
                className="rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 text-sm font-medium px-4 py-2 transition"
              >
                Confirm Sale
              </button>
              <button
                onClick={() => {
                  setSellInput('')
                  setClosing(false)
                }}
                className="rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-sm px-3 py-2 transition"
              >
                Cancel
              </button>
            </div>
            {livePreview !== null && (
              <div className="mt-2 text-xs text-zinc-400 flex items-center gap-2">
                <span>Realized P/L preview:</span>
                <span
                  className={`font-mono tabular-nums font-semibold ${profitColorClass(
                    livePreview
                  )}`}
                >
                  {formatUSD(livePreview)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
