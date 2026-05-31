# Calculate My Win — Day Trading Dashboard

A **100% client-side** day trading dashboard built around three pillars: a live multi-stock watchlist with pre-market analytics, a risk-based position sizing & tracking console, and a deep performance journal with retroactive entry, edge analytics, and full backup/restore. All state is persisted to `localStorage` and can be exported/imported as a JSON backup file at any time.

> **No backend. No accounts. No API keys required.** Optional Finnhub key improves live quotes; otherwise the app falls back to Yahoo Finance, then deterministic demo data.

---

## Tech Stack

| Layer        | Choice |
|--------------|--------|
| Framework    | React 19 + Vite + TypeScript |
| Styling      | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| Charts       | Recharts (ComposedChart / AreaChart + custom tooltips, ReferenceLines, gradients) |
| Icons        | Lucide React |
| State        | React Context + custom hooks |
| Persistence  | `localStorage` (4 keyed slices) + JSON backup file |
| Fonts        | IBM Plex Sans (UI) · JetBrains Mono (numbers, `tabular-nums`) |

---

## App Structure — 3 Tabs

The dashboard is organized into three tabs, switched from the sticky header:

### 1. Live Dashboard — Watchlist & Market Monitor
A clean, spacious live market watchlist with advanced pre-market analytics, market correlation, and volatility alerts.

#### Core Watchlist
- **Multi-ticker watchlist** — add/remove any number of tickers, each with independent state
- **Live data polling** — every loaded ticker refreshes every 15 s
- **7 time ranges per ticker** — `10m / 1h / 3h / 1d / 1w / 1mo / 1y`
- **Smart fallback chain** — Finnhub → Yahoo Finance → deterministic mock data (badge color tells you which is in use)
- **Real-time area charts** — color-coded green/red trends, smooth `monotone` curves
- **OHLC stats** — Open / High / Low / Previous Close per ticker
- **Search & load** — type any symbol and press Load to fetch live data

#### Advanced Pre-Market & Market Analytics
- **Pre-Market High/Low reference lines** — Yahoo's `&includePrePost=true` data is filtered to the 04:00–09:30 ET window using `Intl.DateTimeFormat` with `America/New_York` timezone. The high/low are rendered as dashed reference lines on the chart (emerald `PM High` / red `PM Low`) with inline price labels.
- **Gap calculator** — `(open − previousClose) / previousClose × 100` displayed as a color-coded pill: `Gap +4.2% (+$2.10)`
- **Pre-Market range pill** — compact `Pre-Mkt: H $182.40 · L $179.80` indicator next to the Gap pill
- **SPY market correlation overlay** — secondary low-opacity dashed gray line on the chart, normalized as %-change vs. the start of the same time window. Visualizes whether the active stock is outperforming or underperforming the broad market in real-time. Skipped automatically when the active ticker is SPY itself.
- **Right-side %-axis** — when the SPY overlay is active, a secondary right axis labels the overlay in percentage terms.

#### Volatility Alert System
- **`useVolatilityAlert` hook** — keeps a rolling buffer of `(timestamp, price)` snapshots per ticker
- **Threshold detection** — on each polling cycle, compares the latest price to the oldest snapshot inside a 3-minute window
- **Visual alert** — when |∆%| ≥ 2%, the chart container gets an animated `volatilityPulse` ring + a corner badge: `⚠️ HIGH VOLATILITY · +2.4% in 142s`
- **Auto-decay** — the flash automatically clears after 8 s, ready to re-trigger on the next spike
- **Per-ticker isolation** — each ticker maintains its own snapshot history, reset on symbol change

### 2. Daily Goal & Risk Manager
Goal-tracking, risk-based position sizing, active trade management, and per-trade profit/loss matrices.

#### Daily Realized Profit Card
- Live sum of every closed trade for the current calendar day
- Configurable `min`/`max` daily goal
- **Goal-reached celebration banner** — high-visibility milestone when `dailyProfit ≥ goal.min`. Explicitly **non-blocking** — every input, button, and table stays fully operational past the goal. Live chips show `+$X over goal` and `well above max` when applicable.
- **Down-day advisory** — gentle red banner if you're net negative for the day

#### Corporate Risk Assessment Scanner (NEW — Fundamental Pre-Trade Guard)
Before you enter a position, the "+ Add Position" form now automatically scans for **toxic capital structures** and catalyst hazards:

