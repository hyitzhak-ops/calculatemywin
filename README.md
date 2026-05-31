# Calculate My Win — Day Trading Dashboard

A **100% client-side** day trading dashboard that combines a live multi-stock watchlist, an active-position risk manager with profit/stop-loss matrices, and a full performance journal with calendar, equity curve, retroactive trade entry, and inline trade editing. All state is persisted to `localStorage` and can be exported/imported as a JSON backup file at any time.

> **No backend. No accounts. No API keys required.** Optional Finnhub key improves live quotes; otherwise the app falls back to Yahoo Finance, then deterministic demo data.

---

## Tech Stack

| Layer        | Choice |
|--------------|--------|
| Framework    | React 19 + Vite + TypeScript |
| Styling      | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Charts       | Recharts (Area + custom tooltips) |
| Icons        | Lucide React |
| State        | React Context + custom hooks |
| Persistence  | `localStorage` (4 keyed slices) + JSON backup file |
| Fonts        | IBM Plex Sans (UI) · JetBrains Mono (numbers, `tabular-nums`) |

---

## App Structure — 3 Tabs

The dashboard is organized into three tabs, switched from the sticky header:

### 1. Live Dashboard — Watchlist & Market Monitor
A clean, spacious live market watchlist.

- **Multi-ticker watchlist** — add/remove any number of tickers, each with independent state
- **Live data polling** — every loaded ticker refreshes every 15 s
- **7 time ranges per ticker** — `10m / 1h / 3h / 1d / 1w / 1mo / 1y`
- **Smart fallback chain** — Finnhub → Yahoo Finance → deterministic mock data (badge color tells you which is in use)
- **Real-time area charts** — color-coded green/red trends, smooth `monotone` curves
- **OHLC stats** — Open / High / Low / Previous Close per ticker
- **Search & load** — type any symbol and press Load to fetch live data

### 2. Daily Goal & Risk Manager
Goal-tracking, active position management, and per-trade profit/loss matrices.

- **Daily Realized Profit card** — live sum of all closed trades for the current calendar day, with a configurable `min`/`max` goal
- **Goal-reached celebration banner** — high-visibility milestone when `dailyProfit ≥ goal.min`. Explicitly **non-blocking** — every input, button, and table stays fully operational past the goal. Live chips show `+$X over goal` and `well above max` when applicable.
- **Down-day advisory** — gentle red banner if you're net negative for the day
- **Add Trade form** — symbol / shares / buy price; instantly persisted
- **Active Position cards** — for each open trade:
  - **Profit Targets matrix (green)** — for tiers 5 % / 10 % / 15 % / 20 %, shows target price, total exit value, and net profit
  - **Stop-Loss Thresholds matrix (red)** — same tiers downside, showing stop price, remaining value, and net loss
  - **Report Sale** — opens a confirm form with a live P/L preview, then commits the close
  - **Discard** — removes a position without recording a sale
- **Today's Closed Trades table** — symbol / shares / buy / sell / profit / time, with a one-click "Clear all"

### 3. Journal & Reports
Long-term performance review, lessons-learned timeline, calendar journal, retroactive trade entry, inline trade editing/deletion, and full reporting.

- **Backup & Restore panel** (also surfaced in the global header)
  - **Export Backup** — downloads `trading_dashboard_backup_YYYY-MM-DD.json` containing every `localStorage` slice (active trades, completed trades, daily goal, journal notes) wrapped with version + timestamp
  - **Import Backup** — file picker; validates structural keys, alerts on invalid files, asks for confirmation before overwrite, then dispatches an event that **remounts the entire DashboardProvider** so every screen reflects the restored state with zero manual page reload
- **Reporting Window filter** — single source of truth for the chart and the report below: `Today / This Week / This Month / This Quarter / Custom (start–end date pickers)`
- **Equity Curve chart** — premium Recharts AreaChart:
  - Smooth `monotone` cumulative-P/L curve
  - Linear gradient fill under the line, dynamic stroke (emerald on net positive, red on net negative)
  - Custom dark tooltip showing **Date · Cumulative · Growth % · Day P/L · Trades**
  - 4-card summary: **Peak Equity · Max Drawdown · Max Daily Win · Max Daily Loss** (each labeled with the date it occurred)
