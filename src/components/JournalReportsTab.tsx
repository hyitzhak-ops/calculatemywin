import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  X,
  Trash2,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Filter,
} from 'lucide-react'
import { Panel } from './ui/Panel'
import { useDashboard } from '../context/DashboardContext'
import {
  formatUSD,
  profitColorClass,
  toLocalDateStr,
  parseLocalDateStr,
  formatDateLong,
} from '../utils/format'
import type { CompletedTrade, DailyJournalNote } from '../types'

type RangePreset = 'today' | 'week' | 'month' | 'quarter' | 'custom'

interface DailyAgg {
  dateStr: string
  net: number
  count: number
  wins: number
  losses: number
}

function aggregateByDay(trades: CompletedTrade[]): Map<string, DailyAgg> {
  const map = new Map<string, DailyAgg>()
  for (const t of trades) {
    const key = toLocalDateStr(t.timestamp)
    const cur = map.get(key) ?? {
      dateStr: key,
      net: 0,
      count: 0,
      wins: 0,
      losses: 0,
    }
    cur.net += t.profitUSD
    cur.count += 1
    if (t.profitUSD > 0) cur.wins += 1
    else if (t.profitUSD < 0) cur.losses += 1
    map.set(key, cur)
  }
  return map
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function startOfWeek(d: Date): Date {
  const day = d.getDay() // 0 = Sun
  const diff = day // week starts Sunday
  const out = new Date(d)
  out.setDate(d.getDate() - diff)
  return startOfDay(out)
}

function startOfQuarter(d: Date): Date {
  const m = d.getMonth()
  const qStart = m - (m % 3)
  return new Date(d.getFullYear(), qStart, 1, 0, 0, 0, 0)
}

function endOfQuarter(d: Date): Date {
  const m = d.getMonth()
  const qStart = m - (m % 3)
  return new Date(d.getFullYear(), qStart + 3, 0, 23, 59, 59, 999)
}

export function JournalReportsTab() {
  const {
    completedTrades,
    journalNotes,
    setJournalNote,
    removeJournalNote,
  } = useDashboard()

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [openNoteFor, setOpenNoteFor] = useState<string | null>(null)

  const dailyAgg = useMemo(() => aggregateByDay(completedTrades), [
    completedTrades,
  ])

  return (
    <div className="space-y-6">
      <PerformanceCalendar
        viewMonth={viewMonth}
        setViewMonth={setViewMonth}
        dailyAgg={dailyAgg}
        notes={journalNotes}
        onOpenDay={setOpenNoteFor}
      />

      <InsightsTimeline
        notes={journalNotes}
        dailyAgg={dailyAgg}
        onOpenDay={setOpenNoteFor}
        onDelete={removeJournalNote}
      />

      <RangeReport completedTrades={completedTrades} />

      {openNoteFor && (
        <DailyNoteModal
          dateStr={openNoteFor}
          existing={journalNotes[openNoteFor]?.note ?? ''}
          dayAgg={dailyAgg.get(openNoteFor)}
          onClose={() => setOpenNoteFor(null)}
          onSave={(text) => {
            setJournalNote(openNoteFor, text)
            setOpenNoteFor(null)
          }}
          onDelete={() => {
            removeJournalNote(openNoteFor)
            setOpenNoteFor(null)
          }}
        />
      )}
    </div>
  )
}

interface PerformanceCalendarProps {
  viewMonth: Date
  setViewMonth: (d: Date) => void
  dailyAgg: Map<string, DailyAgg>
  notes: Record<string, DailyJournalNote>
  onOpenDay: (dateStr: string) => void
}

function PerformanceCalendar({
  viewMonth,
  setViewMonth,
  dailyAgg,
  notes,
  onOpenDay,
}: PerformanceCalendarProps) {
  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const todayStr = toLocalDateStr(new Date())

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1)
    const startWeekday = firstOfMonth.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const out: { dateStr: string | null; day: number | null }[] = []
    for (let i = 0; i < startWeekday; i++) out.push({ dateStr: null, day: null })
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = toLocalDateStr(new Date(year, month, d))
      out.push({ dateStr, day: d })
    }
    while (out.length % 7 !== 0) out.push({ dateStr: null, day: null })
    return out
  }, [year, month])

  const monthNet = useMemo(() => {
    let net = 0
    let trades = 0
    let activeDays = 0
    for (const c of cells) {
      if (!c.dateStr) continue
      const agg = dailyAgg.get(c.dateStr)
      if (agg) {
        net += agg.net
        trades += agg.count
        activeDays += 1
      }
    }
    return { net, trades, activeDays }
  }, [cells, dailyAgg])

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(viewMonth)

  const goPrev = () => setViewMonth(new Date(year, month - 1, 1))
  const goNext = () => setViewMonth(new Date(year, month + 1, 1))
  const goToday = () => {
    const now = new Date()
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <Panel
      title={`Performance Calendar · ${monthLabel}`}
      subtitle="Click any day to add or edit a journal note"
      action={
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            title="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-2 py-1 text-xs text-zinc-400 hover:text-emerald-300 transition rounded-md hover:bg-zinc-800"
          >
            Today
          </button>
          <button
            onClick={goNext}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            title="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      }
    >
      <MonthSummaryBanner
        net={monthNet.net}
        trades={monthNet.trades}
        activeDays={monthNet.activeDays}
        monthLabel={monthLabel}
      />

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold py-1"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, idx) => {
          if (!cell.dateStr || cell.day === null) {
            return <div key={`pad-${idx}`} className="h-20" />
          }
          const agg = dailyAgg.get(cell.dateStr)
          const hasNote = !!notes[cell.dateStr]
          const isToday = cell.dateStr === todayStr
          const net = agg?.net ?? 0

          let cellClass =
            'border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-400'
          if (agg && net > 0) {
            cellClass =
              'border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-200'
          } else if (agg && net < 0) {
            cellClass =
              'border border-red-500/30 bg-red-950/30 hover:bg-red-900/40 text-red-200'
          } else if (agg && net === 0 && agg.count > 0) {
            cellClass =
              'border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-300'
          }

          if (isToday) {
            cellClass += ' ring-1 ring-emerald-400/60'
          }

          return (
            <button
              key={cell.dateStr}
              onClick={() => onOpenDay(cell.dateStr!)}
              className={`relative h-20 rounded-md text-left p-1.5 transition flex flex-col justify-between ${cellClass}`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold tabular-nums">
                  {cell.day}
                </span>
                {hasNote && (
                  <NotebookPen className="w-3 h-3 text-amber-300/80" />
                )}
              </div>
              <div className="text-[11px] font-mono tabular-nums leading-tight">
                {agg ? (
                  <>
                    <div className={profitColorClass(net)}>
                      {net >= 0 ? '+' : ''}
                      {formatUSD(net)}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {agg.count} {agg.count === 1 ? 'trade' : 'trades'}
                    </div>
                  </>
                ) : (
                  <span className="text-zinc-600">$0</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}

interface MonthSummaryProps {
  net: number
  trades: number
  activeDays: number
  monthLabel: string
}

function MonthSummaryBanner({
  net,
  trades,
  activeDays,
  monthLabel,
}: MonthSummaryProps) {
  const positive = net > 0
  const negative = net < 0

  const cardClass = positive
    ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-zinc-900'
    : negative
    ? 'border-red-500/40 bg-gradient-to-br from-red-500/10 to-zinc-900'
    : 'border-zinc-800 bg-zinc-900/60'

  return (
    <div
      className={`rounded-lg border ${cardClass} px-4 py-3 flex items-center justify-between gap-4`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center border ${
            positive
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : negative
              ? 'bg-red-500/15 border-red-500/40 text-red-300'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
          }`}
        >
          {positive ? (
            <TrendingUp className="w-5 h-5" />
          ) : negative ? (
            <TrendingDown className="w-5 h-5" />
          ) : (
            <CalendarDays className="w-5 h-5" />
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
            {monthLabel} Net P/L
          </div>
          <div
            className={`text-2xl font-mono tabular-nums font-semibold ${profitColorClass(
              net
            )}`}
          >
            {net >= 0 ? '+' : ''}
            {formatUSD(net)}
          </div>
        </div>
      </div>
      <div className="text-right text-xs text-zinc-400 leading-tight">
        <div>
          <span className="font-mono tabular-nums text-zinc-200">
            {trades}
          </span>{' '}
          trades
        </div>
        <div>
          <span className="font-mono tabular-nums text-zinc-200">
            {activeDays}
          </span>{' '}
          active {activeDays === 1 ? 'day' : 'days'}
        </div>
      </div>
    </div>
  )
}

interface InsightsTimelineProps {
  notes: Record<string, DailyJournalNote>
  dailyAgg: Map<string, DailyAgg>
  onOpenDay: (dateStr: string) => void
  onDelete: (dateStr: string) => void
}

function InsightsTimeline({
  notes,
  dailyAgg,
  onOpenDay,
  onDelete,
}: InsightsTimelineProps) {
  const sorted = useMemo(
    () =>
      Object.values(notes).sort((a, b) =>
        b.dateStr.localeCompare(a.dateStr)
      ),
    [notes]
  )

  return (
    <Panel
      title={`Lessons Learned (${sorted.length})`}
      subtitle="A central review of every day you reflected on"
    >
      {sorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-zinc-500 flex flex-col items-center gap-2">
          <BookOpen className="w-6 h-6 text-zinc-700" />
          No notes yet. Click any day on the calendar to add a reflection.
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((n) => {
            const agg = dailyAgg.get(n.dateStr)
            const net = agg?.net ?? 0
            return (
              <li
                key={n.dateStr}
                className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3 hover:border-zinc-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => onOpenDay(n.dateStr)}
                      className="text-xs font-semibold text-zinc-200 hover:text-emerald-300 transition whitespace-nowrap"
                    >
                      {formatDateLong(n.dateStr)}
                    </button>
                    {agg ? (
                      <span
                        className={`text-xs font-mono tabular-nums px-2 py-0.5 rounded ${
                          net > 0
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : net < 0
                            ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {net >= 0 ? '+' : ''}
                        {formatUSD(net)} · {agg.count}{' '}
                        {agg.count === 1 ? 'trade' : 'trades'}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 font-mono px-2 py-0.5 rounded bg-zinc-800/60 border border-zinc-700">
                        no trades
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(n.dateStr)}
                    title="Delete note"
                    className="text-zinc-600 hover:text-red-400 transition flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {n.note}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

interface RangeReportProps {
  completedTrades: CompletedTrade[]
}

function RangeReport({ completedTrades }: RangeReportProps) {
  const [preset, setPreset] = useState<RangePreset>('month')
  const [customStart, setCustomStart] = useState(() =>
    toLocalDateStr(new Date())
  )
  const [customEnd, setCustomEnd] = useState(() => toLocalDateStr(new Date()))

  const range = useMemo(() => {
    const now = new Date()
    switch (preset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now), label: 'Today' }
      case 'week':
        return {
          start: startOfWeek(now),
          end: endOfDay(now),
          label: 'This Week',
        }
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: endOfDay(now),
          label: 'This Month',
        }
      case 'quarter':
        return {
          start: startOfQuarter(now),
          end: endOfQuarter(now),
          label: 'This Quarter',
        }
      case 'custom': {
        const s = parseLocalDateStr(customStart)
        const e = parseLocalDateStr(customEnd)
        return {
          start: startOfDay(s),
          end: endOfDay(e),
          label: 'Custom Range',
        }
      }
    }
  }, [preset, customStart, customEnd])

  const stats = useMemo(() => {
    let total = 0
    let wins = 0
    let losses = 0
    let net = 0
    let breakeven = 0
    let bestDay = 0
    let worstDay = 0
    const startMs = range.start.getTime()
    const endMs = range.end.getTime()
    const dayMap = new Map<string, number>()
    for (const t of completedTrades) {
      if (t.timestamp < startMs || t.timestamp > endMs) continue
      total += 1
      net += t.profitUSD
      if (t.profitUSD > 0) wins += 1
      else if (t.profitUSD < 0) losses += 1
      else breakeven += 1
      const key = toLocalDateStr(t.timestamp)
      dayMap.set(key, (dayMap.get(key) ?? 0) + t.profitUSD)
    }
    for (const v of dayMap.values()) {
      if (v > bestDay) bestDay = v
      if (v < worstDay) worstDay = v
    }
    const winRate = total > 0 ? (wins / total) * 100 : 0
    return { total, wins, losses, breakeven, net, winRate, bestDay, worstDay }
  }, [completedTrades, range])

  return (
    <Panel
      title="Date-Range Report"
      subtitle={`${range.label} · ${toLocalDateStr(range.start)} → ${toLocalDateStr(range.end)}`}
      action={<Filter className="w-4 h-4 text-zinc-500" />}
    >
      <div className="flex flex-wrap items-center gap-2">
        {(['today', 'week', 'month', 'quarter', 'custom'] as RangePreset[]).map(
          (p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`text-xs px-3 py-1.5 rounded-md border transition font-medium ${
                preset === p
                  ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              {p === 'today'
                ? 'Today'
                : p === 'week'
                ? 'This Week'
                : p === 'month'
                ? 'This Month'
                : p === 'quarter'
                ? 'This Quarter'
                : 'Custom'}
            </button>
          )
        )}
      </div>

      {preset === 'custom' && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Start
            </label>
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              End
            </label>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Net P/L" valueClass={profitColorClass(stats.net)}>
          {stats.net >= 0 ? '+' : ''}
          {formatUSD(stats.net)}
        </StatCard>
        <StatCard label="Total Trades">{stats.total}</StatCard>
        <StatCard
          label={`Wins · ${stats.winRate.toFixed(0)}%`}
          valueClass="text-emerald-400"
        >
          {stats.wins}
        </StatCard>
        <StatCard label="Losses" valueClass="text-red-400">
          {stats.losses}
        </StatCard>
        <StatCard label="Best Day" valueClass="text-emerald-400">
          {formatUSD(stats.bestDay)}
        </StatCard>
        <StatCard label="Worst Day" valueClass="text-red-400">
          {formatUSD(stats.worstDay)}
        </StatCard>
        <StatCard label="Breakeven">{stats.breakeven}</StatCard>
        <StatCard label="Avg / Trade">
          {stats.total > 0 ? formatUSD(stats.net / stats.total) : '$0.00'}
        </StatCard>
      </div>
    </Panel>
  )
}

interface StatCardProps {
  label: string
  valueClass?: string
  children: React.ReactNode
}

function StatCard({ label, valueClass, children }: StatCardProps) {
  return (
    <div className="rounded-md border border-zinc-800 bg-slate-950/60 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
        {label}
      </div>
      <div
        className={`mt-1 text-lg font-mono tabular-nums font-semibold ${
          valueClass ?? 'text-zinc-100'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

interface DailyNoteModalProps {
  dateStr: string
  existing: string
  dayAgg?: DailyAgg
  onClose: () => void
  onSave: (text: string) => void
  onDelete: () => void
}

function DailyNoteModal({
  dateStr,
  existing,
  dayAgg,
  onClose,
  onSave,
  onDelete,
}: DailyNoteModalProps) {
  const [text, setText] = useState(existing)

  useEffect(() => {
    setText(existing)
  }, [existing])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const net = dayAgg?.net ?? 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              {formatDateLong(dateStr)}
            </h2>
            {dayAgg ? (
              <p className="text-xs mt-0.5">
                <span
                  className={`font-mono tabular-nums ${profitColorClass(net)}`}
                >
                  {net >= 0 ? '+' : ''}
                  {formatUSD(net)}
                </span>
                <span className="text-zinc-500">
                  {' '}
                  · {dayAgg.count} {dayAgg.count === 1 ? 'trade' : 'trades'} ·{' '}
                  {dayAgg.wins}W / {dayAgg.losses}L
                </span>
              </p>
            ) : (
              <p className="text-xs text-zinc-500 mt-0.5">No trades on this day</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="block text-xs font-medium text-zinc-400">
            Lesson learned · what went well or wrong?
          </label>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="What did I do well? What mistakes did I make? What will I do differently tomorrow?"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none"
          />

          <div className="flex items-center justify-between gap-3 pt-1">
            {existing ? (
              <button
                onClick={onDelete}
                className="text-xs text-zinc-500 hover:text-red-400 transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete note
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-sm px-3 py-2 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(text)}
                className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-medium px-4 py-2 transition"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
