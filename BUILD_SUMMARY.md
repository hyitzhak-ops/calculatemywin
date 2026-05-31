# Build Summary — Calculate My Win

A complete, production-ready, **100% client-side** day trading dashboard combining a live multi-stock watchlist, a daily-goal/risk manager with profit & stop-loss matrices, and a journal & analytics tab with equity curve, calendar, retroactive trade entry, inline trade editing/deletion, and JSON backup/restore.

---

## Build Status

`npm run build` — succeeds with zero TypeScript errors. `npm run dev` boots the dashboard with AAPL pre-loaded.

---

## Tab 1 — Live Dashboard (Watchlist & Market Monitor)

A streamlined, spacious watchlist focused on live market monitoring.

| Feature | Description |
|---------|-------------|
| Multi-ticker watchlist | Add/remove any number of tickers, each with independent state |
| Live polling | All loaded tickers refresh every 15 s (refs avoid interval restarts) |
| 7 time ranges | `10m / 1h / 3h / 1d / 1w / 1mo / 1y` per ticker |
| Smart fallback chain | Finnhub → Yahoo Finance → deterministic mock data |
| Color-coded charts | Recharts AreaChart, green-up / red-down, no dots, activeDot on hover |
| OHLC stats | Open / High / Low / Prev Close displayed per ticker |
| Active ticker ring | Emerald ring highlights the currently selected ticker |
| Search & load | Type any symbol, press Load to fetch live data |

**Removed from earlier versions:** Mode A (Percent Calculator), Mode B (Position Calculator), and Simulations Log — all functionality superseded by the Risk Manager and Journal tabs.

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

Long-term performance analytics, written reflections, retroactive trade entry, inline trade editing/deletion, and full-state backup.

### Backup & Restore
- **Export Backup** — bundles every `localStorage` slice into one JSON file:
  ```
  trading_dashboard_backup_YYYY-MM-DD.json
  ```
  Includes: `activeTrades`, `completedTrades`, `dailyGoal`, `dailyJournalNotes`, plus `version`, `exportedAt`, and `app` headers.
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

### Log Historical Trade Form
Backfill completed trades for past dates:
- **Inputs**: Date Picker (max = today) / Symbol / Shares / Avg Buy Price / Avg Sell Price
- **Live "Calculated P/L" preview**: `(sell − buy) × shares`
- **On submit**: trade inserted into `completedTrades` with timestamp anchored at noon local on the chosen day
- **Reactive cascade**: immediately reflects in the Performance Calendar cell color/total, Monthly Summary Banner, and Equity Curve
- **Success notification**: "Trade logged successfully for [date] · +$X" with auto-dismiss after 4s
- **Toggleable panel**: "New entry" button shows/hides the form

### Performance Calendar (monthly)
- `grid-cols-7` layout for the visible month with prev / today / next nav
- Each cell shows that day's **net P/L** and **trade count**, color-coded:
  - Green tint when net > 0
  - Red tint when net < 0
  - Neutral gray when no trades
- Today's cell is ringed in emerald
- A pencil icon appears on any day with a saved note
- Click any day to open the **Daily Management Console Modal**

### Daily Management Console Modal
Enhanced 2-tab modal for complete day-level trade management:

#### Tab: Notes
- Textarea seeded with any existing note for that date
- Saves instantly to `localStorage` under `calculatemywin_journal_notes` (keyed by `YYYY-MM-DD`)
- Shows that day's net P/L + W/L breakdown in the header (recomputed live from the day's trades)
- Esc key and click-outside both dismiss
- Inline delete on existing notes
- "Update Note" / "Save Note" button (disabled when unchanged)

#### Tab: Show Details
Complete drill-down of all `CompletedTrade` objects executed on that specific calendar day:
- **List layout** (`max-h-[60vh]` scrollable) displaying:
  - Symbol / Shares / Buy → Sell / P/L (color-coded green/red)
- **Edit (pencil icon)** per row:
  - Turns the row into inline inputs: Symbol / Shares / Buy Price / Sell Price
  - Live "New P/L" preview
  - **Save** calls `updateCompletedTrade(id, { symbol, shares, buyPrice, sellPrice })` — auto-recalculates `profitUSD`
  - **Cancel** reverts to read-only row
  - Validation: "Symbol is required", "Shares must be > 0", etc.
- **Delete (trash icon)** per row:
  - Opens inline confirmation banner: "Are you sure you want to delete this trade log? This will recalculate all historical reports."
  - **Confirm** calls `deleteCompletedTrade(id)`
  - **Cancel** closes the banner