- **Debounced real-time scanning** — as you type a symbol, a 600ms-debounced scan fires against Finnhub endpoints:
  - **Vector A — Share Dilution / Toxic Financing** (60-day lookback): company news scanned for keywords `Offering`, `S-3`, `F-3`, `Prospectus`, `ATM`, `Convertible Note`, `Private Placement`, `PIPE`, `Warrant`. Distinguishes institutional deals (hedge-fund convertibles) from public offerings. **+4 pts** when ≤14d, **+2 pts** when older.
  - **Vector B — Reverse Split Risk** (−30d / +7d): splits calendar + headline fallback for scheduled or recently executed reverse splits. Parses `1-for-N` ratios, flags NASDAQ listing-compliance triggers. **+5 pts**.
  - **Vector C — Earnings Proximity** (+120d forward, −14d back): **+3 pts** if earnings within 3 trading days (with BMO/AMC session label). Informational flag for recently-reported earnings (≤14d) with EPS beat/miss surprise.
- **Dynamic Risk Score (1–10 scale)** with color-coded severity:
  - **1–2 (Low)** — clean emerald badge, `ShieldCheck` icon
  - **3 (Medium)** — amber warning badge, `AlertTriangle` icon
  - **4–6 (High)** — orange `Siren` icon, elevated sell-pressure warning
  - **7–10 (Toxic)** — flashing red border pulse (`animate-toxic-pulse`), `⚠️ TOXIC CAPITAL STRUCTURE DETECTED` badge, explicit summary: *"Heavy sell pressure expected. This is a dangerous vehicle for swing exposure."*
- **Per-flag detail rows** — each active flag shows:
  - Title (e.g., `Active Dilution / Toxic Financing`)
  - Detail string with source/date context (e.g., *"Institutional deal (likely PIPE) · 'XYZ files $50M offering' (Reuters, 5d ago)"*)
  - Score delta (`+4 pts`), days-ago/days-until metadata, external source link when available
- **Fault-tolerant by design** — uses `Promise.allSettled` so partial API failures still surface whatever data succeeded. Panel shows `partial scan` badge + errors array when applicable. Without a Finnhub key, renders a non-blocking offline notice; form submission remains fully available.
- **Purely advisory** — the scanner **never blocks** order entry. Explicit footer: *"Advisory only — execution remains in your control. Flags do not block order entry."*
- **Visual treatment** — loading skeleton with spinner during scan, gradient risk meter bar, flashing red pulse animation for toxic-tier scores

#### Risk-Based Position Sizing
The "+ Add Position" form is upgraded into a complete risk-management console:

- **Form fields:** Symbol · Buy Price (Entry) · Stop-Loss Price · Max Account Risk · Shares
- **Automated share calculation:** `recommendedShares = floor(maxRisk / (buyPrice − stopLoss))`. Auto-fills the Shares field reactively as you type — never overwrites if you've manually edited it.
- **Validation:** if `stopLoss ≥ buyPrice` (invalid for a long), inline red helper triggers: *"Stop-loss must be below buy price"* and the calculation is suppressed.
- **Sizing card (right-rail)** displays:
  - **Recommended Shares** — big bold integer
  - **Total Capital Required** — `shares × buyPrice`
  - **If stop hits** — actual realized loss based on current shares
  - **Under budget by** — leftover from rounding shares down (always ≤ maxRisk because we floor)
  - **Risk per share** — `buyPrice − stopLoss`
- **Stop-Loss Scenario Matrix** — a planning preview that activates the moment Symbol + Buy Price are entered. Renders 4 tiers (5/10/15/20% drops) with each row showing:
  - Scenario stop price · Risk per share · Shares for this tier · Capital required
  - **`[Use this]` quick-set button** writes the tier's stop price into the form's Stop-Loss field instantly, re-arms share auto-fill so the recommendation updates
  - Active tier highlighting — when current stop matches a tier (within ±$0.005), the row turns emerald and the button reads `Armed`
- **Reset to recommended** — one-click revert if you've manually overridden Shares
- **Persistence** — `stopLoss` and `riskBudget` are stored on the `ActiveTrade` so the planned risk follows the trade through to close

#### Active Position Cards
For each open trade:
- **Header** shows symbol badge, shares, buy price, total cost, and (if set) the planned stop-loss with implied dollar risk
- **Profit Targets matrix (green-tinted)** — for tiers 5/10/15/20%, displays target price, total exit value, and net profit
- **Stop-Loss Thresholds matrix (red-tinted)** — same tiers downside, showing stop price, total remaining value, and net loss
- **Report Sale** — opens a confirm form with a live P/L preview AND a Trade Strategy / Catalyst dropdown for performance attribution
- **Discard** — removes a position without recording a sale

#### Today's Closed Trades Table
Symbol / shares / buy / sell / profit / time, with a one-click "Clear all".

### 3. Journal & Reports
Long-term performance review, edge analytics, retroactive trade entry, inline trade editing, and full reporting.

#### Backup & Restore Panel
(Also surfaced in the global header)
- **Export Backup** — downloads `trading_dashboard_backup_YYYY-MM-DD.json` containing every `localStorage` slice wrapped with version + timestamp
- **Import Backup** — file picker; validates structural keys, alerts on invalid files, asks for confirmation before overwrite, then dispatches an event that **remounts the entire DashboardProvider** so every screen reflects the restored state with zero manual page reload
- **Legacy storage cleanup** — `purgeLegacyStorageKeys()` fires on boot and after every restore to prune obsolete keys

