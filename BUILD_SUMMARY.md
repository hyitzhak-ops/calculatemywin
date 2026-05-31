# Build Summary — Calculate My Win

A complete, production-ready, **100% client-side** day trading dashboard combining a live multi-stock watchlist with pre-market analytics & volatility alerts, a risk-based position sizing console with scenario planning, and a deep journal & analytics tab with edge metrics, retroactive entry, inline trade editing, and JSON backup/restore.

---

## Build Status

`npm run build` — succeeds with zero TypeScript errors. `npm run dev` boots the dashboard with AAPL pre-loaded.

---

## Tab 1 — Live Dashboard (Watchlist & Market Monitor)

A streamlined watchlist with advanced pre-market analytics, market correlation, and a real-time volatility alert system.

### Core Watchlist
| Feature | Description |
|---------|-------------|
| Multi-ticker watchlist | Add/remove any number of tickers, each with independent state |
| Live polling | All loaded tickers refresh every 15 s (refs avoid interval restarts) |
| 7 time ranges | `10m / 1h / 3h / 1d / 1w / 1mo / 1y` per ticker |
| Smart fallback chain | Finnhub → Yahoo Finance → deterministic mock data |
| OHLC stats | Open / High / Low / Prev Close per ticker |
| Active ticker ring | Emerald ring highlights the selected ticker |

### Pre-Market & Market Analytics
| Feature | Description |
|---------|-------------|
| Pre-Market High/Low lines | Yahoo data fetched with `&includePrePost=true` on intraday ranges; candles isolated to 04:00–09:30 ET via `Intl.DateTimeFormat('America/New_York')`. Rendered as dashed `<ReferenceLine>` (emerald high / red low) with inline labels. |
| Gap calculator | `(open − previousClose) / previousClose × 100`. Color-coded pill shows `Gap +4.2% (+$2.10)`. |
| Pre-Market range pill | Compact `Pre-Mkt: H $X.XX · L $Y.YY` next to the Gap pill. |
| SPY market correlation overlay | Parallel fetch of SPY chart, normalized as %-change vs. start of window. Rendered as a low-opacity dashed gray `<Line>` with secondary right-side %-axis. |
| Self-overlay guard | When the active ticker IS SPY, the overlay is automatically skipped. |

### Volatility Alert System
| Feature | Description |
|---------|-------------|
| `useVolatilityAlert` hook | Per-ticker rolling buffer of `(timestamp, price)` snapshots, drops snapshots older than 2× window. |
| Detection | On each polling cycle, compares latest price to the oldest snapshot inside a 3-min window. |
| Trigger | If `\|∆%\|` ≥ 2%, sets `active=true` with signed pct + actual elapsed ms. |
| Visual flash | Chart container gets `ring-2 ring-amber-400/70` + `volatilityPulse` keyframe animation. |
| Corner badge | `⚠️ HIGH VOLATILITY · +2.4% in 142s` with auto-dismiss after 8 s. |
| Per-ticker isolation | Buffer resets when the symbol changes. |

---

## Tab 2 — Daily Goal & Risk Manager

Risk-based position sizing console with scenario planning, paired profit/stop-loss matrices on active trades.

### Daily Realized Profit Card
- Live sum of every closed trade for the current calendar day
- Configurable `min`/`max` daily goal
- Goal-reached banner is purely visual — every input/button stays usable past the goal
- `+$X over goal` chip + `well above max` pill when applicable
- Down-day advisory banner when net negative

### Add Position Form — Risk-Based Sizing

**Form fields:** Symbol · Buy Price (Entry) · Stop-Loss Price · Max Account Risk · Shares

**Automated sizing math:**
```
recommendedShares = floor(maxRisk / (buyPrice − stopLoss))
```
- Auto-fills the Shares field reactively as you type
- Tracks `sharesManuallyEdited` so the auto-fill never overwrites a user override
- "Reset to recommended (X)" link to snap back

**Validation:**
- If `stopLoss ≥ buyPrice` (invalid for a long), inline red helper triggers: *"Stop-loss must be below buy price"* and the calculation is suppressed

**Sizing Card (right rail):**
- **Recommended Shares** — large bold integer, emerald-bordered card
- **Total Capital Required** — `shares × buyPrice` with multiplication breakdown
- **If stop hits** — actual realized loss based on current shares
- **Under budget by** — leftover from rounding shares down (always ≤ maxRisk because we floor)
- **Risk per share** — `buyPrice − stopLoss`

### Stop-Loss Scenario Matrix (Planning Preview)
Activates the moment Symbol + Buy Price are both valid. Renders 4 tiers (5 / 10 / 15 / 20% drops):

