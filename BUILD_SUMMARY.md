# Build Summary — Calculate My Win

A complete, production-ready, **100% client-side** day trading dashboard combining a live multi-stock watchlist, a daily-goal/risk manager with profit & stop-loss matrices, and a journal & analytics tab with equity curve, calendar, and JSON backup/restore.

---

## Build Status

`npm run build` — succeeds with zero TypeScript errors. `npm run dev` boots the dashboard with AAPL pre-loaded.

---

## Tab 1 — Live Dashboard & Calculator

The original calculator + watchlist surface.

| Feature | Description |
|---------|-------------|
| Multi-ticker watchlist | Add/remove any number of tickers, each with independent state |
| Live polling | All loaded tickers refresh every 15 s (refs avoid interval restarts) |
| 7 time ranges | `10m / 1h / 3h / 1d / 1w / 1mo / 1y` per ticker |
| Smart fallback chain | Finnhub → Yahoo Finance → deterministic mock data |
| Color-coded charts | Recharts AreaChart, green-up / red-down, no dots, activeDot on hover |
| Mode A — Percent | `(sell − buy) / buy × 100` recomputed instantly via `useMemo` |
| Mode B — Position | Shares × price difference, "Use live price" pulls from active ticker |
| Simulation log | Last 50 saved calculations in `localStorage`, individual + bulk delete |

---

## Tab 2 — Daily Goal & Risk Manager

Active position management with paired profit/stop-loss matrices.

### Daily Realized Profit Card
- Live sum of every closed trade for the current calendar day
- Configurable `min` / `max` daily goal (e.g. $1,000 – $2,000)
- Progress bar fills from 0 → goal.min, then turns brighter when reached
- **Goal-reached banner** is purely visual — every input/button stays usable past the goal
- Live `+$X over goal` chip when `dailyProfit > goal.min`
- Live `well above max (...over)` pill when `dailyProfit > goal.max`
- Down-day advisory banner when net negative

### Add Trade Form
Symbol / shares / buy price → instantly persisted to `localStorage`.

### Active Position Cards
For each open trade, a side-by-side 2-column layout:

- **Profit Targets matrix (green-tinted)** — for tiers 5 / 10 / 15 / 20 %, displays
  - `targetPrice = buyPrice × (1 + tier)`
  - `totalValue = shares × targetPrice`
  - `netProfit = (targetPrice − buyPrice) × shares`
- **Stop-Loss Thresholds matrix (red-tinted, `bg-red-950/20` / `text-red-400`)** — same tiers downside
  - `stopPrice = buyPrice × (1 − tier)`
  - `totalValue = shares × stopPrice`
  - `netLoss = (buyPrice − stopPrice) × shares`

### Close & Discard Actions
- **Report Sale** — open a confirm form with a live P/L preview, then commit the close (moves the trade from `activeTrades` → `completedTrades`)
- **Discard** — removes a position without recording a sale

### Today's Closed Trades Table
Symbol / shares / buy / sell / profit / time, with one-click "Clear all".

---

## Tab 3 — Journal & Reports

Long-term performance analytics, written reflections, and full-state backup.

### Backup & Restore
- **Export Backup** — bundles every `localStorage` slice into one JSON file:
  ```
  trading_dashboard_backup_YYYY-MM-DD.json
  ```
  Includes: `activeTrades`, `completedTrades`, `dailyGoal`, `dailyJournalNotes`, `simulations`, plus `version`, `exportedAt`, and `app` headers.
- **Import Backup** — opens a hidden `<input type="file" accept=".json" />`, parses with `FileReader`, validates structural keys (rejects with *"Invalid backup file format."* if missing), then confirms before overwriting. On success, dispatches a `BACKUP_REFRESH_EVENT` that **bumps a key on `<DashboardProvider>`** — every hook re-reads `localStorage` cleanly without a manual page reload.
- Per-key shape validation lets partial / older backups still restore everything they can.
- Buttons appear both in the global sticky header and as a high-visibility panel at the top of Tab 3.