#### Reporting Window Filter
Single source of truth for the chart and the report below: `Today / This Week / This Month / This Quarter / Custom (start–end date pickers)`

#### Equity Curve Chart
- Smooth `monotone` cumulative-P/L curve with linear gradient fill
- Dynamic stroke (emerald on net positive, red on net negative)
- Custom dark tooltip showing **Date · Cumulative · Growth % · Day P/L · Trades**
- 4-card summary: **Peak Equity · Max Drawdown · Max Daily Win · Max Daily Loss** (each labeled with the date it occurred)

#### Gold Statistics Panel (New)
Edge metrics computed across **every** completed trade:
- **Win Rate** — `wins / total × 100`. Color-tiered (≥50% emerald, ≥33% amber, <33% red).
- **Profit Factor** — `grossProfit / grossLoss`. Renders `N/A` when no losses, `∞` when only wins, otherwise to 2 decimals. Tier-colored at 1.5 / 1.0 thresholds.
- **Avg Win** — emerald, with `X.XX× avg loss` win-loss ratio sub-line
- **Avg Loss** — red, with `Expectancy ±$X.XX / trade` sub-line (signed average per trade)

#### Edge Finder Panel (New)
Strategy attribution & insight callouts:
- **Trade Strategy / Catalyst tagging** — every closing trade can be tagged with one of: `Pre-market Gainer`, `Earnings Report`, `Support Bounce`, `FOMO / Emotional`, or `Other`
- **🟢 "Your Edge" callout** — surfaces the catalyst with the highest net positive P/L
- **🔴 "Risk Warning" callout** — surfaces the catalyst with the most negative net P/L (only when actually negative)
- **Strategy breakdown table** — sorted by Net P/L, showing Trades / Win Rate / W/L / Net P/L for each catalyst

#### Performance Calendar (Monthly)
- `grid-cols-7` layout for the visible month
- Each day shows that day's net P/L color-coded green/red/gray
- Today is ringed in emerald
- A pencil icon appears on any day with a saved note
- Click any day to open the **Daily Management Console Modal**

#### Daily Management Console Modal
2-tab modal for complete day-level trade management:
- **Tab: Notes** — textarea for daily reflections, saves instantly to `localStorage`. Esc and click-outside dismiss.
- **Tab: Show Details** — drill-down list of all `CompletedTrade` objects executed that day
  - Each row shows: Symbol / Shares / Buy → Sell / P/L (color-coded) / Strategy chip
  - **Edit (pencil icon)** — turns the row into inline inputs (Symbol/Shares/Buy/Sell/Strategy); auto-recalcs `profitUSD`
  - **Delete (trash icon)** — confirmation banner, then removes from `completedTrades`
  - **Reactive cascade** — every edit/delete instantly updates the calendar cell, monthly summary banner, equity curve, daily goal tracker, all reports, and Gold Stats / Edge Finder

#### Log Historical Trade Form
- Backfill completed buys/sells for past dates
- Inputs: Date Picker (capped at today) / Symbol / Shares / Avg Buy Price / Avg Sell Price / **Strategy**
- Live "Calculated P/L" preview
- Timestamp anchored at noon local on the chosen day
- Success notification with auto-dismiss

#### Other Panels
- **Monthly Summary Banner** — net P/L + total trades + active days for the visible month
- **Lessons Learned timeline** — every day with a note, sorted newest first, badged with that day's net P/L and trade count
- **Date-Range Report** — 8 stat cards driven by the same Reporting Window: Net P/L · Total Trades · Wins (with win-rate %) · Losses · Best Day · Worst Day · Breakeven · Avg / Trade

---

## Data Model & Persistence

All app state lives in `localStorage` under four keyed slices:

| Field              | localStorage key                       | Shape |
|--------------------|----------------------------------------|-------|
| `activeTrades`     | `calculatemywin_active_trades`         | `ActiveTrade[]` (with optional `stopLoss`/`riskBudget`) |
| `completedTrades`  | `calculatemywin_completed_trades`      | `CompletedTrade[]` (max 200, with optional `catalyst`) |
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

---

## Project Layout