- **Performance Calendar (monthly)** — `grid-cols-7` layout for the visible month
  - Each day shows that day's net P/L color-coded green/red/gray
  - Today is ringed in emerald
  - A pencil icon appears on any day with a saved note
  - Click any day to open the **Daily Management Console Modal**
- **Daily Management Console Modal** — 2-tab modal for any calendar day:
  - **Tab: Notes** — textarea for daily reflections ("what went well", "why did I lose"), saves instantly to `localStorage`. Esc and click-outside dismiss.
  - **Tab: Show Details** — complete drill-down of all trades logged on that specific day:
    - Displays: Symbol / Shares / Buy → Sell / P/L (color-coded)
    - **Edit (pencil icon)** — turns the row into inline inputs; modify symbol/shares/buy/sell, recalculates `profitUSD` automatically, saves
    - **Delete (trash icon)** — shows confirmation ("Are you sure? This will recalculate all historical reports."), then removes the trade from `completedTrades`
    - **Reactive cascade** — editing or deleting a trade instantly updates the calendar cell color/total, the monthly summary banner, the equity curve, the daily goal tracker (if the trade belongs to today), and all range reports
- **Log Historical Trade form** — backfill completed buys/sells for past dates:
  - Inputs: Date Picker (capped at today) / Symbol / Shares / Avg Buy Price / Avg Sell Price
  - Live "Calculated P/L" preview
  - On submit, the trade is inserted into `completedTrades` with a timestamp anchored at noon local on the chosen day
  - Immediately reflects in the Performance Calendar, Monthly Balance Summary, and Equity Curve
  - Success notification with auto-dismiss
- **Monthly Summary Banner** — net P/L + total trades + active days for the visible month
- **Lessons Learned timeline** — every day with a note, sorted newest first, badged with that day's net P/L and trade count, inline delete
- **Date-Range Report** — 8 stat cards driven by the same Reporting Window: Net P/L · Total Trades · Wins (with win-rate %) · Losses · Best Day · Worst Day · Breakeven · Avg / Trade

---

## Data Model & Persistence

All app state lives in `localStorage` under four keyed slices:

| Field              | localStorage key                       | Shape |
|--------------------|----------------------------------------|-------|
| `activeTrades`     | `calculatemywin_active_trades`         | `ActiveTrade[]` |
| `completedTrades`  | `calculatemywin_completed_trades`      | `CompletedTrade[]` (max 200) |
| `dailyGoal`        | `calculatemywin_daily_goal`            | `{ min, max }` |
| `dailyJournalNotes`| `calculatemywin_journal_notes`         | `Record<YYYY-MM-DD, DailyJournalNote>` |

The backup file is a single JSON document:

```json
{
  "version": 1,
  "exportedAt": "2026-05-31T18:42:11.000Z",
  "app": "calculate-my-win",
  "data": {
    "activeTrades":      [ ... ],
    "completedTrades":   [ ... ],
    "dailyGoal":         { "min": 1000, "max": 2000 },
    "dailyJournalNotes": { "2026-05-30": { ... } }
  }
}
```

A legacy raw-JSON shape (without the `version`/`data` envelope) is also accepted on import for backwards compatibility.

### Legacy Storage Cleanup

The app automatically purges obsolete `localStorage` keys (e.g., `calculatemywin_simulations` from earlier versions) on boot and after every backup restore.

---

## Project Layout

