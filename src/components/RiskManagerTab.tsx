import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Target,
  Plus,
  X,
  CheckCircle2,
  DollarSign,
  History,
  AlertTriangle,
  Trash2,
  Calculator,
  ShieldAlert,
  Crosshair,
  Activity,
  ShieldCheck,
  Siren,
  CalendarClock,
  Loader2,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Zap,
  ChevronDown,
  ChevronUp,
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
import type { ActiveTrade, TradeCatalyst } from '../types'
import { TRADE_CATALYSTS } from '../types'
import {
  scanCorporateRisk,
  type CorporateTimelineEvent,
  type DnaEventKind,
  type EarningsHealth,
  type EarningsHealthData,
  type RiskFlag,
  type RiskScanResult,
  type RiskSeverity,
} from '../services/riskScannerService'

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
                onClose={(sell, catalyst) => closeTrade(t.id, sell, catalyst)}
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
  const [buyPrice, setBuyPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [maxRisk, setMaxRisk] = useState('')
  const [shares, setShares] = useState('')
  const [sharesManuallyEdited, setSharesManuallyEdited] = useState(false)

  const reset = () => {
    setSymbol('')
    setBuyPrice('')
    setStopLoss('')
    setMaxRisk('')
    setShares('')
    setSharesManuallyEdited(false)
  }

  const buyNum = parseFloat(buyPrice)
  const stopNum = parseFloat(stopLoss)
  const riskNum = parseFloat(maxRisk)
  const sharesNum = parseFloat(shares)

  const buyValid = Number.isFinite(buyNum) && buyNum > 0
  const stopValid = Number.isFinite(stopNum) && stopNum > 0
  const riskValid = Number.isFinite(riskNum) && riskNum > 0

  const stopBelowBuy = buyValid && stopValid && stopNum < buyNum
  const stopInvalidForLong = buyValid && stopValid && !stopBelowBuy

  // The "perfect" share count derived from risk budget. We re-derive every
  // render — the form just exposes it; the user can still override.
  const recommendedShares = useMemo(() => {
    if (!buyValid || !stopValid || !riskValid) return null
    if (!stopBelowBuy) return null
    const perShareRisk = buyNum - stopNum
    if (perShareRisk <= 0) return null
    return Math.floor(riskNum / perShareRisk)
  }, [buyValid, stopValid, riskValid, stopBelowBuy, buyNum, stopNum, riskNum])

  // Auto-populate the shares field from the recommendation, but never
  // overwrite a value the user typed manually.
  useEffect(() => {
    if (sharesManuallyEdited) return
    if (recommendedShares == null) return
    setShares(recommendedShares.toString())
  }, [recommendedShares, sharesManuallyEdited])

  const handleSharesChange = (val: string) => {
    setShares(val)
    setSharesManuallyEdited(true)
  }

  const handleResetShares = () => {
    setSharesManuallyEdited(false)
    if (recommendedShares != null) {
      setShares(recommendedShares.toString())
    } else {
      setShares('')
    }
  }

  // When the user clicks "Use this" on a scenario tier, write the price into
  // the Stop-Loss field with two-decimal precision. Re-enable share auto-fill
  // so the recommendation refreshes from the new tier instantly.
  const handleApplyScenarioStop = (scenarioPrice: number) => {
    setStopLoss(scenarioPrice.toFixed(2))
    setSharesManuallyEdited(false)
  }

  const totalCapital =
    Number.isFinite(sharesNum) && sharesNum > 0 && buyValid
      ? sharesNum * buyNum
      : null

  const realizedRiskAtStop =
    Number.isFinite(sharesNum) &&
    sharesNum > 0 &&
    buyValid &&
    stopValid &&
    stopBelowBuy
      ? (buyNum - stopNum) * sharesNum
      : null

  const canSubmit =
    symbol.trim().length > 0 &&
    buyValid &&
    Number.isFinite(sharesNum) &&
    sharesNum > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onAdd({
      symbol: symbol.trim().toUpperCase(),
      shares: sharesNum,
      buyPrice: buyNum,
      ...(stopValid && stopBelowBuy ? { stopLoss: stopNum } : {}),
      ...(riskValid ? { riskBudget: riskNum } : {}),
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
      title="New Active Trade · Risk-Based Sizing"
      subtitle="Enter your stop-loss and max account risk — share count is auto-calculated"
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
      <CorporateRiskAssessment symbol={symbol.trim()} />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mt-4">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Symbol"
              placeholder="AAPL"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
            <Field
              label="Buy Price (Entry)"
              prefix="$"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
            />
            <div>
              <Field
                label="Stop-Loss Price"
                prefix="$"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
              />
              {stopInvalidForLong && (
                <p className="mt-1 text-[11px] text-red-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Stop-loss must be below buy price
                </p>
              )}
            </div>
            <Field
              label="Max Account Risk"
              prefix="$"
              type="number"
              step="10"
              min="0"
              placeholder="150"
              value={maxRisk}
              onChange={(e) => setMaxRisk(e.target.value)}
            />
          </div>

          <StopLossScenarioMatrix
            symbol={symbol.trim()}
            buyPrice={buyValid ? buyNum : null}
            maxRisk={riskValid ? riskNum : null}
            currentStopLoss={stopValid && stopBelowBuy ? stopNum : null}
            onApply={handleApplyScenarioStop}
          />

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-medium text-zinc-400">
                Number of Shares
              </label>
              {sharesManuallyEdited && recommendedShares != null && (
                <button
                  type="button"
                  onClick={handleResetShares}
                  className="text-[11px] text-zinc-500 hover:text-emerald-300 transition"
                >
                  Reset to recommended ({recommendedShares})
                </button>
              )}
            </div>
            <input
              type="number"
              step="1"
              min="0"
              placeholder={
                recommendedShares != null
                  ? `Recommended ${recommendedShares}`
                  : '0'
              }
              value={shares}
              onChange={(e) => handleSharesChange(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 font-mono tabular-nums placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Auto-filled from risk math. You can override — we'll keep your
              value.
            </p>
          </div>
        </div>

        <RiskSizingPanel
          recommendedShares={recommendedShares}
          totalCapital={totalCapital}
          realizedRiskAtStop={realizedRiskAtStop}
          maxRisk={riskValid ? riskNum : null}
          buyPrice={buyValid ? buyNum : null}
          stopLoss={stopValid && stopBelowBuy ? stopNum : null}
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

interface RiskSizingPanelProps {
  recommendedShares: number | null
  totalCapital: number | null
  realizedRiskAtStop: number | null
  maxRisk: number | null
  buyPrice: number | null
  stopLoss: number | null
}

function RiskSizingPanel({
  recommendedShares,
  totalCapital,
  realizedRiskAtStop,
  maxRisk,
  buyPrice,
  stopLoss,
}: RiskSizingPanelProps) {
  const ready = recommendedShares != null && totalCapital != null

  const perShareRisk =
    buyPrice != null && stopLoss != null ? buyPrice - stopLoss : null

  // Show the "buffer" between budgeted risk and the risk you'd actually take
  // after rounding shares down — usually a few dollars under budget.
  const riskBuffer =
    maxRisk != null && realizedRiskAtStop != null
      ? maxRisk - realizedRiskAtStop
      : null

  return (
    <div className="rounded-md border border-emerald-500/25 bg-emerald-500/5 p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-emerald-300" />
        <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-200">
          Recommended Position Size
        </span>
      </div>

      {!ready ? (
        <div className="flex items-start gap-2 text-xs text-zinc-400">
          <ShieldAlert className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
          <p className="leading-snug">
            Enter <span className="text-zinc-200">Buy Price</span>,{' '}
            <span className="text-zinc-200">Stop-Loss</span>, and{' '}
            <span className="text-zinc-200">Max Account Risk</span> to see the
            scientifically correct share count.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
              Shares
            </div>
            <div className="text-3xl font-mono tabular-nums font-bold text-emerald-200 leading-tight">
              {recommendedShares}
            </div>
            {perShareRisk != null && (
              <div className="mt-0.5 text-[11px] text-emerald-200/70 font-mono tabular-nums">
                Risk per share: {formatUSD(perShareRisk)}
              </div>
            )}
          </div>

          <div className="rounded-md border border-zinc-700 bg-zinc-950/60 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Total Capital Required
            </div>
            <div className="text-xl font-mono tabular-nums text-zinc-100">
              {formatUSD(totalCapital!)}
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500 font-mono tabular-nums">
              {recommendedShares} sh × {formatUSD(buyPrice!)}
            </div>
          </div>

          {realizedRiskAtStop != null && (
            <div className="text-[11px] text-zinc-400 leading-snug">
              <div className="flex items-center justify-between gap-2 font-mono tabular-nums">
                <span>If stop hits:</span>
                <span className="text-red-300 font-semibold">
                  −{formatUSD(realizedRiskAtStop)}
                </span>
              </div>
              {riskBuffer != null && riskBuffer >= 0 && (
                <div className="flex items-center justify-between gap-2 font-mono tabular-nums text-zinc-500">
                  <span>Under budget by:</span>
                  <span>{formatUSD(riskBuffer)}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface StopLossScenarioMatrixProps {
  symbol: string
  buyPrice: number | null
  maxRisk: number | null
  currentStopLoss: number | null
  onApply: (scenarioStopPrice: number) => void
}

const SCENARIO_TIERS = [0.05, 0.1, 0.15, 0.2] as const

interface ScenarioRow {
  pct: number
  stopPrice: number
  riskPerShare: number
  recommendedShares: number | null
  capitalRequired: number | null
  matchesCurrent: boolean
}

function StopLossScenarioMatrix({
  symbol,
  buyPrice,
  maxRisk,
  currentStopLoss,
  onApply,
}: StopLossScenarioMatrixProps) {
  // Show only when the user has typed both Symbol and a usable Buy Price.
  // (Stop-loss tiers are meaningless without an entry anchor.)
  const ready = symbol.length > 0 && buyPrice != null && buyPrice > 0

  const rows = useMemo<ScenarioRow[]>(() => {
    if (!ready || buyPrice == null) return []
    return SCENARIO_TIERS.map((pct) => {
      const stopPrice = buyPrice * (1 - pct)
      const riskPerShare = buyPrice - stopPrice
      const recommendedShares =
        maxRisk != null && maxRisk > 0 && riskPerShare > 0
          ? Math.floor(maxRisk / riskPerShare)
          : null
      const capitalRequired =
        recommendedShares != null ? recommendedShares * buyPrice : null
      // "Match" means the user's current stop is within 1¢ of this tier — used
      // to highlight which scenario is currently armed.
      const matchesCurrent =
        currentStopLoss != null &&
        Math.abs(currentStopLoss - stopPrice) < 0.005
      return {
        pct,
        stopPrice,
        riskPerShare,
        recommendedShares,
        capitalRequired,
        matchesCurrent,
      }
    })
  }, [ready, buyPrice, maxRisk, currentStopLoss])

  if (!ready) {
    return (
      <div className="rounded-md border border-dashed border-zinc-800 bg-slate-950/30 px-4 py-3 text-[11px] text-zinc-500 flex items-center gap-2">
        <Crosshair className="w-3.5 h-3.5 text-zinc-600" />
        Enter <span className="text-zinc-400">Symbol</span> &{' '}
        <span className="text-zinc-400">Buy Price</span> to preview stop-loss
        scenarios.
      </div>
    )
  }

  const showSharesCol = maxRisk != null && maxRisk > 0

  return (
    <div className="rounded-md border border-zinc-800 bg-slate-950/40 overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800/80 flex items-center gap-2 bg-slate-900/40">
        <Crosshair className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-300">
          Stop-Loss Scenario Matrix
        </span>
        <span className="text-[10px] text-slate-500 font-normal normal-case">
          · planning preview · click{' '}
          <span className="text-emerald-400/80">Use this</span> to arm a tier
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-zinc-800/60">
              <th className="text-left font-semibold px-3 py-1.5">Drop</th>
              <th className="text-right font-semibold px-3 py-1.5">
                Stop Price
              </th>
              <th className="text-right font-semibold px-3 py-1.5">$/share</th>
              {showSharesCol && (
                <>
                  <th className="text-right font-semibold px-3 py-1.5">
                    Shares
                  </th>
                  <th className="text-right font-semibold px-3 py-1.5">
                    Capital
                  </th>
                </>
              )}
              <th className="px-3 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.pct}
                className={`border-b border-zinc-900 last:border-0 transition ${
                  r.matchesCurrent
                    ? 'bg-emerald-500/5'
                    : 'hover:bg-zinc-900/40'
                }`}
              >
                <td className="px-3 py-1.5">
                  <span
                    className={`font-mono tabular-nums ${
                      r.matchesCurrent
                        ? 'text-emerald-300 font-semibold'
                        : 'text-slate-300'
                    }`}
                  >
                    −{(r.pct * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-200">
                  {formatUSD(r.stopPrice)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-400">
                  {formatUSD(r.riskPerShare)}
                </td>
                {showSharesCol && (
                  <>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-200">
                      {r.recommendedShares ?? '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono tabular-nums text-slate-400">
                      {r.capitalRequired != null
                        ? formatUSD(r.capitalRequired)
                        : '—'}
                    </td>
                  </>
                )}
                <td className="px-3 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => onApply(r.stopPrice)}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded border transition ${
                      r.matchesCurrent
                        ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200'
                        : 'border-zinc-700 bg-zinc-900/60 text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300'
                    }`}
                  >
                    {r.matchesCurrent ? 'Armed' : 'Use this'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showSharesCol && (
        <div className="px-3 py-1.5 text-[10px] text-slate-500 bg-slate-950/60 border-t border-zinc-800/60">
          Add a <span className="text-slate-300">Max Account Risk</span> value
          to see recommended shares and capital required for each tier.
        </div>
      )}
    </div>
  )
}

interface ActiveTradeCardProps {
  trade: ActiveTrade
  onRemove: () => void
  onClose: (sellPrice: number, catalyst?: TradeCatalyst) => unknown
}

function ActiveTradeCard({ trade, onRemove, onClose }: ActiveTradeCardProps) {
  const [closing, setClosing] = useState(false)
  const [sellInput, setSellInput] = useState('')
  const [catalyst, setCatalyst] = useState<TradeCatalyst | ''>('')

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
    onClose(liveSell, catalyst || undefined)
    setSellInput('')
    setCatalyst('')
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
            {trade.stopLoss !== undefined && (
              <div className="text-[11px] text-red-300/80 font-mono mt-0.5 flex items-center gap-1.5">
                <ShieldAlert className="w-3 h-3" />
                Planned stop {formatUSD(trade.stopLoss)} · risk{' '}
                {formatUSD((trade.buyPrice - trade.stopLoss) * trade.shares)}
              </div>
            )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
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
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Trade Strategy / Catalyst{' '}
                  <span className="text-zinc-600">(optional)</span>
                </label>
                <select
                  value={catalyst}
                  onChange={(e) =>
                    setCatalyst(e.target.value as TradeCatalyst | '')
                  }
                  className="w-full rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                >
                  <option value="">— Untagged —</option>
                  {TRADE_CATALYSTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setSellInput('')
                  setCatalyst('')
                  setClosing(false)
                }}
                className="rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-sm px-3 py-2 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!Number.isFinite(liveSell) || liveSell <= 0}
                className="rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 text-sm font-medium px-4 py-2 transition"
              >
                Confirm Sale
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

// ---------------------------------------------------------------------------
// Corporate Risk Assessment — fundamental scanner panel (v2)
// 1-Year DNA Profiling + Earnings Health Analysis
// ---------------------------------------------------------------------------

const SCAN_DEBOUNCE_MS = 600

interface CorporateRiskAssessmentProps {
  symbol: string
}

function CorporateRiskAssessment({ symbol }: CorporateRiskAssessmentProps) {
  const [scan, setScan] = useState<RiskScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()

    const trimmed = symbol.trim().toUpperCase()
    if (trimmed.length < 1) {
      setScan(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    const handle = window.setTimeout(async () => {
      try {
        const result = await scanCorporateRisk(trimmed, controller.signal)
        if (controller.signal.aborted) return
        setScan(result)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Scan failed')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, SCAN_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(handle)
      controller.abort()
    }
  }, [symbol])

  if (!symbol) {
    return (
      <div className="rounded-md border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-3 text-[11px] text-zinc-500 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-zinc-600" />
        Enter a <span className="text-zinc-300">Symbol</span> to run the
        1-Year Corporate DNA Scan (dilution · reverse splits · earnings health).
      </div>
    )
  }

  if (loading && !scan) {
    return <RiskScanSkeleton symbol={symbol} />
  }

  if (error && !scan) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-300" />
        Risk scan failed: {error}. Position controls remain available.
      </div>
    )
  }

  if (!scan) return null

  return <RiskScanResultPanel scan={scan} refreshing={loading} />
}

function RiskScanSkeleton({ symbol }: { symbol: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300">
          Scanning {symbol} · 1-Year Corporate DNA Profile
        </span>
      </div>
      {/* Score row skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-md bg-zinc-800/60" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-zinc-800/60" />
          <div className="h-5 w-1/4 rounded bg-zinc-800/60" />
          <div className="h-3 w-2/3 rounded bg-zinc-800/60" />
        </div>
      </div>
      {/* Meter skeleton */}
      <div className="h-1.5 rounded-full bg-zinc-800/60" />
      {/* DNA section skeleton */}
      <div className="h-px bg-zinc-800/60" />
      <div className="space-y-2">
        <div className="h-3 w-1/4 rounded bg-zinc-800/60" />
        <div className="h-8 rounded bg-zinc-800/40" />
        <div className="h-8 rounded bg-zinc-800/40" />
      </div>
      {/* Earnings section skeleton */}
      <div className="h-px bg-zinc-800/60" />
      <div className="space-y-2">
        <div className="h-3 w-1/4 rounded bg-zinc-800/60" />
        <div className="h-16 rounded bg-zinc-800/40" />
      </div>
    </div>
  )
}

// ─── Severity theme map ─────────────────────────────────────────────────────

interface SeverityTheme {
  border: string
  bg: string
  badgeBg: string
  badgeText: string
  badgeLabel: string
  scoreText: string
  ring: string
  icon: typeof ShieldCheck
  iconBg: string
  iconColor: string
}

const SEVERITY_THEMES: Record<RiskSeverity, SeverityTheme> = {
  low: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/5',
    badgeBg: 'bg-emerald-500/15 border-emerald-400/40',
    badgeText: 'text-emerald-200',
    badgeLabel: 'CLEAN — LOW RISK',
    scoreText: 'text-emerald-300',
    ring: 'ring-1 ring-emerald-500/30',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-500/15 border-emerald-400/40',
    iconColor: 'text-emerald-300',
  },
  medium: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    badgeBg: 'bg-amber-500/15 border-amber-400/40',
    badgeText: 'text-amber-200',
    badgeLabel: 'MEDIUM RISK',
    scoreText: 'text-amber-300',
    ring: 'ring-1 ring-amber-500/30',
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/15 border-amber-400/40',
    iconColor: 'text-amber-300',
  },
  high: {
    border: 'border-orange-500/50',
    bg: 'bg-orange-500/5',
    badgeBg: 'bg-orange-500/20 border-orange-400/60',
    badgeText: 'text-orange-100',
    badgeLabel: 'HIGH RISK',
    scoreText: 'text-orange-300',
    ring: 'ring-1 ring-orange-500/40',
    icon: Siren,
    iconBg: 'bg-orange-500/20 border-orange-400/60',
    iconColor: 'text-orange-200',
  },
  toxic: {
    border: 'border-red-500/70',
    bg: 'bg-red-500/10',
    badgeBg: 'bg-red-500/30 border-red-400/80',
    badgeText: 'text-red-50',
    badgeLabel: '⚠️ TOXIC CAPITAL STRUCTURE DETECTED',
    scoreText: 'text-red-300',
    ring: 'ring-2 ring-red-500/60',
    icon: Siren,
    iconBg: 'bg-red-500/30 border-red-400/80',
    iconColor: 'text-red-100',
  },
}

// ─── Flag maps ───────────────────────────────────────────────────────────────

const FLAG_ICONS: Record<RiskFlag['kind'], typeof ShieldAlert> = {
  dilution: DollarSign,
  'serial-diluter': Building2,
  'reverse-split-recent': Zap,
  'reverse-split-upcoming': Zap,
  'earnings-imminent': CalendarClock,
  'earnings-upcoming': CalendarClock,
  'earnings-recent': CalendarClock,
}

const FLAG_TONES: Record<RiskFlag['kind'], string> = {
  dilution: 'border-red-500/40 bg-red-500/5 text-red-100',
  'serial-diluter': 'border-red-600/60 bg-red-600/10 text-red-50',
  'reverse-split-recent': 'border-red-500/40 bg-red-500/5 text-red-100',
  'reverse-split-upcoming': 'border-red-500/40 bg-red-500/5 text-red-100',
  'earnings-imminent': 'border-amber-500/40 bg-amber-500/5 text-amber-100',
  'earnings-upcoming': 'border-amber-400/30 bg-amber-400/5 text-amber-200',
  'earnings-recent': 'border-zinc-700 bg-zinc-900/60 text-zinc-200',
}

// ─── DNA event kind display map ──────────────────────────────────────────────

const DNA_KIND_STYLES: Record<
  DnaEventKind,
  { dot: string; badge: string; label: string }
> = {
  offering: {
    dot: 'bg-red-400',
    badge: 'bg-red-500/15 border-red-400/40 text-red-200',
    label: 'Offering',
  },
  atm: {
    dot: 'bg-orange-400',
    badge: 'bg-orange-500/15 border-orange-400/40 text-orange-200',
    label: 'ATM',
  },
  convertible: {
    dot: 'bg-rose-400',
    badge: 'bg-rose-500/15 border-rose-400/40 text-rose-200',
    label: 'Convertible',
  },
  'private-placement': {
    dot: 'bg-pink-400',
    badge: 'bg-pink-500/15 border-pink-400/40 text-pink-200',
    label: 'PIPE',
  },
  'reverse-split': {
    dot: 'bg-purple-400',
    badge: 'bg-purple-500/15 border-purple-400/40 text-purple-200',
    label: 'Rev. Split',
  },
}

// ─── Main result panel ───────────────────────────────────────────────────────

function RiskScanResultPanel({
  scan,
  refreshing,
}: {
  scan: RiskScanResult
  refreshing: boolean
}) {
  const theme = SEVERITY_THEMES[scan.severity]
  const Icon = theme.icon

  const wrapperClass = [
    'rounded-md border transition-all',
    theme.border,
    theme.bg,
    theme.ring,
    scan.severity === 'toxic' ? 'animate-toxic-pulse' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClass}>
      {/* ── Header: score + badge + summary ── */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-12 h-12 rounded-md flex-shrink-0 flex items-center justify-center border ${theme.iconBg}`}
          >
            <Icon className={`w-6 h-6 ${theme.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300">
                Corporate Risk Assessment · {scan.symbol}
              </span>
              {refreshing && (
                <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />
              )}
              {scan.partial && (
                <span className="text-[10px] text-zinc-500 italic">
                  · partial scan
                </span>
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-3 flex-wrap">
              <span
                className={`text-3xl font-mono tabular-nums font-bold leading-none ${theme.scoreText}`}
              >
                {scan.score}
                <span className="text-base text-zinc-500 font-normal">/10</span>
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${theme.badgeBg} ${theme.badgeText}`}
              >
                {theme.badgeLabel}
              </span>
              {scan.serialDiluter && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-red-600/20 border-red-500/60 text-red-200">
                  Serial Diluter
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-snug text-zinc-200">
              {scan.summary}
            </p>
          </div>
        </div>

        <ScoreMeter score={scan.score} severity={scan.severity} />

        {/* Active flags */}
        {scan.flags.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            {scan.flags.map((flag, i) => (
              <RiskFlagRow key={`${flag.kind}-${i}`} flag={flag} />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-200 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            No active corporate-action risks detected in the 1-year lookback.
          </div>
        )}
      </div>

      {/* ── Section divider ── */}
      <div className="border-t border-zinc-800/60" />

      {/* ── 1-Year Corporate DNA Profile ── */}
      <CorporateDnaSection dna={scan.corporateDna} dilutionCount={scan.dilutionCount} serialDiluter={scan.serialDiluter} />

      {/* ── Section divider ── */}
      <div className="border-t border-zinc-800/60" />

      {/* ── Earnings & Financial Health ── */}
      <EarningsHealthSection health={scan.earningsHealth} />

      {/* ── Footer ── */}
      <div className="px-4 pb-3 pt-2">
        <p className="text-[10px] text-zinc-500 italic leading-snug">
          Advisory only — execution remains in your control. Flags do not block order entry.
          Sources: Finnhub company news (1yr), splits calendar (−1yr / +7d), earnings calendar (−30d / +120d).
        </p>
      </div>
    </div>
  )
}

// ─── Score meter ─────────────────────────────────────────────────────────────

function ScoreMeter({ score, severity }: { score: number; severity: RiskSeverity }) {
  const pct = Math.max(0, Math.min(score, 10)) * 10
  const fillClass =
    severity === 'toxic'
      ? 'bg-gradient-to-r from-red-600 to-red-300'
      : severity === 'high'
      ? 'bg-gradient-to-r from-orange-500 to-orange-300'
      : severity === 'medium'
      ? 'bg-gradient-to-r from-amber-500 to-amber-300'
      : 'bg-gradient-to-r from-emerald-600 to-emerald-400'

  return (
    <div className="mt-3 h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
      <div
        className={`h-full transition-all duration-500 ${fillClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── Flag row ────────────────────────────────────────────────────────────────

function RiskFlagRow({ flag }: { flag: RiskFlag }) {
  const Icon = FLAG_ICONS[flag.kind] ?? ShieldAlert
  const tone = FLAG_TONES[flag.kind]

  return (
    <div className={`rounded-md border px-3 py-2 ${tone}`}>
      <div className="flex items-start gap-2">
        <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {flag.title}
            </span>
            {flag.scoreDelta > 0 && (
              <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
                +{flag.scoreDelta} pts
              </span>
            )}
            {flag.daysUntil != null && (
              <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
                · in {flag.daysUntil}d
              </span>
            )}
            {flag.daysAgo != null && (
              <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
                · {flag.daysAgo}d ago
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-zinc-100/90">
            {flag.detail}
          </p>
          {flag.url && (
            <a
              href={flag.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[10px] text-zinc-300 hover:text-emerald-300 transition"
            >
              <ExternalLink className="w-3 h-3" />
              source
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── 1-Year Corporate DNA Profile section ────────────────────────────────────

const MAX_DNA_VISIBLE = 5

function CorporateDnaSection({
  dna,
  dilutionCount,
  serialDiluter,
}: {
  dna: CorporateTimelineEvent[]
  dilutionCount: number
  serialDiluter: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? dna : dna.slice(0, MAX_DNA_VISIBLE)

  return (
    <div className="p-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300">
            1-Year Corporate DNA Profile
          </span>
          {dilutionCount > 0 && (
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border font-mono tabular-nums ${
                serialDiluter
                  ? 'bg-red-500/20 border-red-400/50 text-red-200'
                  : 'bg-zinc-800/60 border-zinc-700 text-zinc-300'
              }`}
            >
              {dilutionCount} event{dilutionCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {serialDiluter && (
          <span className="text-[10px] font-bold text-red-300 uppercase tracking-wide">
            Serial Diluter
          </span>
        )}
      </div>

      {dna.length === 0 ? (
        <div className="rounded border border-zinc-800/60 bg-zinc-950/40 px-3 py-2.5 text-[11px] text-zinc-500 flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
          No offerings, ATM facilities, convertible notes, or reverse splits
          detected in the past 12 months.
        </div>
      ) : (
        <div className="space-y-1">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_auto] text-[9px] uppercase tracking-wider text-zinc-600 font-semibold px-2 mb-1">
            <span>Event</span>
            <span>Date</span>
          </div>
          {visible.map((event, i) => (
            <DnaEventRow key={`${event.date}-${event.kind}-${i}`} event={event} />
          ))}
          {dna.length > MAX_DNA_VISIBLE && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition py-1"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show {dna.length - MAX_DNA_VISIBLE} more
                </>
              )}
            </button>
          )}
        </div>
      )}

      {serialDiluter && (
        <div className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-100 leading-snug">
          <span className="font-bold uppercase tracking-wider">
            Serial Diluter Warning:
          </span>{' '}
          Management has executed {dilutionCount} distinct financing or share-consolidation
          events in 12 months. This is a documented pattern of shareholder dilution.
          Avoid holding overnight without a tight stop.
        </div>
      )}
    </div>
  )
}

function DnaEventRow({ event }: { event: CorporateTimelineEvent }) {
  const style = DNA_KIND_STYLES[event.kind]
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-2 rounded border border-zinc-800/60 bg-zinc-950/50 px-3 py-2 text-[11px]">
      <div className="flex items-start gap-2 min-w-0">
        <span className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${style.dot}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border ${style.badge}`}
            >
              {style.label}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {event.daysAgo}d ago
            </span>
          </div>
          <p className="mt-0.5 text-zinc-300 leading-snug truncate" title={event.detail}>
            {event.detail}
          </p>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-zinc-500 hover:text-emerald-300 transition"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              source
            </a>
          )}
        </div>
      </div>
      <span className="font-mono text-[10px] text-zinc-500 tabular-nums whitespace-nowrap">
        {event.date}
      </span>
    </div>
  )
}

// ─── Earnings & Financial Health section ─────────────────────────────────────

const HEALTH_STYLES: Record<
  EarningsHealth,
  { border: string; bg: string; iconColor: string; icon: typeof TrendingUp; label: string; labelColor: string }
> = {
  strong: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/5',
    icon: TrendingUp,
    iconColor: 'text-emerald-300',
    label: 'Recommended Trend: Strong Financial Posture',
    labelColor: 'text-emerald-200',
  },
  caution: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    icon: AlertTriangle,
    iconColor: 'text-amber-300',
    label: 'Risk Caution: Binary Earnings Window active / Weak Financial Posture',
    labelColor: 'text-amber-200',
  },
  neutral: {
    border: 'border-zinc-700/60',
    bg: 'bg-zinc-900/40',
    icon: Minus,
    iconColor: 'text-zinc-400',
    label: 'Neutral Financial Posture',
    labelColor: 'text-zinc-300',
  },
}

const SURPRISE_STYLES = {
  beat: { text: 'text-emerald-300', icon: TrendingUp, label: 'Beat' },
  miss: { text: 'text-red-300', icon: TrendingDown, label: 'Miss' },
  inline: { text: 'text-zinc-300', icon: Minus, label: 'In-line' },
}

function EarningsHealthSection({ health }: { health: EarningsHealthData | null }) {
  const style = HEALTH_STYLES[health?.health ?? 'neutral']
  const HealthIcon = style.icon

  return (
    <div className="p-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="w-3.5 h-3.5 text-zinc-400" />
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-300">
          Earnings &amp; Financial Health View
        </span>
      </div>

      {!health ? (
        <div className="rounded border border-zinc-800/60 bg-zinc-950/40 px-3 py-2.5 text-[11px] text-zinc-500 flex items-center gap-2">
          <CalendarClock className="w-3.5 h-3.5 text-zinc-600" />
          No earnings data available for this symbol.
        </div>
      ) : (
        <div className={`rounded border ${style.border} ${style.bg} p-3 space-y-3`}>
          {/* Health recommendation */}
          <div className="flex items-start gap-2">
            <HealthIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.iconColor}`} />
            <div>
              <span className={`text-[11px] font-bold uppercase tracking-wide ${style.labelColor}`}>
                {health.health === 'strong' ? '🟢 ' : health.health === 'caution' ? '🟡 ' : '⚪ '}
                {style.label}
              </span>
              <p className="mt-0.5 text-[11px] text-zinc-300 leading-snug">
                {health.reason}
              </p>
            </div>
          </div>

          {/* Data grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Upcoming earnings */}
            {health.nextDate && (
              <div className="rounded border border-zinc-700/60 bg-zinc-950/50 px-3 py-2 space-y-0.5">
                <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Next Report
                </div>
                <div className="text-sm font-mono tabular-nums text-zinc-100 font-semibold">
                  {health.nextDate}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono tabular-nums flex items-center gap-1">
                  {health.nextDaysUntil != null && (
                    <span
                      className={
                        health.nextDaysUntil <= 3
                          ? 'text-red-300 font-semibold'
                          : health.nextDaysUntil <= 30
                          ? 'text-amber-300'
                          : 'text-zinc-400'
                      }
                    >
                      in {health.nextDaysUntil}d
                    </span>
                  )}
                  {health.nextSession === 'bmo' && (
                    <span className="text-zinc-500">· BMO</span>
                  )}
                  {health.nextSession === 'amc' && (
                    <span className="text-zinc-500">· AMC</span>
                  )}
                </div>
              </div>
            )}

            {/* Last reported */}
            {health.lastDate && (
              <div className="rounded border border-zinc-700/60 bg-zinc-950/50 px-3 py-2 space-y-0.5">
                <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Last Reported
                </div>
                <div className="text-sm font-mono tabular-nums text-zinc-100 font-semibold">
                  {health.lastDate}
                  <span className="ml-1 text-[10px] text-zinc-500 font-normal">
                    ({health.lastDaysAgo}d ago)
                  </span>
                </div>
                {health.epsSurprise && (
                  <EpsSurpriseBadge
                    surprise={health.epsSurprise}
                    actual={health.epsActual}
                    estimate={health.epsEstimate}
                  />
                )}
              </div>
            )}
          </div>

          {/* Revenue row — only when data exists */}
          {(health.revenueActual != null || health.revenueEstimate != null) && (
            <div className="rounded border border-zinc-700/60 bg-zinc-950/50 px-3 py-2">
              <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold mb-1">
                Revenue (last reported quarter)
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {health.revenueActual != null && (
                  <span className="text-[11px] font-mono tabular-nums text-zinc-100">
                    Actual:{' '}
                    <span className="font-semibold">
                      ${(health.revenueActual / 1e6).toFixed(1)}M
                    </span>
                  </span>
                )}
                {health.revenueEstimate != null && (
                  <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                    Est: ${(health.revenueEstimate / 1e6).toFixed(1)}M
                  </span>
                )}
                {health.revenueActual != null && health.revenueEstimate != null && (
                  <RevenueDelta
                    actual={health.revenueActual}
                    estimate={health.revenueEstimate}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EpsSurpriseBadge({
  surprise,
  actual,
  estimate,
}: {
  surprise: 'beat' | 'miss' | 'inline'
  actual?: number
  estimate?: number
}) {
  const style = SURPRISE_STYLES[surprise]
  const SurpriseIcon = style.icon
  return (
    <div className={`flex items-center gap-1 text-[10px] font-mono tabular-nums ${style.text}`}>
      <SurpriseIcon className="w-3 h-3" />
      <span className="font-semibold">{style.label}</span>
      {actual != null && estimate != null && (
        <span className="text-zinc-400 font-normal">
          · EPS {actual.toFixed(2)} vs est {estimate.toFixed(2)}
        </span>
      )}
    </div>
  )
}

function RevenueDelta({ actual, estimate }: { actual: number; estimate: number }) {
  const pct = ((actual - estimate) / Math.abs(estimate)) * 100
  const positive = pct >= 0
  return (
    <span
      className={`text-[10px] font-mono tabular-nums font-semibold ${positive ? 'text-emerald-300' : 'text-red-300'}`}
    >
      ({positive ? '+' : ''}{pct.toFixed(1)}%)
    </span>
  )
}