```
src/
├── App.tsx                         # Provider wrapper · listens for backup-restore · purges legacy keys
├── main.tsx
├── index.css                       # Tailwind import + chart fade-in + volatility-pulse + toxic-pulse keyframes
├── types/index.ts                  # All shared TS interfaces · TRADE_CATALYSTS const
├── utils/
│   ├── format.ts                   # USD / percent / color / date helpers
│   └── backup.ts                   # Export / validate / apply / read-file · purgeLegacyStorageKeys
├── services/
│   ├── stockService.ts             # Finnhub + Yahoo + mock fallback · pre-market parsing · SPY overlay
│   └── riskScannerService.ts       # Corporate risk scanner · dilution/reverse-split/earnings vectors · score calc
├── hooks/
│   ├── useTrades.ts                # Active + completed + daily goal + add/update/delete with catalyst
│   ├── useJournal.ts               # Daily journal notes
│   ├── usePerformanceData.ts       # Equity curve + drawdown summary
│   └── useVolatilityAlert.ts       # 3-min rolling price snapshots · 2% threshold detection
├── context/
│   └── DashboardContext.tsx        # Aggregated provider
└── components/
    ├── ui/Panel.tsx · Field.tsx
    ├── Dashboard.tsx               # Header, tab switcher, layout
    ├── BackupControls.tsx          # Export + Import buttons
    ├── TickerGrid.tsx              # Multi-ticker grid
    ├── StockTickerPanel.tsx        # Per-ticker quote + Gap/Pre-Mkt pills + chart + volatility flash
    ├── PriceChart.tsx              # ComposedChart · pre-market reference lines · SPY overlay
    ├── RiskManagerTab.tsx          # Corporate risk scanner + risk-based sizing + scenario matrix + active positions + closed table
    ├── JournalReportsTab.tsx       # Calendar + Gold Stats + Edge Finder + historical form + range report
    └── EquityCurveChart.tsx        # Equity curve + drawdown stats
```

---

## Getting Started

### Install

```bash
npm install
```

### Optional: Finnhub API key

For higher-quality live quotes **and to enable the Corporate Risk Scanner**, copy the env template:

```bash
cp .env.example .env
```

then add your free key from [finnhub.io](https://finnhub.io/):

```
VITE_FINNHUB_API_KEY=your_key_here
```

The app **works perfectly without it** — Yahoo Finance is the next fallback for quotes/charts, and the risk scanner displays a non-blocking "offline" notice. Demo data is the final fallback for price charts.

### Run

```bash
npm run dev      # http://localhost:3040 (or next free port)
npm run build    # production bundle in dist/
npm run preview  # preview the production bundle
```

---

## Data Source Fallback Chain

| Scenario                          | Quote     | Chart     | Pre-Market | SPY Overlay | Badge                  |
|-----------------------------------|-----------|-----------|------------|-------------|------------------------|
| Both Finnhub + Yahoo succeed      | Finnhub   | Yahoo     | Yahoo      | Yahoo       | `Live · finnhub`       |
| Only Finnhub succeeds             | Finnhub   | Mock      | —          | —           | `Live · finnhub`       |
| Only Yahoo succeeds               | Yahoo     | Yahoo     | Yahoo      | Yahoo       | `Live · yahoo`         |
| Both fail                         | Mock      | Mock      | —          | —           | `Demo` (amber)         |

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
- **Timezones are local for journals, Eastern for pre-market** — calendar date keys (`YYYY-MM-DD`) are local; pre-market candle filtering uses `Intl.DateTimeFormat('America/New_York')` so the 04:00–09:30 ET window is detected correctly regardless of user TZ
- **The Provider has a `key` that bumps on backup-restore** — forces a clean remount, the simplest correct way to make every hook re-read storage
- **Refs over re-renders for polling** — the 15 s ticker poll uses a `tickersRef` so the interval never restarts on every state change
- **Each ticker is independent** — range, quote, chart, source, overlay, and volatility history are per-ticker
- **Risk-first position sizing** — share count is *derived* from explicit risk parameters, not the other way around. The form auto-fills via `useEffect` but tracks `sharesManuallyEdited` so user overrides persist.
- **Floor (not round) recommended shares** — ensures realized risk never exceeds the budgeted maximum
- **Scenario matrix is preview-only** — uses a muted slate palette to visually distinguish from active-trade matrices, which use saturated emerald/red
- **Catalyst tagging is optional** — `catalyst?` lets older trades persist without migration; Edge Finder gracefully handles untagged trades as a separate bucket
- **Reactive cascade** — every consumer (calendar, chart, goal banner, Gold Stats, Edge Finder, range report) derives off `completedTrades` with `useMemo`, so a single state update propagates everywhere on the next render
- **Confirmation before destructive actions** — deleting a trade prompts "Are you sure? This will recalculate all historical reports."
- **Honest data only** — features that would require paid market-data APIs (RVOL, scanner endpoints) were deliberately *not* built rather than mock fake numbers a trader might act on
- **Corporate risk scanner degrades gracefully** — uses `Promise.allSettled` so one failed endpoint doesn't block the others. Without an API key, shows an offline notice but never blocks form submission. The scanner is purely advisory; it surfaces hazards but execution stays in the user's control.

---

## License

MIT

---

**Not financial advice.** This tool is for educational and informational purposes only.