```
src/
├── App.tsx                         # Provider wrapper · listens for backup-restore event · purges legacy keys
├── main.tsx
├── index.css                       # Tailwind import + chart fade-in keyframe
├── types/index.ts                  # All shared TypeScript interfaces
├── utils/
│   ├── format.ts                   # USD / percent / color / date helpers
│   └── backup.ts                   # Export / validate / apply / read-file · purgeLegacyStorageKeys
├── services/
│   └── stockService.ts             # Finnhub + Yahoo + mock fallback chain
├── hooks/
│   ├── useTrades.ts                # Active + completed + daily goal · addCompletedTrade / updateCompletedTrade / deleteCompletedTrade
│   ├── useJournal.ts               # Daily journal notes
│   └── usePerformanceData.ts       # Equity curve + drawdown summary
├── context/
│   └── DashboardContext.tsx        # Aggregated provider
└── components/
    ├── ui/
    │   ├── Panel.tsx
    │   └── Field.tsx
    ├── Dashboard.tsx               # Header, tab switcher, layout
    ├── BackupControls.tsx          # Export + Import buttons (header + panel variants)
    ├── TickerGrid.tsx
    ├── StockTickerPanel.tsx
    ├── PriceChart.tsx
    ├── RiskManagerTab.tsx          # Tab 2 — daily goal + active positions + closed table
    ├── JournalReportsTab.tsx       # Tab 3 — calendar + notes + historical trade form + range report
    └── EquityCurveChart.tsx        # Tab 3 — equity curve + drawdown stats
```

---

## Getting Started

### Install

```bash
npm install
```

### Optional: Finnhub API key

For higher-quality live quotes, copy the env template:

```bash
cp .env.example .env
```

then add your free key from [finnhub.io](https://finnhub.io/):

```
VITE_FINNHUB_API_KEY=your_key_here
```

The app **works perfectly without it** — Yahoo Finance is the next fallback, then deterministic demo data.

### Run

```bash
npm run dev      # http://localhost:3040 (or next free port)
npm run build    # production bundle in dist/
npm run preview  # preview the production bundle
```

---

## Data Source Fallback Chain

| Scenario                          | Quote     | Chart     | Badge                  |
|-----------------------------------|-----------|-----------|------------------------|
| Both Finnhub + Yahoo succeed      | Finnhub   | Yahoo     | `Live · finnhub`       |
| Only Finnhub succeeds             | Finnhub   | Mock      | `Live · finnhub`       |
| Only Yahoo succeeds               | Yahoo     | Yahoo     | `Live · yahoo`         |
| Both fail                         | Mock      | Mock      | `Demo` (amber)         |

---

## Backup & Disaster Recovery

If your enterprise IT wipes browser storage, your phone runs out of space, or you switch devices, you can fully recover:

1. Open Tab 3 → **Backup & Restore** panel (or use the buttons in the header)
2. Click **Export Backup** — a date-stamped JSON file is downloaded
3. On the new device or after a wipe: click **Import Backup**, select the file, confirm the overwrite
4. The app remounts in place — calendar, charts, banners, and tables repopulate without a manual refresh

The validator only writes sections whose shape it recognizes, so a partial or older backup still restores everything it can.

---

## Notable Design Choices

- **Calculations are pure** — `useMemo` makes everything update as you type
- **Goals are visual milestones, not locks** — the goal-reached banner is purely cosmetic; you can keep trading and the live total continues to grow
- **Timezones are local** — all date keys (`YYYY-MM-DD`) are derived from local-browser time so calendar cells line up with the user's day
- **The Provider has a `key` that bumps on backup-restore** — forces a clean remount, the simplest correct way to make every hook re-read storage
- **Refs over re-renders for polling** — the 15 s ticker poll uses a `tickersRef` so the interval never restarts on every state change
- **Each ticker is independent** — range, quote, chart, and source are per-ticker, never shared
- **Retroactive trade entry** — the historical trade form anchors timestamps at noon local on the chosen day to avoid timezone drift
- **Inline trade editing** — updating a trade recalculates `profitUSD = (sell − buy) × shares` automatically and cascades to every consumer (calendar, chart, goal banner, reports)
- **Confirmation before destructive actions** — deleting a trade prompts "Are you sure? This will recalculate all historical reports."

---

## License

MIT

---

**Not financial advice.** This tool is for educational and informational purposes only.
