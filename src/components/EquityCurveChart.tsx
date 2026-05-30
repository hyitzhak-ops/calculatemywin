import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { Activity, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import type { CompletedTrade } from '../types'
import { usePerformanceData, type EquityPoint } from '../hooks/usePerformanceData'
import {
  formatUSD,
  formatPercent,
  profitColorClass,
  formatDateLong,
} from '../utils/format'

interface EquityCurveChartProps {
  trades: CompletedTrade[]
  rangeStart: Date
  rangeEnd: Date
  rangeLabel: string
}

export function EquityCurveChart({
  trades,
  rangeStart,
  rangeEnd,
  rangeLabel,
}: EquityCurveChartProps) {
  const { points, summary } = usePerformanceData(trades, rangeStart, rangeEnd)

  const isUp = summary.netChange >= 0
  const stroke = isUp ? '#10b981' : '#f87171'
  const gradientId = isUp ? 'equityCurveGreen' : 'equityCurveRed'

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-slate-900/50 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-md flex items-center justify-center border ${
              isUp
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
              Equity Curve
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Cumulative P/L · {rangeLabel} ·{' '}
              {summary.totalTrades}{' '}
              {summary.totalTrades === 1 ? 'trade' : 'trades'} ·{' '}
              {summary.activeDays}{' '}
              active {summary.activeDays === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span
            className={`text-2xl font-mono tabular-nums font-semibold ${profitColorClass(
              summary.netChange
            )}`}
          >
            {summary.netChange >= 0 ? '+' : ''}
            {formatUSD(summary.netChange)}
          </span>
          <span
            className={`text-xs font-mono tabular-nums px-2 py-0.5 rounded border ${
              summary.growthPercent >= 0
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
            }`}
          >
            {formatPercent(summary.growthPercent)}
          </span>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="h-72 flex items-center justify-center text-sm text-zinc-500">
          No trades closed in this range yet.
        </div>
      ) : (
        <div className="px-2 sm:px-4 pt-3">
          <div className="h-72 fade-in-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={points}
                margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={stroke} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f1f23"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  minTickGap={32}
                  stroke="#3f3f46"
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) =>
                    Math.abs(v) >= 1000
                      ? `${(v / 1000).toFixed(1)}k`
                      : v.toFixed(0)
                  }
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  width={48}
                  stroke="#3f3f46"
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ stroke: '#52525b', strokeDasharray: '3 3' }}
                  content={<EquityTooltip />}
                />
                <ReferenceLine
                  y={0}
                  stroke="#3f3f46"
                  strokeDasharray="2 4"
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke={stroke}
                  strokeWidth={2.25}
                  fill={`url(#${gradientId})`}
                  dot={false}
                  activeDot={{ r: 4, fill: stroke, stroke: '#0f0f12' }}
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3 border-t border-zinc-800/80">
        <SummaryStat
          icon={<Trophy className="w-3.5 h-3.5" />}
          label="Peak Equity"
          value={formatUSD(summary.peak)}
          sub={summary.peakDateStr ? formatDateLong(summary.peakDateStr) : '—'}
          tone="emerald"
        />
        <SummaryStat
          icon={<TrendingDown className="w-3.5 h-3.5" />}
          label="Max Drawdown"
          value={
            summary.maxDrawdown > 0 ? `−${formatUSD(summary.maxDrawdown)}` : '—'
          }
          sub={
            summary.maxDrawdownDateStr
              ? formatDateLong(summary.maxDrawdownDateStr)
              : 'No drawdowns yet'
          }
          tone="red"
        />
        <SummaryStat
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Max Daily Win"
          value={
            summary.maxDailyWin > 0
              ? `+${formatUSD(summary.maxDailyWin)}`
              : '—'
          }
          sub={
            summary.maxDailyWinDateStr
              ? formatDateLong(summary.maxDailyWinDateStr)
              : 'No winning day'
          }
          tone="emerald"
        />
        <SummaryStat
          icon={<TrendingDown className="w-3.5 h-3.5" />}
          label="Max Daily Loss"
          value={
            summary.maxDailyLoss < 0
              ? `−${formatUSD(Math.abs(summary.maxDailyLoss))}`
              : '—'
          }
          sub={
            summary.maxDailyLossDateStr
              ? formatDateLong(summary.maxDailyLossDateStr)
              : 'No losing day'
          }
          tone="red"
        />
      </div>
    </div>
  )
}

interface SummaryStatProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  tone: 'emerald' | 'red'
}

function SummaryStat({ icon, label, value, sub, tone }: SummaryStatProps) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-300' : 'text-red-300'
  return (
    <div className="rounded-md border border-zinc-800 bg-slate-950/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
        <span className={toneClass}>{icon}</span>
        {label}
      </div>
      <div
        className={`mt-1 text-base font-mono tabular-nums font-semibold ${toneClass}`}
      >
        {value}
      </div>
      <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{sub}</div>
    </div>
  )
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: EquityPoint }>
}

function EquityTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0].payload
  const cumulativeClass = profitColorClass(p.cumulative)
  const dailyClass = profitColorClass(p.daily)
  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
      <div className="text-[11px] font-semibold text-zinc-200">
        {formatDateLong(p.dateStr)}
      </div>
      <div className="mt-1.5 space-y-1">
        <Row
          label="Cumulative"
          value={
            <span className={`font-mono tabular-nums font-semibold ${cumulativeClass}`}>
              {p.cumulative >= 0 ? '+' : ''}
              {formatUSD(p.cumulative)}
            </span>
          }
        />
        <Row
          label="Growth"
          value={
            <span
              className={`font-mono tabular-nums ${
                p.growthPercent >= 0 ? 'text-emerald-300' : 'text-red-300'
              }`}
            >
              {formatPercent(p.growthPercent)}
            </span>
          }
        />
        <Row
          label="Day P/L"
          value={
            <span className={`font-mono tabular-nums ${dailyClass}`}>
              {p.daily >= 0 ? '+' : ''}
              {formatUSD(p.daily)}
            </span>
          }
        />
        <Row
          label="Trades"
          value={
            <span className="font-mono tabular-nums text-zinc-300">
              {p.trades}
            </span>
          }
        />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500">{label}</span>
      {value}
    </div>
  )
}