- **Reactive cascade**: editing or deleting a trade instantly updates:
  1. The current day's calendar cell color and total
  2. The Monthly Summary Banner
  3. The Equity Curve (shifts the historical timeline accurately)
  4. The Daily Goal Tracker (if the trade belongs to today)
  5. All Date-Range Report stats

### Monthly Summary Banner
Net P/L, total trades, and active days for the visible month — sits above the calendar grid. Recomputes live from the `dailyAgg` map, which itself is a `useMemo` over `completedTrades`, so any add/edit/delete cascades immediately.

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
├── App.tsx                         # Provider wrapper · listens for backup-restore event · purges legacy storage keys
├── main.tsx
├── index.css                       # Tailwind import + .fade-in-chart keyframe
├── types/index.ts                  # All shared TS interfaces
├── utils/
│   ├── format.ts                   # USD/percent/color helpers + toLocalDateStr / parseLocalDateStr / formatDateLong
│   └── backup.ts                   # buildBackupPayload · exportBackupToFile · validateBackup · applyBackup · readBackupFile · purgeLegacyStorageKeys
├── services/
│   └── stockService.ts             # Finnhub + Yahoo + mock fallback chain
├── hooks/
│   ├── useTrades.ts                # activeTrades · completedTrades · dailyGoal · addCompletedTrade · updateCompletedTrade · deleteCompletedTrade
│   ├── useJournal.ts               # dailyJournalNotes (Record<dateStr, DailyJournalNote>)
│   └── usePerformanceData.ts       # equity curve points + drawdown summary
├── context/
│   └── DashboardContext.tsx        # aggregates useTrades + useJournal
└── components/
    ├── ui/Panel.tsx · Field.tsx
    ├── Dashboard.tsx               # Header, sticky tab switcher, layout
    ├── BackupControls.tsx          # Export/Import buttons (header + panel variants)
    ├── TickerGrid.tsx · StockTickerPanel.tsx · PriceChart.tsx
    ├── RiskManagerTab.tsx          # Tab 2
    ├── JournalReportsTab.tsx       # Tab 3 (calendar · notes · historical trade form · range report · daily modal with 2 tabs)
    └── EquityCurveChart.tsx        # Tab 3 (chart + drawdown stats)
```

### Persistence — four `localStorage` slices

| Slice              | Key                                  | Shape |
|--------------------|--------------------------------------|-------|
| `activeTrades`     | `calculatemywin_active_trades`       | `ActiveTrade[]` |
| `completedTrades`  | `calculatemywin_completed_trades`    | `CompletedTrade[]` (max 200) |
| `dailyGoal`        | `calculatemywin_daily_goal`          | `{ min, max }` |
| `dailyJournalNotes`| `calculatemywin_journal_notes`       | `Record<YYYY-MM-DD, DailyJournalNote>` |

**Legacy storage cleanup**: `purgeLegacyStorageKeys()` is invoked on app boot and after every backup restore, removing obsolete keys like `calculatemywin_simulations` from earlier versions.

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
    "dailyJournalNotes": { "2026-05-30": { "dateStr": "2026-05-30", "note": "...", "updatedAt": 1717000000000 } }
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
- **Retroactive trade entry** — the historical trade form anchors timestamps at noon local on the chosen day to avoid timezone drift across midnight
- **Inline trade editing** — updating a trade recalculates `profitUSD = (sell − buy) × shares` automatically and persists immediately
- **Reactive cascade** — because every consumer (`dailyAgg`, `MonthSummaryBanner`, `EquityCurveChart`, `RangeReport`, `todayCompleted`/`dailyProfit`) already derives off `completedTrades` with `useMemo`, a single `setCompletedTrades` call cascades to all of them on the next render — no extra wiring needed
- **Confirmation before destructive actions** — deleting a trade prompts "Are you sure? This will recalculate all historical reports."
- **Legacy storage cleanup** — `purgeLegacyStorageKeys()` removes obsolete keys on boot and after backup restore, keeping `localStorage` tidy

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
- Context API + 3 custom hooks for state (`useTrades`, `useJournal`, `usePerformanceData`)
- `localStorage` only — no backend, no accounts, no hosted database

---

## Documentation

- **README.md** — full project documentation, tab-by-tab feature list, backup/restore guide
- **TESTING.md** — manual testing checklist covering every feature in every tab
- **BUILD_SUMMARY.md** — this file

---

## Status

**COMPLETE** — All three tabs ship full feature sets, all data persists, backup/restore is verified, retroactive trade entry works, inline trade editing/deletion cascades correctly, and `npm run build` is clean.