### Reporting Window (shared filter)
A single source of truth that drives both the equity curve and the date-range report below:
- Preset chips: `Today · This Week · This Month · This Quarter · Custom`
- Custom mode reveals two `<input type="date">` fields with min/max wired together

### Equity Curve Chart
Premium Recharts AreaChart sitting prominently below the filter:
- Smooth `monotone` cumulative-P/L curve, starting at $0 at the beginning of the window
- Linear gradient fill under the curve, dynamic stroke (emerald `#10b981` on net positive, red `#f87171` on net negative)
- `ReferenceLine y={0}`, minimal grid, hidden tick lines for a clean financial look
- **Custom dark tooltip** showing **Date · Cumulative · Growth % · Day P/L · Trades**
- Recharts' built-in 900 ms ease-out animation + a CSS `equityFadeIn` keyframe for a "drawing" entrance
- `growthPercent = cumulative ÷ Σ(buyPrice × shares) × 100` (return on capital actually deployed in the window)
- **4-card summary bar**: Peak Equity, Max Drawdown, Max Daily Win, Max Daily Loss — each captioned with the exact date it occurred

### Performance Calendar (monthly)
- `grid-cols-7` layout for the visible month with prev / today / next nav
- Each cell shows that day's **net P/L** and **trade count**, color-coded:
  - Green tint when net > 0
  - Red tint when net < 0
  - Neutral gray when no trades
- Today's cell is ringed in emerald
- A pencil icon appears on any day with a saved note
- Click any day to open the Daily Note Modal

### Monthly Summary Banner
Net P/L, total trades, and active days for the visible month — sits above the calendar grid.

### Daily Note Modal
- Textarea seeded with any existing note for that date
- Saves instantly to `localStorage` under `calculatemywin_journal_notes` (keyed by `YYYY-MM-DD`)
- Shows that day's net P/L + W/L breakdown in the header
- Esc key and click-outside both dismiss
- Inline delete on existing notes

### Lessons Learned Timeline
Every day with a journal note, sorted newest first. Each entry shows the date, that day's net P/L badge (green / red / "no trades"), trade count, and the full note text — with inline delete.

### Date-Range Report
8 stat cards driven by the same Reporting Window:
- Net P/L · Total Trades · Wins (with win-rate %) · Losses
- Best Day · Worst Day · Breakeven · Avg / Trade

---

## Architecture

```
src/
├── App.tsx                         # Provider wrapper · listens for backup-restore event to remount
├── main.tsx
├── index.css                       # Tailwind import + .fade-in-chart keyframe
├── types/index.ts                  # All shared TS interfaces (incl. DailyJournalNote)
├── utils/
│   ├── format.ts                   # USD/percent/color helpers + toLocalDateStr / parseLocalDateStr / formatDateLong
│   ├── calculations.ts             # Pure calc functions
│   └── backup.ts                   # buildBackupPayload · exportBackupToFile · validateBackup · applyBackup · readBackupFile
├── services/
│   └── stockService.ts             # Finnhub + Yahoo + mock fallback chain
├── hooks/
│   ├── useTrades.ts                # activeTrades · completedTrades · dailyGoal
│   ├── useJournal.ts               # dailyJournalNotes (Record<dateStr, DailyJournalNote>)
│   ├── useSimulations.ts           # calculator log (last 50)
│   └── usePerformanceData.ts       # equity curve points + drawdown summary
├── context/
│   └── DashboardContext.tsx        # aggregates useTrades + useSimulations + useJournal
└── components/
    ├── ui/Panel.tsx · Field.tsx
    ├── Dashboard.tsx               # Header, sticky tab switcher, layout
    ├── BackupControls.tsx          # Export/Import buttons (header + panel variants)
    ├── TickerGrid.tsx · StockTickerPanel.tsx · PriceChart.tsx
    ├── PercentCalculator.tsx       # Tab 1 — Mode A
    ├── PositionCalculator.tsx      # Tab 1 — Mode B
    ├── SimulationLog.tsx           # Tab 1 — log
    ├── RiskManagerTab.tsx          # Tab 2
    ├── JournalReportsTab.tsx       # Tab 3 (calendar · notes · range report)
    └── EquityCurveChart.tsx        # Tab 3 (chart + drawdown stats)
```