| Column | Formula |
|--------|---------|
| Stop Price | `buyPrice × (1 − tier)` |
| $/share | `buyPrice − stopPrice` |
| Shares | `floor(maxRisk / (buyPrice − stopPrice))` (when Max Risk is set) |
| Capital | `shares × buyPrice` |

- **`[Use this]` quick-set button** writes the tier's stop price into the form's Stop-Loss field with `.toFixed(2)` precision, re-arms share auto-fill so the recommendation refreshes
- **Active tier highlight** — when current stop matches a tier (within ±$0.005), the row turns emerald and the button reads `Armed`
- **Empty state** — dashed border with hint text "Enter Symbol & Buy Price to preview stop-loss scenarios"
- **Conditional columns** — Shares + Capital columns hidden until Max Risk is provided; footer line nudges user to add a budget
- **Visual differentiation** — uses muted `slate-300/400` palette to distinguish from active-trade matrices (saturated emerald/red)

### Active Position Cards
For each open trade, a side-by-side 2-column layout:

- Header shows symbol badge, shares, buy price, total cost, and (if set) the planned stop with implied dollar risk
- **Profit Targets matrix (green-tinted)** — for tiers 5/10/15/20%, displays target price, total value, net profit
- **Stop-Loss Thresholds matrix (red-tinted)** — same tiers downside with stop price, total value, net loss
- **Report Sale** opens a confirm form with:
  - Live realized P/L preview
  - **Trade Strategy / Catalyst dropdown** (`Pre-market Gainer`, `Earnings Report`, `Support Bounce`, `FOMO / Emotional`, `Other`, or `— Untagged —`) for performance attribution
- **Discard** removes a position without recording a sale

### Today's Closed Trades Table
Symbol / shares / buy / sell / profit / time, with one-click "Clear all".

---

## Tab 3 — Journal & Reports

Long-term performance analytics, edge metrics, retroactive trade entry, inline trade editing, and full-state backup.

### Backup & Restore
- **Export Backup** — bundles every `localStorage` slice into one JSON file: `trading_dashboard_backup_YYYY-MM-DD.json` with `version`, `exportedAt`, `app`, and `data` envelope
- **Import Backup** — `<input type="file" accept=".json" />`, parses with `FileReader`, validates structural keys (rejects with *"Invalid backup file format."*), confirms before overwriting. Dispatches `BACKUP_REFRESH_EVENT` that **bumps the `<DashboardProvider>` key** — every hook re-reads `localStorage` cleanly without a manual page reload.
- **Per-key shape validation** — partial / older backups still restore what they can
- **Legacy storage cleanup** — `purgeLegacyStorageKeys()` removes obsolete keys (e.g., `calculatemywin_simulations` from earlier versions) on boot and after restore
- Buttons appear both in the global sticky header and as a high-visibility panel at the top of Tab 3

### Reporting Window (Shared Filter)
Single source of truth that drives both the equity curve and the date-range report:
- Preset chips: `Today · This Week · This Month · This Quarter · Custom`
- Custom mode reveals two `<input type="date">` fields with min/max wired together

### Equity Curve Chart
- Smooth `monotone` cumulative-P/L AreaChart with linear gradient fill
- Dynamic stroke (emerald `#10b981` on net positive, red `#f87171` on net negative)
- `ReferenceLine y={0}`, minimal grid, hidden tick lines
- **Custom dark tooltip** — Date · Cumulative · Growth % · Day P/L · Trades
- Recharts 900ms ease-out animation + CSS `equityFadeIn` keyframe
- `growthPercent = cumulative ÷ Σ(buyPrice × shares) × 100` (return on capital actually deployed in the window)
- **4-card summary**: Peak Equity · Max Drawdown · Max Daily Win · Max Daily Loss (each captioned with the date)

### Gold Statistics Panel
Edge metrics computed across **every** completed trade:

| Metric | Formula | Tier Colors |
|--------|---------|-------------|
| Win Rate | `wins / total × 100` | ≥50% emerald · ≥33% amber · <33% red |
| Profit Factor | `grossProfit / grossLoss` | `N/A` (no losses) · `∞` (only wins) · ≥1.5 emerald · ≥1.0 amber · <1.0 red |
| Avg Win | `grossProfit / wins` | always emerald, sub-line shows `X.XX× avg loss` ratio |
| Avg Loss | `grossLoss / losses` | always red, sub-line shows `Expectancy ±$X / trade` |