### Persistence — five `localStorage` slices

| Slice              | Key                                  | Shape |
|--------------------|--------------------------------------|-------|
| `activeTrades`     | `calculatemywin_active_trades`       | `ActiveTrade[]` |
| `completedTrades`  | `calculatemywin_completed_trades`    | `CompletedTrade[]` (max 200) |
| `dailyGoal`        | `calculatemywin_daily_goal`          | `{ min, max }` |
| `dailyJournalNotes`| `calculatemywin_journal_notes`       | `Record<YYYY-MM-DD, DailyJournalNote>` |
| `simulations`      | `calculatemywin_simulations`         | `StockSimulation[]` (max 50) |

### Backup file shape (v1)

```json
{
  "version": 1,
  "exportedAt": "2026-05-31T18:42:11.000Z",
  "app": "calculate-my-win",
  "data": {
    "activeTrades":      [ ... ],
    "completedTrades":   [ ... ],
    "dailyGoal":         { "min": 1000, "max": 2000 },
    "dailyJournalNotes": { "2026-05-30": { "dateStr": "2026-05-30", "note": "...", "updatedAt": 1717000000000 } },
    "simulations":       [ ... ]
  }
}
```

A legacy raw-JSON shape (without the wrapping `version` / `data` envelope) is also accepted by the validator for backwards compatibility.

---

## Key Design Decisions

- **Calculations are pure functions** wrapped in `useMemo` — instant updates as you type, no submit buttons
- **The goal-reached state is purely visual** — there are no `disabled` props tied to `goalReached`, and the `dailyProfit` sum is uncapped, so trades after $2,000 keep accumulating ($2,300 → $2,500 → …)
- **Timezones are local** — every date key (`YYYY-MM-DD`) is derived from local-browser time via `toLocalDateStr`, so calendar cells align with the user's day
- **`<DashboardProvider key={reloadKey}>`** — bumping the key on `BACKUP_REFRESH_EVENT` is the simplest correct way to remount every hook so they all re-read `localStorage`
- **Refs for polling** — the 15 s ticker poll reads from `tickersRef.current` so the interval never restarts on every render
- **Per-key validation** — backup imports check shape per slice; partial / older files still restore everything they can rather than rejecting outright
- **Each ticker is independent** — range, quote, chart, and source are stored per-ticker
- **Single shared Reporting Window** — Tab 3 lifts the date-range filter to the parent so the chart and report stay perfectly in sync

---

## Visual Design

- **Theme**: dark financial / Bloomberg-minimal
- **Background**: `bg-zinc-950` page · `bg-zinc-900/60` panels · `bg-slate-900/50` chart container
- **Accents**: `emerald-400 / 500` for active states + profits · `red-400` for losses · `amber-300` for journal note markers
- **Profit/loss**: `text-green-400` / `text-red-400` everywhere, mediated by `profitColorClass()`
- **Typography**: IBM Plex Sans for UI · JetBrains Mono with `tabular-nums` for every number

---

## Tech Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS v4 via `@tailwindcss/vite`
- Recharts 2.15 for all area charts
- Lucide React for icons
- Context API + 4 custom hooks for state
- `localStorage` only — no backend, no accounts, no hosted database

---

## Documentation

- **README.md** — full project documentation, tab-by-tab feature list, backup/restore guide
- **TESTING.md** — manual testing checklist covering every feature in every tab
- **BUILD_SUMMARY.md** — this file

---

## Status

**COMPLETE** — All three tabs ship full feature sets, all data persists, backup/restore is verified, and `npm run build` is clean.