### Edge Finder Panel
Strategy attribution & insight callouts:
- **Trade Strategy / Catalyst** — `Pre-market Gainer`, `Earnings Report`, `Support Bounce`, `FOMO / Emotional`, `Other`. Tagged at three places (Risk Manager close form, Historical Trade form, Daily Modal edit). Untagged trades appear as their own row.
- **🟢 "Your Edge" callout** — surfaces the catalyst with the highest net positive P/L: *"You are highly profitable when trading **Pre-market Gainers** (+$X net · Y% win)."*
- **🔴 "Risk Warning" callout** — surfaces the catalyst with the most negative net P/L (only when actually negative): *"**FOMO / Emotional** trades are costing you the most money (−$Y net · Z% win). Avoid these setups."*
- **Strategy table** — sorted by Net P/L, showing Trades / Win Rate / W/L / Net P/L for each catalyst. Untagged row dimmed.

### Performance Calendar (Monthly)
- `grid-cols-7` layout for the visible month with prev / today / next nav
- Each cell shows that day's net P/L + trade count, color-coded green / red / gray
- Today's cell ringed in emerald
- Pencil icon on any day with a saved note
- Click any day → opens **Daily Management Console Modal**

### Daily Management Console Modal (2 Tabs)

**Tab: Notes**
- Textarea seeded with any existing note for that date
- Saves instantly to `localStorage` keyed by `YYYY-MM-DD`
- Header shows that day's net P/L + W/L breakdown (recomputed live from the day's trades)
- Esc & click-outside dismiss
- "Update Note" / "Save Note" button (disabled when unchanged)
- Inline delete on existing notes

**Tab: Show Details**
- Scrollable list (`max-h-[60vh]`) of all `CompletedTrade` objects for that day
- Each row: Symbol / Shares / Buy → Sell / P/L (color-coded) / Strategy chip
- **Edit (pencil)** — turns the row into inline inputs (Symbol / Shares / Buy / Sell / Strategy); auto-recalcs `profitUSD` via `updateCompletedTrade`
- **Delete (trash)** — confirmation banner: "Are you sure? This will recalculate all historical reports." → `deleteCompletedTrade`
- **Reactive cascade** — calendar cell, monthly banner, equity curve, daily goal tracker, all reports, **Gold Stats**, **Edge Finder** all refresh instantly
- **Esc key behavior** — closes delete confirm first, then exits edit mode, then closes modal

### Log Historical Trade Form
- Backfill completed trades for past dates
- Inputs: Date Picker (max = today) / Symbol / Shares / Avg Buy Price / Avg Sell Price / **Strategy**
- Live "Calculated P/L" preview
- Timestamp anchored at noon local on the chosen day (avoids timezone drift)
- Success notification: "Trade logged successfully for [date] · +$X" with auto-dismiss after 4s

### Other Panels
- **Monthly Summary Banner** — net P/L + total trades + active days for the visible month
- **Lessons Learned timeline** — every day with a saved note, sorted newest first, badged with that day's stats
- **Date-Range Report** — 8 stat cards: Net P/L · Total Trades · Wins (with win-rate %) · Losses · Best Day · Worst Day · Breakeven · Avg / Trade

---

## Architecture

```
src/
├── App.tsx                         # Provider wrapper · listens for backup-restore · purges legacy storage keys
├── main.tsx
├── index.css                       # Tailwind import + equityFadeIn + volatilityPulse keyframes
├── types/index.ts                  # All shared TS interfaces · TRADE_CATALYSTS const · OverlayPoint
├── utils/
│   ├── format.ts                   # USD/percent/color/date helpers
│   └── backup.ts                   # buildBackupPayload · exportBackupToFile · validateBackup · applyBackup · readBackupFile · purgeLegacyStorageKeys
├── services/
│   └── stockService.ts             # Finnhub + Yahoo + mock fallback chain · pre-market parsing (NY tz) · fetchOverlay (SPY)
├── hooks/
│   ├── useTrades.ts                # activeTrades · completedTrades · dailyGoal · addCompletedTrade · updateCompletedTrade · deleteCompletedTrade · closeTrade(catalyst)
│   ├── useJournal.ts               # dailyJournalNotes
│   ├── usePerformanceData.ts       # equity curve points + drawdown summary
│   └── useVolatilityAlert.ts       # 3-min rolling snapshots · 2% threshold · auto-decay
├── context/
│   └── DashboardContext.tsx        # aggregates useTrades + useJournal · Ticker.overlay
└── components/
    ├── ui/Panel.tsx · Field.tsx
    ├── Dashboard.tsx               # Header, sticky tab switcher, layout
    ├── BackupControls.tsx          # Export/Import buttons (header + panel variants)
    ├── TickerGrid.tsx · StockTickerPanel.tsx · PriceChart.tsx
    ├── RiskManagerTab.tsx          # Risk-based sizing form + scenario matrix + active positions + closed table
    ├── JournalReportsTab.tsx       # Calendar + Gold Stats + Edge Finder + Historical form + Range report + Daily modal
    └── EquityCurveChart.tsx        # Equity curve + drawdown stats
```

### Persistence — four `localStorage` slices

| Slice              | Key                                  | Shape |
|--------------------|--------------------------------------|-------|
| `activeTrades`     | `calculatemywin_active_trades`       | `ActiveTrade[]` (with optional `stopLoss`/`riskBudget`) |
| `completedTrades`  | `calculatemywin_completed_trades`    | `CompletedTrade[]` (max 200, with optional `catalyst`) |
| `dailyGoal`        | `calculatemywin_daily_goal`          | `{ min, max }` |
| `dailyJournalNotes`| `calculatemywin_journal_notes`       | `Record<YYYY-MM-DD, DailyJournalNote>` |

**Legacy storage cleanup**: `purgeLegacyStorageKeys()` runs on app boot and after every backup restore, removing obsolete keys like `calculatemywin_simulations` from earlier versions.

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

A legacy raw-JSON shape (without the wrapping `version` / `data` envelope) is also accepted by the validator.

---

## Key Design Decisions

- **Calculations are pure functions** wrapped in `useMemo` — instant updates as you type, no submit buttons
- **The goal-reached state is purely visual** — there are no `disabled` props tied to `goalReached`, and `dailyProfit` is uncapped, so trades after $2,000 keep accumulating
- **Timezones split**: calendar date keys are local-browser TZ; pre-market candle filtering uses `Intl.DateTimeFormat('America/New_York')` so the 04:00–09:30 ET window is correct regardless of user TZ
- **`<DashboardProvider key={reloadKey}>`** — bumping the key on `BACKUP_REFRESH_EVENT` is the simplest correct way to remount every hook so they re-read storage
- **Refs for polling** — the 15 s ticker poll reads from `tickersRef.current` so the interval never restarts on every render
- **Per-key validation** — backup imports check shape per slice; partial / older files still restore what they can
- **Each ticker is independent** — range, quote, chart, source, overlay, and volatility history are per-ticker
- **Single shared Reporting Window** — Tab 3 lifts the date-range filter to the parent so the chart and report stay in sync
- **Risk-first position sizing** — share count is *derived* from explicit risk parameters. The form uses `useEffect` to auto-fill but tracks `sharesManuallyEdited` so user overrides persist.
- **Floor (not round) recommended shares** — ensures realized risk never exceeds the budgeted maximum
- **Scenario matrix is preview-only** — uses muted `slate-300/400` palette to visually distinguish from saturated emerald/red active-trade matrices
- **Catalyst tagging is optional** — `catalyst?` and `stopLoss?` are optional so existing `localStorage` data persists without migration
- **Reactive cascade** — every consumer derives off `completedTrades` with `useMemo`, so a single state update propagates to calendar, chart, goal banner, Gold Stats, Edge Finder, and range report on the next render
- **Confirmation before destructive actions** — deleting a trade prompts "Are you sure? This will recalculate all historical reports."
- **Honest data only** — features that would require paid market-data APIs (RVOL, market-wide scanner) were deliberately *not* built rather than fake numbers a trader might act on

---

## Visual Design

- **Theme**: dark financial / Bloomberg-minimal
- **Background**: `bg-zinc-950` page · `bg-zinc-900/60` panels · `bg-slate-900/40` planning previews · `bg-slate-950/60` chart containers
- **Accents**: `emerald-400/500` for active states + profits · `red-400` for losses · `amber-300/400` for journal markers + volatility alerts · `slate-300/400` for planning/preview UI
- **Profit/loss**: `text-green-400` / `text-red-400`, mediated by `profitColorClass()`
- **Typography**: IBM Plex Sans for UI · JetBrains Mono with `tabular-nums` for every number

---

## Tech Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS v4 via `@tailwindcss/vite`
- Recharts 2.15 — `ComposedChart` (for SPY overlay + reference lines), `AreaChart` (equity curve)
- Lucide React for icons
- Context API + 4 custom hooks (`useTrades`, `useJournal`, `usePerformanceData`, `useVolatilityAlert`)
- `localStorage` only — no backend, no accounts, no hosted database

---

## Documentation

- **README.md** — full project documentation, tab-by-tab feature list, backup/restore guide
- **TESTING.md** — manual testing checklist covering every feature in every tab
- **BUILD_SUMMARY.md** — this file

---

## Status

**COMPLETE** — All three tabs ship full feature sets. Live Dashboard has pre-market reference lines, gap calculator, SPY correlation overlay, and 3-min volatility flash. Risk Manager has risk-based sizing, scenario matrix, and catalyst tagging at close. Journal & Reports has Gold Statistics, Edge Finder, retroactive entry, inline editing/deletion, daily modal with notes + trade drill-down. All data persists, backup/restore is verified, and `npm run build` is clean.
